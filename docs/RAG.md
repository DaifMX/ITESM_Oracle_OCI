# RAG Architecture (Oracle 26ai AI Vector Search)

## Overview

The assistant uses an **in-database Retrieval-Augmented Generation (RAG)**
pipeline built entirely on Oracle Database 26ai's AI Vector Search. Every
task, sprint, and project is embedded into a `VECTOR(384, FLOAT32)` column;
at query time the user's question is embedded with the same model and the
top-K most similar chunks are pulled with a cosine-distance search and handed
to the LLM as grounding context.

Nothing about the retrieval path leaves the database except the final prompt:
embeddings are produced **inside Oracle** by a loaded ONNX model
(`ALL_MINILM_L12_V2`), so there is no external embedding API, no per-call cost,
and no extra network hop.

```
                       write path                              read path
  ┌──────────────┐   (async, queued)        ┌──────────────┐  (per question)
  │ Task/Sprint/ │                          │ BotAgent /   │
  │ Project/     │──enqueue──► RAG_DIRTY    │ chat caller  │
  │ Comment svc  │              │           └──────┬───────┘
  └──────────────┘              │ poll 2s          │ embed query
                                ▼                   ▼
                        ┌───────────────┐   ┌───────────────┐
                        │ RagIndexWorker│   │ RagRetriever  │
                        │  + RagIndexer │   │ (role-scoped) │
                        └──────┬────────┘   └──────┬────────┘
            VECTOR_EMBEDDING   │   VECTOR_DISTANCE │  FETCH APPROX
                               ▼                   ▼
                        ┌───────────────────────────────────┐
                        │  RAG_CHUNK (CONTENT + EMBEDDING)  │
                        │  RAG_CHUNK_EMB_IDX (vector index) │
                        └───────────────────────────────────┘
```

## Why RAG

The previous `BotAgentService` was **not** a RAG. On every chat turn it dumped
the entire role-scoped project state into the LLM prompt (a developer's full
task list, or — for managers — every employee, task, sprint, and project).
That approach grows the prompt linearly with the organization: it bursts the
context window and the LLM spend limit within a handful of sprints, and answer
quality drops because the model can't tell relevant data from noise.

RAG replaces the full dump with a small, targeted set of chunks selected by
semantic similarity to the actual question.

## What Oracle 26ai provides

| Feature | Role in this project |
| --- | --- |
| `VECTOR(384, FLOAT32)` column | Stores each chunk's embedding (`RAG_CHUNK.EMBEDDING`) |
| `DBMS_VECTOR.LOAD_ONNX_MODEL[_CLOUD]` | Loads the embedding model into the DB (one-shot per database) |
| `VECTOR_EMBEDDING(model USING ? AS DATA)` | SQL function: text → vector, used by indexer and retriever |
| `VECTOR_DISTANCE(v1, v2, COSINE)` | Cosine distance, used in retrieval `ORDER BY` |
| `CREATE VECTOR INDEX ... ORGANIZATION NEIGHBOR PARTITIONS` | Approximate-NN (IVF) index for the search |
| `FETCH APPROX FIRST k ROWS ONLY` | Triggers the approximate vector index |

### Embedding model — `ALL_MINILM_L12_V2`

- 384 dimensions, distributed by Oracle as a single ~80 MB ONNX bundle.
- Runs in-database, so there is no external embedding API key, no egress, and
  no per-call cost.
- 384 dims keeps the vector index small enough for the Always Free ATP shape
  (1 OCPU / 20 GB).
- Suited to short technical text (task titles, descriptions, comments). It is
  English-leaning; seed data is mixed ES/EN, which is acceptable for v1. If
  Spanish recall becomes a real issue, swapping to `multilingual-e5-small`
  (same dim family) is contained to the bootstrap load + `application.properties`.

> **Note on the bundle:** only Oracle's *augmented* bundle
> (`all_MiniLM_L12_v2_augmented.zip`) works with `LOAD_ONNX_MODEL` — it has the
> tokenizer and post-processing fused into the ONNX graph. The plain
> HuggingFace export does **not** load.

## Data model

### `RAG_CHUNK` — one row per indexed entity

Denormalized so retrieval is a single index lookup with no joins.
Defined in [migrations/V5__rag_chunk.sql](../migrations/V5__rag_chunk.sql).

