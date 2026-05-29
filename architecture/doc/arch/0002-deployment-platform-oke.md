# 2. Deployment Platform: Oracle Kubernetes Engine (OKE)

Date: 2026-05-28

## Status

Accepted

## Context

The application needs a production deployment environment that supports containerized workloads, can be provisioned as infrastructure-as-code, and integrates with the Oracle Cloud ecosystem (Oracle Autonomous DB, OCI Container Registry). The team has access to Oracle Cloud Infrastructure (OCI) as the target cloud provider.

Alternatives considered:
- **Bare VMs on OCI Compute**: simpler but requires manual scaling and no container orchestration
- **Oracle Container Instances**: serverless containers, less control over networking and secrets
- **OKE (Oracle Kubernetes Engine)**: managed Kubernetes, supports Helm, Kubernetes Secrets for DB wallet, rolling deployments

## Decision

Oracle Kubernetes Engine (OKE) was selected as the production deployment platform. All application containers (todolistapp-springboot-deployment, embedded React SPA, and Oracle ATP service access) run within a dedicated mtdrworkshop Kubernetes namespace.

Infrastructure is provisioned via Terraform IaC (HCL), which creates:
- VCN and subnets
- OKE cluster and node pool
- Oracle ATP database
- API Gateway
- Object Storage bucket
- OCI Container Registry

Deployment is automated via GitHub Actions which builds the Docker image, pushes it to OCI Container Registry, and triggers a kubectl rollout restart on the deployment.

## Consequences

**Positive:**
- Kubernetes rolling updates enable zero-downtime deployments
- Kubernetes Secrets store the Oracle wallet securely, decoupled from the application image
- Terraform IaC makes the infrastructure reproducible and version-controlled
- OKE integrates natively with OCI Container Registry and Oracle ATP
- Horizontal scaling of the Spring Boot pod is possible without infrastructure changes

**Negative:**
- OKE adds operational complexity compared to a simple VM deployment
- Terraform state must be managed carefully (remote backend recommended for team use)
- Oracle wallet rotation requires a Kubernetes Secret update and pod restart
- The React SPA is bundled into the Spring Boot static resources rather than served from a CDN, which means frontend-only changes require a full backend image rebuild and redeploy
