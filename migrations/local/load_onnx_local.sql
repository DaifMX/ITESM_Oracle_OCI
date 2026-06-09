-- Local-dev ONNX model load for Oracle 23ai Free (compose.dev.yml).
--
-- Mirrors the cloud-bootstrap step but uses DBMS_VECTOR.LOAD_ONNX_MODEL
-- (filesystem) instead of LOAD_ONNX_MODEL_CLOUD.
--
-- Run ONCE per fresh DB container, as ADMIN:
--   sqlplus admin/ADMIN@//localhost:1521/FREEPDB1 \
--     @migrations/local/load_onnx_local.sql
--
-- Prereq:
--   * V5__rag_chunk.sql already applied (grants + RAG_CHUNK tables exist)
--   * compose.dev.yml bind-mounts MtdrSpring/.dev/embeddings to
--     /opt/oracle/embeddings inside the container
--   * MtdrSpring/utils/dev/fetch-onnx.sh has populated the host directory

WHENEVER SQLERROR EXIT 1
SET SERVEROUTPUT ON

-- Point a DB DIRECTORY object at the in-container path the docker volume
-- mount exposes.
CREATE OR REPLACE DIRECTORY VEC_DUMP_DIR AS '/opt/oracle/embeddings';
GRANT READ ON DIRECTORY VEC_DUMP_DIR TO TODOUSER;

-- Idempotent model load. Looks up by model_name in the user catalog and
-- skips when already loaded so repeated runs are no-ops.
DECLARE
  n NUMBER;
BEGIN
  SELECT COUNT(*) INTO n FROM all_mining_models
   WHERE owner = 'TODOUSER' AND model_name = 'ALL_MINILM_L12_V2';
  IF n = 0 THEN
    DBMS_VECTOR.LOAD_ONNX_MODEL(
      directory  => 'VEC_DUMP_DIR',
      file_name  => 'all_MiniLM_L12_v2.onnx',
      model_name => 'ALL_MINILM_L12_V2',
      metadata   => JSON('{
        "function": "embedding",
        "embeddingOutput": "embedding",
        "input": { "input": ["DATA"] }
      }')
    );
    DBMS_OUTPUT.PUT_LINE('Loaded ALL_MINILM_L12_V2.');
  ELSE
    DBMS_OUTPUT.PUT_LINE('ALL_MINILM_L12_V2 already loaded -- skipping.');
  END IF;
END;
/

-- Smoke test: embedding a short string should return a 384-dim vector.
SELECT VECTOR_DIMS(
         VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING 'hello world' AS DATA)
       ) AS dims
FROM dual;

EXIT