| Column | Notes |
| --- | --- |
| `CHUNK_ID` | Identity PK |
| `SOURCE_TYPE` | `'task'` \| `'sprint'` \| `'project'` |
| `SOURCE_ID` | PK in the source table |
| `OWNER_EMPLOYEE_ID` | For `task` rows: the assignee's employee id (NULL if unassigned). For `sprint`/`project` rows: NULL (organizational, not personal data). Used for row-level access control at query time. |
| `PROJECT_ID`, `SPRINT_ID` | Optional scope filters |
| `CONTENT` | The exact text that was embedded; stored so it can be handed to the LLM verbatim without re-reading source rows |
| `EMBEDDING` | `VECTOR(384, FLOAT32)` |
| `CONTENT_HASH` | SHA-256 hex of `CONTENT`; lets the indexer skip the embedding call when nothing changed |
| `UPDATED_AT` | Last refresh timestamp |

Unique constraint `RAG_CHUNK_SRC_UQ (SOURCE_TYPE, SOURCE_ID)` makes the upsert
a clean `MERGE` target. Secondary B-tree indexes on `OWNER_EMPLOYEE_ID` and
`PROJECT_ID` support the access-control filter.

### Vector index

```sql
CREATE VECTOR INDEX TODOUSER.RAG_CHUNK_EMB_IDX
  ON TODOUSER.RAG_CHUNK (EMBEDDING)
  ORGANIZATION NEIGHBOR PARTITIONS    -- IVF, on disk
  DISTANCE COSINE
  WITH TARGET ACCURACY 90;
```

The implementation uses **IVF** (`ORGANIZATION NEIGHBOR PARTITIONS`) rather
than HNSW (`ORGANIZATION INMEMORY NEIGHBOR GRAPH`). HNSW needs a configured
`vector_memory_area`, which is 0 on 23ai Free and tight on Always Free ATP;
IVF lives on disk and avoids both limits. The query path
(`FETCH APPROX FIRST k ROWS ONLY`) is identical for either index type, so the
application code is unaffected by the choice.

### `RAG_DIRTY` — async re-index queue

```sql
RAG_DIRTY (
  DIRTY_ID, SOURCE_TYPE, SOURCE_ID,
  ACTION       -- 'UPSERT' | 'DELETE'
  ENQUEUED_AT, ATTEMPTS, LAST_ERROR
)
```

Entity writes don't embed inline — they insert a cheap row here, in the same
transaction. A scheduled worker drains it. Index `RAG_DIRTY_PICK_IDX
(ENQUEUED_AT, DIRTY_ID)` supports FIFO draining.

### Chunk text templates

One chunk per entity (comments are folded into the parent task's chunk, since
per-entity text is short and further chunking would only add retrieval noise).
Built in [RagIndexer.java](../MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/rag/RagIndexer.java).

```
[TASK #<id>] <title>
Status: <status> | Priority: <priority> | Sprint: <sprint name or "none">
Project: <project name or "none">
Assignee: <first> <last> | "unassigned"
Story points: <n>            (omitted if null)
Estimated hours: <n>         (omitted if null)
Due: <expected_end_date or "-">
Description: <description or "-">
Comments:
- <comment 1>
- <comment 2>
```

```
[SPRINT #<id>] <name> (<status>)
Project: <project name or "none">
Dates: <start> -> <end>
Goal: <goal or "-">
```

```
[PROJECT #<id>] <name> (<status>)
Dates: <start> -> <end>
Description: <description>     (omitted if blank)
```

The bracketed `[TASK #id]` / `[SPRINT #id]` / `[PROJECT #id]` prefix is
deliberate: it survives embedding and gives the LLM a stable anchor to cite
IDs back to the user.

## Indexing pipeline (write path)

Indexing is **decoupled** from entity writes via the `RAG_DIRTY` queue. The
classes live in `com.springboot.MyTodoList.rag`.

### 1. Enqueue — `RagDirtyEnqueuer`

A single INSERT into `RAG_DIRTY`, run with `Propagation.REQUIRED` so it joins
the caller's transaction. If the entity write rolls back, the queue row rolls
back too — no phantom dirty rows. The four mutating services call it:

| Service | Methods | Enqueues |
| --- | --- | --- |
| `TaskService` | save/update | `upsert("task", id)` |
| `TaskService` | delete | `delete("task", id)` |
| `SprintService` | save/update/delete | `("sprint", id, …)` |
| `ProjectService` | save/update/delete | `("project", id, …)` |
| `CommentService` | save/update/delete | `upsert("task", comment.task.id)` — comments live in their task's chunk |

