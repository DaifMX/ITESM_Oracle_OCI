# 4. AI Chat Agent: OpenRouter as LLM Gateway

Date: 2026-05-28

## Status

Accepted

## Context

MtdrSpring Sprint Tracker includes an AI chat feature accessible via a floating ChatWidget in the React SPA and via the Telegram bot. The feature requires calling a large language model (LLM) to answer questions about sprint tasks and team context.

Alternatives considered:
- **Direct OpenAI API**: widely used, well-documented, but single-provider lock-in and higher cost
- **Direct Anthropic API**: strong models but same lock-in concern
- **OpenRouter**: a unified API gateway that routes to multiple LLM providers (OpenAI, Anthropic, Mistral, etc.) using a single API key and endpoint
- **Self-hosted model (e.g., Ollama)**: full control but requires GPU infrastructure not available in this OCI setup

## Decision

**OpenRouter** was selected as the LLM gateway. The OpenRouterService component in the Spring Boot backend makes HTTP POST requests to https://openrouter.ai/api/v1/chat/completions using a configured API key and model identifier.

The BotAgentService orchestrates the AI interaction: it reads task context from the database via TaskRepository, builds a prompt, and delegates to OpenRouterService for the LLM call. This same service is used by both ChatController (REST endpoint for the SPA widget) and TelegramBotController (webhook handler).

## Consequences

**Positive:**
- Single integration point for multiple LLM providers : the model can be swapped via configuration without code changes
- OpenRouter handles provider fallback and load balancing transparently
- Cost flexibility: cheaper models can be used for routine queries, stronger models for complex ones
- The BotAgentService abstraction means the AI logic is reusable across the SPA chat and the Telegram bot

**Negative:**
- Adds an external dependency and a potential point of failure: if OpenRouter is unavailable, AI chat is unavailable
- Latency is higher than a direct provider call due to the additional routing hop
- Data sent to OpenRouter includes task context (titles, descriptions, assignees): data privacy and compliance must be considered
- API key must be securely stored as a Kubernetes Secret to avoid exposure in the Docker image or repository
