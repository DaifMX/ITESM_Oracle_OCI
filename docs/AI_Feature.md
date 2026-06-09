# AI Feature Architecture

## Overview

The project ships an AI assistant that lets employees ask natural-language
questions about their project-management data ("what should I prioritize?",
"which of my tasks are blocked?") and get grounded, role-appropriate answers.
It is reachable from two surfaces — the **Telegram bot** and a **REST chat
endpoint** in the web app — both backed by the same `BotAgentService`.

The assistant is a **Retrieval-Augmented Generation (RAG)** system: instead of
stuffing the whole project state into the prompt, it embeds the question,
retrieves only the most relevant chunks from an Oracle 26ai vector store, and
asks the LLM to answer from that context alone. The retrieval/embedding
internals are documented separately in [RAG.md](RAG.md); this document covers
the end-to-end AI feature and how the pieces fit together.

```
   ┌─────────────┐        ┌─────────────────┐
   │ Telegram    │        │ Web app /chat   │
   │ /ask  /llm  │        │ REST endpoint   │
   └──────┬──────┘        └────────┬────────┘
          │  Employee (role-scoped)│
          └───────────┬────────────┘
                      ▼
            ┌───────────────────┐
            │  BotAgentService  │   processQuery(employee, query)
            └─────────┬─────────┘
            ┌─────────┴───────────────────────────┐
            ▼ (1) retrieve                        ▼ (3) generate
   ┌───────────────────┐                   ┌───────────────────┐
   │  RagRetriever     │                   │ OpenRouterService │
   │  (role-scoped     │                   │  chat(system,     │
   │   vector search)  │                   │       user)       │
   └────────┬──────────┘                   └────────┬──────────┘
            │ embed + VECTOR_DISTANCE               │ HTTPS
            ▼                                       ▼
   ┌───────────────────┐                   ┌──────────────────┐
   │ Oracle 26ai       │                   │  OpenRouter API  │
   │ RAG_CHUNK + index │                   │  (configurable   │
   │ (in-DB embeddings)│                   │   LLM model)     │
   └───────────────────┘                   └──────────────────┘
```

## Two LLM-backed commands

The assistant exposes two distinct behaviors (see
[Bot-Architecture.md](Bot-Architecture.md) for the full command table):

| Command | Path | Context | Use |
| --- | --- | --- | --- |
| `/ask <question>` | `BotAgentService.processQuery` | **RAG** — retrieved, role-scoped project chunks | Grounded answers about the user's own data |
| `/llm <prompt>` | `OpenRouterService.generateText` | none | Raw passthrough to the LLM for general questions |

`/ask` is the RAG feature. `/llm` is a deliberately context-free escape hatch.

## Request flow (`/ask`)

`BotAgentService.processQuery(Employee employee, String query)`:

1. **Determine role.** `isManager = role == "manager" || role == "admin"`.
   This single boolean drives both retrieval scope and the system prompt.

2. **Retrieve** (`RagRetriever.search(query, topK, employee, isManager)`):
   - The question is embedded **in-database** with `VECTOR_EMBEDDING` using the
     same `ALL_MINILM_L12_V2` model that indexed the data.
   - A cosine `VECTOR_DISTANCE` search returns the top-K chunks
     (`rag.retrieval.top-k`, default 8).
   - **Access control lives in the SQL `WHERE` clause**: managers see all
     chunks; developers see organizational sprint/project chunks plus only the
     task chunks they're assigned to. There is no way for the LLM to receive a
     chunk the caller isn't entitled to.
   - If retrieval throws, the user gets a graceful "couldn't search the project
     data right now" message rather than an error.

3. **Assemble the prompt.** Retrieved chunk texts are joined with `---`
   separators into a `=== RETRIEVED CONTEXT ===` block, followed by
   `=== QUESTION ===` and the raw query. If nothing was retrieved, the context
   is an explicit "(no relevant project data was found)" sentinel so the model
   doesn't hallucinate.

4. **Generate** (`OpenRouterService.chat(systemPrompt, userMessage)`): a
   system+user message pair is POSTed to OpenRouter. LLM failures also degrade
   gracefully to a friendly fallback string.

### System prompt

`buildSystemPrompt` constructs the instructions per request. Key directives:

- **Identity & role** — the user's name and role, and (for developers) an
  explicit note that the context only includes their own tasks plus
  organizational sprints/projects, with a "do not invent data about other
  employees" guard.
- **Grounding** — *"Answer ONLY based on the RETRIEVED CONTEXT section. If it
  doesn't contain enough information, say so plainly. Do NOT guess from prior
  knowledge."* This is the core anti-hallucination rule and the mitigation for
  the absence of a re-ranker.