### 2. Drain — `RagIndexWorker`

A `@Scheduled` bean (`fixedDelay = 2s`, `initialDelay = 5s`). Each tick, inside
a `REQUIRES_NEW` transaction:

1. **Pick a batch** (default 32) ordered by `ENQUEUED_AT, DIRTY_ID` with
   `FOR UPDATE SKIP LOCKED`, so multiple replicas never double-process the
   same row. (Oracle rejects `FETCH FIRST … FOR UPDATE` with ORA-02014, so the
   query locks by `ROWID` selected in a subquery — the canonical workaround.)
2. **Coalesce** by `(SOURCE_TYPE, SOURCE_ID)`: the latest `DIRTY_ID` wins the
   action, so a `DELETE` after an `UPSERT` resolves to delete, and a chatty
   comment thread collapses to **one** embedding call per task.
3. For each group: `UPSERT → RagIndexer.reindex(...)`,
   `DELETE → RagIndexer.delete(...)`.
4. On success, delete that group's queue rows by exact id.
5. On failure, increment `ATTEMPTS`, store `LAST_ERROR`, and leave the rows.
   At `ATTEMPTS >= max-attempts` (default 5) it logs loudly but keeps the rows
   — no silent data loss.

### 3. Embed + upsert — `RagIndexer` / `EmbeddingService`

`RagIndexer.reindex` loads the source entity, builds its chunk text, and:

1. Computes the SHA-256 hash of the text.
2. If a `RAG_CHUNK` row already exists with the same hash → **no-op** (skips
   the embedding call entirely). This is the second line of defense against
   redundant work, after the queue's coalescing.
3. Otherwise calls `EmbeddingService.embed(text)` →
   `SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING ? AS DATA) FROM dual`,
   read back as `float[]` via the 23ai+ JDBC driver's `getObject(1, float[].class)`.
4. `MERGE`s the `(content, embedding, hash, owner, project, sprint)` into
   `RAG_CHUNK` keyed on `(SOURCE_TYPE, SOURCE_ID)`. The `float[]` is bound with
   `OracleType.VECTOR_FLOAT32`.

If the source entity no longer exists, `reindex` deletes the chunk instead.

### 4. Backfill — `RagBackfillRunner`

On `ApplicationReadyEvent`, enqueues UPSERTs for every Task/Sprint/Project that
has no matching `RAG_CHUNK` row. Cheap on warm DBs (the missing set is empty);
on a cold DB it seeds the queue so the worker populates everything without
blocking startup. Controlled by `rag.backfill.on-startup`.

## Retrieval (read path) — `RagRetriever`

```java
List<RetrievedChunk> search(String query, int topK, Employee caller, boolean isManager)
```

1. Embed the question via `EmbeddingService` (same model as indexing).
2. Run the role-scoped top-K cosine search:

```sql
SELECT SOURCE_TYPE, SOURCE_ID, CONTENT,
       VECTOR_DISTANCE(EMBEDDING, ?, COSINE) AS DIST
  FROM RAG_CHUNK
 WHERE (? = 1                                  -- isManager → see everything
        OR SOURCE_TYPE IN ('sprint','project') -- org context, not personal
        OR OWNER_EMPLOYEE_ID = ?)              -- own task chunks only
 ORDER BY VECTOR_DISTANCE(EMBEDDING, ?, COSINE)
 FETCH APPROX FIRST ? ROWS ONLY;
```

**Access control is enforced in SQL**, mirroring the old role scoping:

- **Managers / admins** see every chunk.
- **Developers** see all sprint/project chunks (organizational context they
  legitimately need) plus only the task chunks where they are the assignee.

`FETCH APPROX FIRST` is what tells the optimizer to use `RAG_CHUNK_EMB_IDX`.
Without `APPROX` Oracle does an exact full scan — correct, but it defeats the
index.

## Configuration

All knobs live in
[application.properties](../MtdrSpring/backend/src/main/resources/application.properties)
with safe defaults, so no new secrets are introduced (the model lives in the
DB; the LLM key is already wired):

| Property | Default | Purpose |
| --- | --- | --- |
| `rag.embedding.model` | `ALL_MINILM_L12_V2` | DB mining-model name used by `VECTOR_EMBEDDING` |
| `rag.retrieval.top-k` | `8` | Chunks fed to the LLM per question |
| `rag.backfill.on-startup` | `true` | Enqueue missing chunks on boot |
| `rag.worker.fixed-delay-ms` | `2000` | Worker poll interval |
| `rag.worker.initial-delay-ms` | `5000` | Delay before first worker tick |
| `rag.worker.batch-size` | `32` | Rows drained per tick |
| `rag.worker.max-attempts` | `5` | Retry cap before logging loudly |

