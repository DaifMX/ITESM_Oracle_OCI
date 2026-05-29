# 3. Frontend Architecture: React SPA Served as Spring Boot Static Resources

Date: 2026-05-28

## Status

Accepted

## Context

The application needs a frontend that supports multiple user roles (Developer, Scrum Master, Admin), client-side routing, JWT authentication, and dynamic data fetching. The team evaluated two deployment strategies:

1. **Standalone SPA deployment**: React app served from a dedicated static hosting service (e.g., OCI Object Storage + CDN, or a separate Nginx container)
2. **SPA embedded in Spring Boot**: Vite builds the React app into static assets, which are served by Spring Boot as classpath resources

## Decision

The React SPA (built with Vite, React 18, and Tailwind CSS) is compiled into static assets and served directly from the Spring Boot backend as static resources. A single Docker image contains both the compiled frontend and the backend API.

Routing is handled client-side via React Router. The RootLayout component redirects unauthenticated users to /login. JWT tokens (access + refresh) are stored in localStorage and attached to all API calls via the api.js Axios client.

## Consequences

**Positive:**
- Single deployable unit simplifies Docker image management and Kubernetes deployment (one pod, one rollout)
- No CORS configuration needed between frontend and backend in production (same origin)
- Fewer moving parts: no separate CDN or static hosting bucket to manage
- Spring Boot serves the index.html fallback for all unknown routes, enabling client-side routing to work correctly

**Negative:**
- Frontend and backend are coupled at the build level : a UI-only change requires rebuilding and redeploying the full Spring Boot Docker image
- The Spring Boot container handles both API traffic and static file serving, which may require tuning thread pool settings under high concurrent load
- localStorage for JWT storage is vulnerable to XSS attacks; HttpOnly cookies would be more secure but require additional backend configuration