- **Citation anchor** — chunks are prefixed with `[TASK #id]` / `[SPRINT #id]`
  / `[PROJECT #id]`; the prompt tells the model to refer to those IDs.
- **Formatting** — plain text only (no Markdown), conversational tone, status
  and priority **emojis** (`🔄 📋 ✅ 🚫`, `🔴 🟡 🟢`), a compact per-task layout,
  and "answer in the user's language" — tuned for readability on a phone.

## Components

| Component | Responsibility |
| --- | --- |
| `BotAgentService` | Orchestrates retrieve → assemble → generate; builds the system prompt; handles failures gracefully |
| `RagRetriever` | Embeds the query and runs the role-scoped top-K vector search (see [RAG.md](RAG.md)) |
| `EmbeddingService` | Single wrapper over `VECTOR_EMBEDDING(model USING ? AS DATA)`; used by both indexing and retrieval |
| `OpenRouterService` | HTTP client for the OpenRouter chat/completions API (`chat()` for RAG, `generateText()` for `/llm`) |
| RAG indexing layer | `RagDirtyEnqueuer`, `RagIndexWorker`, `RagIndexer`, `RagBackfillRunner` — keep `RAG_CHUNK` in sync with entity writes (see [RAG.md](RAG.md)) |

### The LLM — OpenRouter

The assistant talks to a hosted LLM through **OpenRouter**, not a Claude/OpenAI
SDK directly. `OpenRouterService` builds a JSON `messages` array (system + user)
and POSTs it with Apache HttpClient5 to
`https://openrouter.ai/api/v1/chat/completions`. The model is configurable; the
default is `google/gemini-2.5-flash-lite`.

| Property | Env | Default |
| --- | --- | --- |
| `llm.api.key` | `OPEN_ROUTER_API_KEY` | — (required) |
| `llm.api.url` | — | `https://openrouter.ai/api/v1/chat/completions` |
| `llm.model` | `LLM_MODEL` | `google/gemini-2.5-flash-lite` |

> The chat model is intentionally pluggable and separate from the embedding
> model. The **embedding** side runs in-database (Oracle ONNX, no API); only
> the final **generation** step is an external call.

### The embedding + retrieval side

Covered in full in [RAG.md](RAG.md). In short: every task/sprint/project is
embedded into a `VECTOR(384, FLOAT32)` column in `RAG_CHUNK` by a loaded
`ALL_MINILM_L12_V2` ONNX model, kept fresh asynchronously via the `RAG_DIRTY`
queue and `RagIndexWorker`, and searched with cosine `VECTOR_DISTANCE` over an
Oracle AI Vector Search index.

## Why RAG instead of a full context dump

The earlier assistant dumped the user's entire visible dataset into every
prompt — a developer's full task list, or, for a manager, every employee,
task, sprint, and project. That fails predictably as the organization grows:
the prompt size scales linearly, it bursts the LLM context window and spend
limit within a few sprints, and answer quality degrades because the model can't
separate relevant data from noise. RAG sends only the chunks semantically close
to the actual question, which keeps prompts small, cheap, and on-topic, and
makes the system usable at organizational scale.

## Configuration summary

| Property | Default | Purpose |
| --- | --- | --- |
| `llm.model` / `LLM_MODEL` | `google/gemini-2.5-flash-lite` | Generation model |
| `llm.api.key` / `OPEN_ROUTER_API_KEY` | — | OpenRouter credential |
| `rag.retrieval.top-k` | `8` | Chunks fed to the LLM per question |
| `rag.embedding.model` | `ALL_MINILM_L12_V2` | In-DB embedding model name |
| *(indexing knobs)* | see [RAG.md](RAG.md) | Backfill, worker cadence, batch size, retry cap |

No new secrets are introduced by the AI feature beyond the pre-existing
`OPEN_ROUTER_API_KEY`: the embedding model lives inside the database.

## Failure handling

The feature degrades gracefully at every external boundary:

- **Retrieval failure** (DB/embedding) → "Sorry, I couldn't search the project
  data right now."
- **Empty retrieval** → the model is told no data was found, so it says it
  doesn't know rather than inventing an answer.
- **LLM failure** (OpenRouter) → "Sorry, I couldn't process your request right
  now."
- **Indexing failures** are isolated to the background worker and never block a
  chat or an entity write; they retry from the queue (see [RAG.md](RAG.md)).

## Related documents

- [RAG.md](RAG.md) — the embedding, indexing, and retrieval internals.
- [Bot-Architecture.md](Bot-Architecture.md) — the Telegram bot surface,
  commands, auth, and data model.
