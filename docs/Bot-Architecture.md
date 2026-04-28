# Telegram Bot Architecture

## Overview

The Telegram bot is embedded in the Spring Boot backend and provides a conversational interface for agile project management. It supports task tracking, sprint management, project creation, and AI-powered queries — all from Telegram.

```
┌────────────┐      Long Polling       ┌──────────────────────────┐
│  Telegram  │◄──────────────────────► │  TelegramBotController   │
│  API       │                         │ (SpringLongPollingBot)   │
└────────────┘                         └────────────┬─────────────┘
                                                    │
                                                    ▼
                                            ┌──────────────┐
                                            │  BotActions  │
                                            │  (dispatch)  │
                                            └──┬───┬───┬───┘
                                               │   │   │
                              ┌────────────────┘   │   └────────────────┐
                              ▼                    ▼                    ▼
                      ┌──────────────┐   ┌────────────────┐   ┌──────────────┐
                      │  TaskService │   │ BotAgentService│   │ SprintService│
                      │  ProjectSvc  │   │ (context + LLM)│   │ EmployeeRepo │
                      └──────┬───────┘   └───────┬────────┘   └──────┬───────┘
                             │                   │                    │
                             ▼                   ▼                    ▼
                      ┌──────────────┐   ┌────────────────┐   ┌──────────────┐
                      │  Oracle DB   │   │  OpenRouter    │   │  Oracle DB   │
                      │  (JPA/ORM)   │   │  (LLM API)     │   │  (JPA/ORM)   │
                      └──────────────┘   └────────────────┘   └──────────────┘
```

## Message Flow

1. **Telegram API** delivers updates via long polling to `TelegramBotController`
2. The controller extracts the message text and chat ID
3. A `BotActions` instance is created with all injected services
4. `dispatch()` routes the command through a permission-tiered system

```
Incoming Message
    │
    ├─ /start, /help, /hide          → Public (no auth)
    │
    ├─ Employee lookup by chatId     → Reject if not linked
    │
    ├─ Conversation state active?    → Continue wizard flow
    │
    ├─ /mytasks, /sprint, /done,     → Registered users
    │  /listprojects, /llm, /ask
    │
    └─ /newproject, /newsprint       → Managers & admins only
```

## Commands

| Command | Args | Access | Description |
|---------|------|--------|-------------|
| `/start` | — | Public | Show welcome message and keyboard |
| `/help` | — | Public | List all available commands |
| `/hide` | — | Public | Hide the keyboard |
| `/mytasks` | — | Registered | List your assigned tasks with status and priority |
| `/sprint` | — | Registered | Show active sprints and your task count per sprint |
| `/done` | `<taskId>` | Registered | Mark a task as complete |
| `/listprojects` | — | Registered | List all projects |
| `/ask` | `<question>` | Registered | AI agent with role-scoped project data |
| `/llm` | `<prompt>` | Registered | Direct LLM prompt (no context) |
| `/newproject` | `[name]` | Manager | Create a project (guided or inline) |
| `/newsprint` | `<projectId> <name>` | Manager | Create a sprint in a project |

## AI Integration

The bot integrates with **OpenRouter** (configurable model, default `google/gemini-2.5-flash-lite`) through two commands:

### `/ask` — Context-Aware Agent

Uses `BotAgentService` to build a role-scoped data snapshot before querying the LLM.

```
User sends /ask "What should I prioritize?"
    │
    ▼
┌─ BotAgentService.processQuery() ───────────────────────┐
│                                                        │
│  1. Detect role (developer vs manager/admin)           │
│                                                        │
│  2. Build context snapshot:                            │
│     Developer → own tasks, related sprints/projects    │
│     Manager   → all employees, tasks, sprints, projects│
│                                                        │
│  3. Build system prompt with:                          │
│     - User identity and role                           │
│     - Formatting rules (emojis, no raw key:value)      │
│     - Data-only constraint (no hallucination)          │
│                                                        │
│  4. Send to OpenRouter: system prompt + data + question│
│                                                        │
│  5. Return LLM response                                │
└────────────────────────────────────────────────────────┘
```

