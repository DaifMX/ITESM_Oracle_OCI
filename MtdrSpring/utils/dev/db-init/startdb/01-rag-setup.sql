-- Auto-run on every container start by gvenzl/oracle-free.
--
-- Idempotent end-to-end: creates RAG_CHUNK / RAG_DIRTY / the vector index
-- if they don't already exist, points VEC_DUMP_DIR at the in-container
-- ONNX mount, and loads ALL_MINILM_L12_V2 the first time it's missing.
--
-- gvenzl runs *.sql files in /container-entrypoint-startdb.d/ as SYSTEM
-- connected to FREEPDB1.

WHENEVER SQLERROR EXIT 1
SET SERVEROUTPUT ON

-- ---------------------------------------------------------------------------
-- Pin the session to FREEPDB1. gvenzl normally runs startdb scripts from
-- CDB$ROOT as SYSDBA, which is where most of the surrounding pain came
-- from: CREATE USER fans out via the common-DDL wrapper, GRANT TO a local
-- PDB user fails with ORA-01917, etc. Forcing CONTAINER = FREEPDB1 makes
-- everything below behave like a normal in-PDB session.
-- Wrapped so re-runs inside a PDB session (where the ALTER is illegal)
-- don't blow up.
-- ---------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'ALTER SESSION SET CONTAINER = FREEPDB1';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- ---------------------------------------------------------------------------
-- 0. Make sure TODOUSER exists (self-heal in case the data volume is in a
--    weird state where gvenzl didn't create APP_USER). The CREATE swallows
--    every error -- the only thing we care about is that TODOUSER exists
--    when we GRANT to it below; we tolerate "already exists", "user
--    create in CDB$ROOT", "ORA-65048 wrapper", anything. Password "ADMIN"
--    matches APP_USER_PASSWORD in compose.dev.yml.
-- ---------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'CREATE USER TODOUSER IDENTIFIED BY "ADMIN"';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER USER TODOUSER QUOTA UNLIMITED ON USERS';
EXCEPTION WHEN OTHERS THEN NULL;  -- tablespace name may differ; ignore
END;
/
BEGIN
  EXECUTE IMMEDIATE 'GRANT CREATE SESSION, CREATE VIEW, CREATE SEQUENCE, CREATE PROCEDURE TO TODOUSER';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1919, -1031) THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'GRANT CREATE TABLE, CREATE TRIGGER, CREATE TYPE, CREATE MATERIALIZED VIEW TO TODOUSER';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1919, -1031) THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'GRANT CONNECT, RESOURCE, SODA_APP TO TODOUSER';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1919, -1031) THEN RAISE; END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 1. Grants TODOUSER needs (idempotent -- ignore "already granted").
-- ---------------------------------------------------------------------------
BEGIN
  EXECUTE IMMEDIATE 'GRANT CREATE MINING MODEL TO TODOUSER';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1919, -1031) THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'GRANT EXECUTE ON DBMS_VECTOR TO TODOUSER';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1927, -1031) THEN RAISE; END IF;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'GRANT DB_DEVELOPER_ROLE TO TODOUSER';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE NOT IN (-1919, -1031) THEN RAISE; END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 2. RAG_CHUNK -- embedded text + 384-dim vector.
-- ---------------------------------------------------------------------------
DECLARE
  n NUMBER;
BEGIN
  SELECT COUNT(*) INTO n FROM all_tables
   WHERE owner = 'TODOUSER' AND table_name = 'RAG_CHUNK';
  IF n = 0 THEN
    EXECUTE IMMEDIATE '
      CREATE TABLE TODOUSER.RAG_CHUNK (
        CHUNK_ID          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        SOURCE_TYPE       VARCHAR2(16) NOT NULL,
        SOURCE_ID         NUMBER       NOT NULL,
        OWNER_EMPLOYEE_ID NUMBER,
        PROJECT_ID        NUMBER,
        SPRINT_ID         NUMBER,
        CONTENT           CLOB         NOT NULL,
        EMBEDDING         VECTOR(384, FLOAT32) NOT NULL,
        CONTENT_HASH      VARCHAR2(64) NOT NULL,
        UPDATED_AT        TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT RAG_CHUNK_SRC_UQ UNIQUE (SOURCE_TYPE, SOURCE_ID)
      )';
    EXECUTE IMMEDIATE
      'CREATE INDEX TODOUSER.RAG_CHUNK_OWNER_IDX
         ON TODOUSER.RAG_CHUNK (OWNER_EMPLOYEE_ID)';
    EXECUTE IMMEDIATE
      'CREATE INDEX TODOUSER.RAG_CHUNK_PROJ_IDX
         ON TODOUSER.RAG_CHUNK (PROJECT_ID)';
  END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 3. Vector index (IVF on disk, ORGANIZATION NEIGHBOR PARTITIONS).