## Provisioning the embedding model

The ONNX model must exist in the DB **once** before any embedding SQL works —
a per-database operation, not per-deploy.

### Cloud (Terraform + bootstrap)

- [MtdrSpring/terraform/embeddings.tf](../MtdrSpring/terraform/embeddings.tf)
  downloads the augmented ONNX bundle at `terraform apply` time (via a
  `null_resource` into a gitignored `.cache/`), uploads it to the existing
  Object Storage bucket, and issues a 1-year **Pre-Authenticated Request (PAR)**
  URL the database can read without its own credentials. The URL is exported as
  the `minilm_onnx_par_url` output (marked `sensitive`).
- [bootstrap-app.sh](../MtdrSpring/utils/ci/bootstrap-app.sh) (step 5b) applies
  `V5__rag_chunk.sql`, then — if `MINILM_ONNX_PAR_URL` is set — runs
  `DBMS_VECTOR.LOAD_ONNX_MODEL_CLOUD` guarded by an
  `all_mining_models` existence check, so it loads once and is a no-op on every
  subsequent deploy. The PAR URL *is* the credential, so no
  `DBMS_CLOUD.CREATE_CREDENTIAL` and no extra GitHub secret are needed.

### Local dev (23ai Free)

`compose.dev.yml` uses `gvenzl/oracle-free:23-slim-faststart`, which ships the
full vector engine. `LOAD_ONNX_MODEL_CLOUD` only accepts OCI Object Storage
URLs, so locally the model is loaded from a bind-mounted file via
`DBMS_VECTOR.LOAD_ONNX_MODEL` — see
[migrations/local/](../migrations/local/) and the helper under
`MtdrSpring/utils/dev/`. The Java code does **not** branch on local vs cloud;
as long as the model name `ALL_MINILM_L12_V2` exists in the user's
mining-model catalog, the indexer, worker, retriever, and chat all behave
identically.

## Operational notes & known limits

- **No re-ranker.** Pure cosine on 384-dim MiniLM will occasionally pull a
  semantically-close-but-wrong chunk into the top-K. The mitigation is the
  LLM's instruction to answer only from context and otherwise say it doesn't
  know.
- **Worker stall signal.** If the embedding model is missing or broken, every
  tick fails but rows stay queued (no data loss). Alert on
  `SELECT COUNT(*) FROM RAG_DIRTY WHERE ATTEMPTS >= 3`.
- **Access control is WHERE-clause-based**, not VPD. There is exactly one
  caller (`BotAgentService`); forgetting to pass `caller`/`isManager` would
  leak data, so the scoping is centralized in `RagRetriever`.

## Out of scope (deliberate follow-ups)

Hybrid lexical+vector search, multi-turn chat memory, streaming responses,
a second-stage re-ranker, and moving embeddings to OCI Generative AI
(`cohere.embed-multilingual-v3.0`).

## Key files

| File | Role |
| --- | --- |
| [migrations/V5__rag_chunk.sql](../migrations/V5__rag_chunk.sql) | `RAG_CHUNK`, `RAG_DIRTY`, indexes, vector index, grants |
| [MtdrSpring/terraform/embeddings.tf](../MtdrSpring/terraform/embeddings.tf) | ONNX download + upload + PAR |
| `rag/EmbeddingService.java` | `text → float[384]` via `VECTOR_EMBEDDING` |
| `rag/RagIndexer.java` | Chunk text builders + hash-skip + `MERGE` |
| `rag/RagIndexWorker.java` | `@Scheduled` queue drainer (coalesce, retry, SKIP LOCKED) |
| `rag/RagDirtyEnqueuer.java` | Cheap in-transaction enqueue |
| `rag/RagBackfillRunner.java` | Startup backfill of missing chunks |
| `rag/RagRetriever.java` | Role-scoped top-K vector search |
| `rag/RagChunk.java`, `rag/RagDirty.java` (+ repos) | JPA entities for the two tables |

See [AI_Feature.md](AI_Feature.md) for how RAG plugs into the overall AI
assistant, and [Bot-Architecture.md](Bot-Architecture.md) for the Telegram
surface.