**Role-based scoping** ensures developers only see their own data and managers see the full organization. The LLM is instructed to never invent data beyond what's provided.

### `/llm` — Direct Prompt

A raw passthrough to `OpenRouterService.generateText()` with no project context. Useful for general questions unrelated to project data.

## Data Model

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Project    │       │    Sprint    │       │     Task     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ projectId PK │◄──┐   │ sprintId PK  │◄──┐   │ taskId PK    │
│ name         │   │   │ name         │   │   │ title        │
│ description  │   │   │ goal         │   │   │ description  │
│ status       │   └───│ project FK   │   └───│ sprint FK    │
│ startDate    │       │ startDate    │       │ project FK   │
│ endDate      │       │ endDate      │       │ assignee FK ─┼──┐
└──────────────┘       │ status       │       │ status       │  │
                       └──────────────┘       │ priority     │  │
                                              │ storyPoints  │  │
                                              │ estimatedHrs │  │
                                              │ expectedEnd  │  │
                                              └──────────────┘  │
                                                                │
                       ┌──────────────┐                         │
                       │   Employee   │◄────────────────────────┘
                       ├──────────────┤
                       │ employeeId PK│
                       │ firstName    │
                       │ lastName     │
                       │ email        │
                       │ role         │
                       │ position     │
                       │ telegramChat │ ← Links Telegram to DB
                       └──────────────┘
```

**Statuses:**
- Task: `todo`, `in_progress`, `done`, `blocked`
- Sprint: `planned`, `active`, `completed`
- Project: `planning`, `active`, `completed`, `on_hold`

## Authentication

The bot identifies users by matching `chatId` from the Telegram message against `Employee.telegramChatId` in the database. Unlinked accounts are rejected with an access denied message.

Permission tiers:
- **Public** — `/start`, `/help`, `/hide`
- **Registered** — any employee with a linked Telegram account
- **Manager/Admin** — employees with `role = "manager"` or `"admin"`

## Configuration

| Property | Env Variable | Description |
|----------|-------------|-------------|
| `telegram.bot.token` | `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `telegram.bot.name` | `TELEGRAM_BOT_NAME` | Bot username |
| `llm.api.key` | `OPEN_ROUTER_API_KEY` | OpenRouter API key |
| `llm.api.url` | — | `https://openrouter.ai/api/v1/chat/completions` |
| `llm.model` | `LLM_MODEL` | Model ID (default: `google/gemini-2.5-flash-lite`) |
| `spring.datasource.url` | — | Oracle JDBC connection string |
| `spring.datasource.username` | `DB_USER` | Database user (default: `TODOUSER`) |
| `spring.datasource.password` | `DB_PASSWORD` | Database password |

## Key Files

| File | Role |
|------|------|
| `controller/TelegramBotController.java` | Entry point — long polling consumer |
| `util/BotActions.java` | Command routing and message formatting |
| `util/BotCommands.java` | Command enum definitions |
| `util/BotHelper.java` | Telegram message sending (MarkdownV2) |
| `service/BotAgentService.java` | AI agent — context building + LLM call |
| `service/OpenRouterService.java` | HTTP client for OpenRouter API |
| `config/BotProps.java` | Bot token/name config properties |
| `config/OpenRouterConfig.java` | HTTP client + API endpoint beans |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Spring Boot 3.5.6 |
| Bot SDK | TelegramBots 9.1.0 (Long Polling) |
| Database | Oracle 23 (JPA / Hibernate) |
| LLM | OpenRouter API (Apache HttpClient5) |
| Auth | Spring Security + JWT |
| Frontend | React (Vite), embedded in backend |
| Runtime | Java 21 (Docker: openjdk:22-jdk) |
| Build | Maven 3.9 + frontend-maven-plugin |
