# 1. Architecture Style Selection

Date: 2026-05-28

## Status

Accepted

## Context

MtdrSpring Sprint Tracker requires a clear architectural approach to support a team sprint tracking system with multiple actors (Developer, Scrum Master, Admin, Telegram User), real-time bot interaction, AI-assisted chat, and a CI/CD pipeline deployed on Oracle Kubernetes Engine.

From the nine architectural styles studied (Layered, Pipeline, Microkernel, Service-Based, Event-Driven, Space-Based, Orchestration-Driven SOA, Microservices, and Monolithic), we needed to identify which styles apply and where within the system.

## Decision

The following architecture styles were selected and applied at different layers of the system:

### 1. Layered Architecture: Spring Boot Backend
The Spring Boot API is structured in strict horizontal layers:
- **Controllers** (REST entry points)
- **Services** (business logic)
- **Repositories** (data access via Spring Data JPA)
- **Domain Models** (JPA entities)

This is the dominant internal style of the backend. Each layer only communicates downward, which enforces separation of concerns and simplifies testing.

### 2. Service-Based Architecture: Overall System Decomposition
Rather than full microservices, the system is deployed as a small number of coarse-grained services:
- React SPA (frontend)
- Spring Boot API (backend + bot)
- Oracle Autonomous DB (persistence)
- External integrations (Telegram Bot API, OpenRouter)

These are independently deployable units within the same Kubernetes namespace, sharing a single database : which is characteristic of Service-Based architecture.

### 3. Event-Driven Architecture: Telegram Bot Integration
The Telegram bot subsystem follows an event-driven pattern:
- Telegram platform delivers webhook events (HTTP POST) to TelegramBotController
- The controller dispatches to BotAgentService based on command type
- Replies are sent asynchronously back through BotClient

This decouples the bot processing from the synchronous REST API flow.

### 4. Pipeline Architecture: CI/CD (GitHub Actions)
The CI/CD process follows a pipeline style:
- Source push triggers GitHub Actions
- Build → Test → Docker image push to OCI Container Registry → kubectl rollout restart

Each stage is a discrete step with a single responsibility and clear handoffs.

## Consequences

**Positive:**
- Layered backend is easy to understand, test, and onboard new developers
- Service-Based decomposition avoids microservices complexity while keeping deployable units independent
- Event-Driven bot integration keeps the webhook flow loosely coupled from the REST API
- Pipeline CI/CD ensures consistent and automated deployments

**Negative:**
- Service-Based architecture with a shared database introduces coupling at the data layer; schema changes affect all services
- The monolithic Spring Boot container handles REST API, static SPA serving, and Telegram bot : this may become a bottleneck if any one concern needs to scale independently
- Layered architecture can lead to "fat service" anti-patterns if business logic is not carefully bounded