--
--    HNSW (ORGANIZATION INMEMORY NEIGHBOR GRAPH) needs space in the
--    vector_memory_area init parameter, which 23ai Free ships with at 0.
--    Bumping it requires ALTER SYSTEM + a DB restart -- not worth the
--    complexity in compose. IVF is on-disk, runs anywhere, and serves the
--    exact same FETCH APPROX FIRST k ROWS ONLY query path the retriever
--    uses, so the rest of the app doesn't care which one's installed.
-- ---------------------------------------------------------------------------
DECLARE
  n NUMBER;
BEGIN
  SELECT COUNT(*) INTO n FROM all_indexes
   WHERE owner = 'TODOUSER' AND index_name = 'RAG_CHUNK_EMB_IDX';
  IF n = 0 THEN
    EXECUTE IMMEDIATE '
      CREATE VECTOR INDEX TODOUSER.RAG_CHUNK_EMB_IDX
        ON TODOUSER.RAG_CHUNK (EMBEDDING)
        ORGANIZATION NEIGHBOR PARTITIONS
        DISTANCE COSINE
        WITH TARGET ACCURACY 90';
  END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 4. RAG_DIRTY queue.
-- ---------------------------------------------------------------------------
DECLARE
  n NUMBER;
BEGIN
  SELECT COUNT(*) INTO n FROM all_tables
   WHERE owner = 'TODOUSER' AND table_name = 'RAG_DIRTY';
  IF n = 0 THEN
    EXECUTE IMMEDIATE '
      CREATE TABLE TODOUSER.RAG_DIRTY (
        DIRTY_ID    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        SOURCE_TYPE VARCHAR2(16) NOT NULL,
        SOURCE_ID   NUMBER       NOT NULL,
        ACTION      VARCHAR2(8)  NOT NULL,
        ENQUEUED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        ATTEMPTS    NUMBER DEFAULT 0 NOT NULL,
        LAST_ERROR  VARCHAR2(2000)
      )';
    EXECUTE IMMEDIATE
      'CREATE INDEX TODOUSER.RAG_DIRTY_PICK_IDX
         ON TODOUSER.RAG_DIRTY (ENQUEUED_AT, DIRTY_ID)';
  END IF;
END;
/

-- ---------------------------------------------------------------------------
-- 5. DIRECTORY object pointing at the in-container ONNX mount.
--    CREATE OR REPLACE is naturally idempotent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE DIRECTORY VEC_DUMP_DIR AS '/opt/oracle/embeddings';
GRANT READ ON DIRECTORY VEC_DUMP_DIR TO TODOUSER;

-- ---------------------------------------------------------------------------
-- 6. Load the ALL_MINILM_L12_V2 ONNX model if not present.
--    The onnx-fetcher sidecar has already populated /opt/oracle/embeddings/
--    in a docker-compose-managed volume by the time we get here.
-- ---------------------------------------------------------------------------
DECLARE
  n NUMBER;
BEGIN
  SELECT COUNT(*) INTO n FROM all_mining_models
   WHERE owner = 'TODOUSER' AND model_name = 'ALL_MINILM_L12_V2';
  IF n = 0 THEN
    -- Schema-qualify so the model is owned by TODOUSER. Without this it
    -- would be created under SYSTEM and the app (connected as TODOUSER)
    -- would get ORA-40284 because VECTOR_EMBEDDING resolves unqualified
    -- model names in the caller's schema.
    DBMS_VECTOR.LOAD_ONNX_MODEL(
      directory  => 'VEC_DUMP_DIR',
      file_name  => 'all_MiniLM_L12_v2.onnx',
      model_name => 'TODOUSER.ALL_MINILM_L12_V2',
      metadata   => JSON('{
        "function": "embedding",
        "embeddingOutput": "embedding",
        "input": { "input": ["DATA"] }
      }')
    );
    DBMS_OUTPUT.PUT_LINE('Loaded TODOUSER.ALL_MINILM_L12_V2.');
  ELSE
    DBMS_OUTPUT.PUT_LINE('ALL_MINILM_L12_V2 already loaded -- skipping.');
  END IF;
END;
/

-- Clean up any stale SYSTEM-owned copy left behind by an earlier run that
-- predates this fix. Harmless on fresh DBs.
DECLARE
  n NUMBER;
BEGIN
  SELECT COUNT(*) INTO n FROM all_mining_models
   WHERE owner = 'SYSTEM' AND model_name = 'ALL_MINILM_L12_V2';
  IF n > 0 THEN
    EXECUTE IMMEDIATE 'BEGIN DBMS_DATA_MINING.DROP_MODEL(''SYSTEM.ALL_MINILM_L12_V2''); END;';
    DBMS_OUTPUT.PUT_LINE('Dropped stale SYSTEM.ALL_MINILM_L12_V2.');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

EXIT
