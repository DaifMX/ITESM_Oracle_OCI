# Project Management System with ChatBot Integration

## Description
This project aims to develop a project management system that improves team productivity and visibility of activities by at least 20%.

The system is designed for software development teams operating in both remote and hybrid work environments. It provides real-time visibility into project progress, task status, and individual performance.

The solution includes a web portal and a Telegram-based chatbot to facilitate interaction, task management, and automated notifications.

## Objectives
- Increase team productivity by 20%
- Improve visibility of team and individual activities
- Automate development and task management processes
- Provide measurable performance indicators (KPIs)
- Enhance communication between team members and management

## Key Features
- Project and task management
- User activity tracking
- KPI visualization dashboards
- Telegram chatbot integration
- Automated notifications
- Secure system architecture
- CI/CD process automation

## Key Performance Indicators (KPIs)
The system will implement metrics such as:
- Sprint velocity
- Task completion rate
- Average task completion time
- Tasks completed per developer
- Incident response time
- Team engagement level

## Architecture
The system follows a cloud-native microservices architecture deployed on Oracle Cloud Infrastructure.

### Infrastructure
- Oracle Cloud Infrastructure (OCI)
- Oracle Autonomous Database
- Kubernetes
- Docker
- OCI Container Registry

### Backend and Services
- Java
- Spring Boot
- Microservices architecture
- API Gateway
- REST APIs

### Integrations
- Telegram Bot API

## Security
Security is implemented across all system components:
- Authentication and authorization (JWT / OAuth2)
- Secure communication via HTTPS
- API protection mechanisms
- Secure secrets management
- Access control policies in OCI

## DevOps and Operations
- Continuous Integration (CI)
- Continuous Deployment (CD)
- Containerization with Docker
- Orchestration with Kubernetes
- Infrastructure as Code (IaC)
- Automated sprint lifecycle processes

## Installation and Setup

### Prerequisites
- Java 17 or higher
- Docker
- Kubernetes (Minikube or OCI cluster)
- Maven or Gradle
- Oracle Cloud account
- Telegram Bot configured

### Steps
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Create the .env file in the root directory

3. Start containers:
   ```bash
   docker compose -f compose.dev.yml up --build
   ```
### ChatBot Usage

The Telegram chatbot enables:
- Task status queries
- Task creation and updates
- Notifications
- KPI consultation
