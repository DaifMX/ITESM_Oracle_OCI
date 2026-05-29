# 5. Authentication Strategy : Stateless JWT with Refresh Tokens

Date: 2026-05-28

## Status

Accepted

## Context

The application serves multiple user roles (Developer, Scrum Master, Admin) across a React SPA and a REST API. Authentication must work in a stateless Kubernetes environment where multiple pod replicas may exist. The system also needs to support token refresh without requiring re-login.

Alternatives considered:
- **Session-based authentication (server-side sessions)**: requires sticky sessions or a shared session store (e.g., Redis), which adds infrastructure complexity in a multi-pod Kubernetes deployment
- **OAuth2 / OIDC with external provider**: more secure for enterprise use but adds external IdP dependency and setup complexity
- **Stateless JWT only (no refresh)**: simpler but forces users to re-login frequently or requires long-lived tokens with higher security risk

## Decision

A **stateless JWT strategy with short-lived access tokens and long-lived refresh tokens** was implemented:

- AuthController issues a JWT access token and a refresh token on successful login (POST /api/auth/login)
- JwtUtil generates and validates access tokens (signed with a secret key, short expiry)
- JwtAuthFilter (a OncePerRequestFilter) validates the Bearer token on every request
- RefreshTokenService issues and stores refresh tokens in the database (RefreshToken JPA entity), allowing POST /api/auth/refresh to issue a new access token
- UserDetailsServiceImpl loads the Employee record from the database for Spring Security to authorize requests
- The React SPA stores both tokens in localStorage and sends the access token as a Bearer header via api.js

Role-based access control is enforced by Spring Security rules in WebSecurityConfiguration.

## Consequences

**Positive:**
- Fully stateless access tokens work seamlessly across multiple Spring Boot pod replicas in Kubernetes without shared session state
- Short-lived access tokens limit the damage window if a token is intercepted
- Refresh token rotation (stored in DB) allows token revocation if needed
- Spring Security integration is standard and well-understood by Java developers

**Negative:**
- localStorage storage of JWTs is susceptible to XSS attacks; HttpOnly cookies would be more secure
- Refresh tokens stored in the database introduce a stateful element that must be cleaned up on logout or expiry
- If the JWT secret key is rotated, all existing access tokens are immediately invalidated, forcing all users to re-login
- No built-in token revocation for access tokens before expiry: a compromised access token remains valid until it expires
