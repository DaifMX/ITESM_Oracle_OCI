-- V5: RAG schema for Oracle 23ai/26ai AI Vector Search
--
-- Creates:
--   * RAG_CHUNK   — one row per indexed entity (task / sprint / project)
--                   with the embedded text and a 384-dim VECTOR column
--   * RAG_DIRTY   — async re-index queue
--   * RAG_CHUNK_EMB_IDX — HNSW vector index for cosine similarity
--
-- Idempotent: safe to re-run. Connect as ADMIN (the script does the
-- TODOUSER grants) on first run; subsequent runs are no-ops.

WHENEVER SQLERROR EXIT 1
SET SERVEROUTPUT ON

-- ---------------------------------------------------------------------------
-- 1. Grants TODOUSER needs to use AI Vector Search and load ONNX models.
--    DB_DEVELOPER_ROLE bundles the vector-related privileges introduced
--    in 23ai. Wrap in a block so re-runs don't error if already granted.
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
-- 2. RAG_CHUNK — embedded text + vector, one row per source entity.
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
--    HNSW (ORGANIZATION INMEMORY NEIGHBOR GRAPH) needs vector_memory_area,
--    which is 0 on 23ai Free and tight on Always Free ATP -- swapping to
--    IVF avoids both. Same FETCH APPROX FIRST k ROWS ONLY query path, so
--    the application code is unaffected.
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
-- 4. RAG_DIRTY -- async re-index queue. Service write paths insert here
--    (cheap, in-transaction with the entity write); RagIndexWorker drains.
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

EXIT
