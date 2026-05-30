# User Guide — Project Management System with Chatbot Integration

> **Version:** 1.0.2 · **Platform:** Oracle Cloud Infrastructure · **Last updated:** May 2026  
> **Applies to:** Web Portal (all modern browsers) and Telegram Bot integration  
> **Required role:** Developer or Manager account (assigned by an Admin)

---

## Table of Contents

1. [Quick Start — Be up and running in 5 minutes](#1-quick-start)
2. [Who is this guide for?](#2-who-is-this-guide-for)
3. [Prerequisites](#3-prerequisites)
4. [Installation & Local Setup](#4-installation--local-setup)
5. [How to log in](#5-how-to-log-in)
6. [Developer Dashboard](#6-developer-dashboard)
7. [Manager Dashboard](#7-manager-dashboard)
8. [How to manage tasks](#8-how-to-manage-tasks)
9. [How to use the Kanban board](#9-how-to-use-the-kanban-board)
10. [How to manage sprints](#10-how-to-manage-sprints)
11. [How to read your KPI dashboard](#11-how-to-read-your-kpi-dashboard)
12. [How to manage the backlog](#12-how-to-manage-the-backlog)
13. [How to download reports](#13-how-to-download-reports)
14. [Telegram Bot — Full command reference](#14-telegram-bot--full-command-reference)
15. [AI Assistant (`/ask`)](#15-ai-assistant-ask)
16. [Troubleshooting & common errors](#16-troubleshooting--common-errors)
17. [Glossary](#17-glossary)
18. [Changelog](#18-changelog)

---

## 1. Quick Start

Get your first task updated in under 5 minutes:

1. Open the web portal in your browser.
2. Enter your email and password, then click **Log In**.
3. You are automatically redirected to your dashboard based on your role.
4. Click any task card to open its detail view.
5. Change the **Status** dropdown to the appropriate value (e.g., **In Progress**).
6. Click **Save**. The change is reflected immediately on the board.

> **Pro Tip:** You can also manage tasks directly from Telegram. Search for the bot, send `/start`, and follow the authentication prompt — no browser required.

---

## 2. Who is this guide for?

This guide covers two user roles:

| Role | What they can do |
|---|---|
| **Developer** | View assigned tasks, update task status, check personal KPIs, use the chatbot |
| **Manager** | Everything a Developer can do, plus: create/assign tasks, manage sprints, view team KPIs, generate reports |

A third role, **Admin**, manages user accounts and system configuration. Admin actions are not covered in this guide.

---

## 3. Prerequisites

Before using the system, confirm the following:

- You have received login credentials from your Admin.
- Your role (**Developer** or **Manager**) has been assigned.
- You are using a supported browser: Chrome 110+, Firefox 110+, Safari 16+, or Edge 110+.
- *(For local setup only)* Java 17+, Docker, and Maven are installed on your machine.
- *(For Telegram Bot)* You have a Telegram account and have been linked to the system by your Admin.

---

## 4. Installation & Local Setup

> **Note:** Skip this section if you are accessing the system through the hosted web portal. These steps are for developers running the project locally.

### 4.1 Clone the repository

```bash
git clone https://github.com/DaifMX/ITESM_Oracle_OCI.git
cd ITESM_Oracle_OCI
```

### 4.2 Create the environment file

Create a file named `.env` in the root directory of the project. Populate it with the required environment variables (database credentials, JWT secret, Telegram Bot token, and OCI keys). Contact your DevOps engineer or refer to the `.env.example` file in the repository for the full list of required variables.

### 4.3 Start the containers

```bash
docker compose -f compose.dev.yml up --build
```

The system will build and start all services. Once complete, the web portal is accessible at `http://localhost:3000` and the API at `http://localhost:8080`.

> **Caution:** Running `docker compose down -v` will delete all local database volumes. Back up any data you need before doing this.

### 4.4 Database migration note (v1.0.0+)

If upgrading from a version prior to 1.0.0, run the following migration before deploying:

```bash
migrations/V2__single_assignee.sql
```

This migration drops the `EMPLOYEE_TASK` table and replaces it with a single-assignee model. Skipping this step will cause task assignment features to fail.

---

## 5. How to log in

1. Navigate to the portal URL in your browser.
2. Enter your **email address** and **password** in the corresponding fields.
3. Click **Log In**.
4. The system validates your credentials and redirects you to the dashboard for your role.

**What happens behind the scenes:** The system uses JWT-based authentication. A secure session token is issued and expires after 60 minutes of inactivity. When your session expires, you are redirected to the login screen automatically.

**If login fails:**

- Double-check your email and password for typos.
- Confirm your account has been created by your Admin.
- If you see `401 Unauthorized`, your credentials are invalid. Contact your Admin to reset your password.
- The system does not lock accounts after failed attempts, but all login events are logged.

> **Caution:** Never share your credentials. All communication with the system is encrypted via HTTPS.

---

## 6. Developer Dashboard

After logging in as a Developer, you are taken directly to your personal dashboard. This view is private — you can only see tasks assigned to you.

**What you will see:**

- A summary of your active tasks with their deadlines and current status.
- Personal KPI cards showing your task completion rate, average task time, and hours logged.
- A link to the Kanban board filtered to your tasks.

**How to update a task status from the dashboard:**

1. Locate the task card you want to update.
2. Click the **Status** badge on the card (e.g., **To Do**).
3. Select the new status from the dropdown: **To Do**, **In Progress**, **Done**, or **Blocked**.
4. The change is saved automatically and reflected immediately.

**If you have no tasks assigned**, the dashboard displays a message prompting you to check with your Manager or visit the Backlog to self-assign an available task.

---

## 7. Manager Dashboard

After logging in as a Manager, you are taken to the Manager Dashboard, which provides a full view of your team's activity.

**What you will see:**

- All tasks across your team, organized by sprint and status.
- Team-level KPI charts: sprint velocity, task completion rate, and hours per developer.
- Individual KPI charts broken down by team member.
- Sprint progress bars showing completed tasks versus total tasks.

**Key actions available from this view:**

- Click **New Task** to create a task and assign it to a developer.
- Click **New Sprint** to create a new sprint and assign tasks to it.
- Click any developer's name in the KPI chart to filter the view to their individual performance.
- Use the **Sprint** dropdown at the top right to filter all charts by a specific sprint.

> **Note:** Managers can only view data for teams they are directly assigned to. Cross-team data is not accessible from this view.

---

## 8. How to manage tasks

> **Required role:** Manager

### 8.1 Create a new task

1. From the Manager Dashboard or Backlog, click **New Task**.
2. Fill in the required fields:
   - **Title** — a short, descriptive name for the task.
   - **Description** — details about what needs to be done.
   - **Priority** — [High], [Medium], or [Low].
   - **Story Points** — estimated effort (numeric).
   - **Due Date** — the deadline for completion.
3. Optionally, assign the task to a developer using the **Assignee** dropdown.
4. Click **Save**. The task is created in under 2 seconds and the assigned developer receives a notification within 3 seconds.

**If a required field is missing**, the system highlights it in red and displays a validation message. The task will not be saved until all required fields are filled.

**If the selected assignee is invalid or not part of your team**, the system rejects the assignment and prompts you to select a valid team member.

### 8.2 Edit an existing task

1. Click the task card from any view (Dashboard, Kanban, or Backlog).
2. Update any field.
3. Click **Save**.

### 8.3 Delete a task

> **Caution:** Deleting a task is permanent and cannot be undone. All associated history and KPI data for that task will be removed.

1. Open the task detail view.
2. Click the **Delete** button in the top-right corner.
3. Confirm the deletion in the dialog that appears.

---

## 9. How to use the Kanban board

The Kanban board provides a visual overview of task status across four columns: **To Do**, **In Progress**, **Done**, and **Blocked**.

**How to move a task:**

1. Navigate to the **Board** view from the sidebar.
2. Find the task card you want to move.
3. Drag the card and drop it into the destination column.
4. The task status updates automatically and the change is saved immediately.

**If a move is not allowed** (for example, due to role restrictions), the card will snap back to its original column and a message will explain why the action was blocked.

Each task card displays:

- Task title and ID number (e.g., `#289`)
- Priority indicator (color-coded)
- Due date
- Assigned developer's name

> **Pro Tip:** Managers can see all team tasks on the board. Developers see only their own assigned tasks.

---

## 10. How to manage sprints

> **Required role:** Manager

### 10.1 Create a new sprint

1. From the Manager Dashboard, click **New Sprint**.
2. Enter a **Sprint Name**, **Start Date**, and **End Date**.
3. Click **Save**.

**If the dates are invalid** (e.g., end date before start date), the system rejects the sprint and displays an error message.

### 10.2 Add tasks to a sprint

1. Open the sprint detail view.
2. Click **Add Tasks**.
3. Select tasks from the backlog to include in the sprint.
4. Click **Confirm**.

Sprint progress is calculated automatically as: *(completed tasks ÷ total tasks) × 100%*. If no tasks are linked to a sprint, progress displays as 0%.

### 10.3 Monitor sprint progress

The active sprint banner appears at the top of the Manager Dashboard and shows the current sprint's progress bar, deadline, and velocity in story points.

---

## 11. How to read your KPI dashboard

The KPI dashboard is accessible to both roles, but the scope differs:

- **Developers** see their own metrics only.
- **Managers** see team-level and individual metrics side by side.

**KPI metrics explained:**

| Metric | What it measures |
|---|---|
| **Task Completion Rate** | Percentage of assigned tasks marked Done |
| **Average Task Time** | Mean time (hours) from task start to completion |
| **Sprint Velocity** | Total story points completed in a sprint |
| **Avg Tasks/Dev** | Average number of tasks completed per developer |
| **Avg Hours/Dev** | Average hours logged per developer |

**How to filter the KPI view:**

1. Use the **Sprint** dropdown at the top right of the KPI summary to filter by a specific sprint or view all sprints combined.
2. Use the **Project** filter (Manager only) to narrow results to a single project.

**If no data is available**, charts display a "No data available" placeholder. This typically means no tasks have been completed yet in the selected sprint or date range.

KPI values update within 3 seconds of any task status change — no page refresh is required.

---

## 12. How to manage the backlog

The backlog is a list of tasks that have been created but not yet assigned to a sprint.

**Managers can:**

1. Navigate to **Backlog** from the sidebar.
2. Click **New Task** to add a new backlog item.
3. Click any backlog task to assign it to a developer or drag it into an active sprint.

**Developers can:**

1. Navigate to **Backlog** from the sidebar.
2. Browse unassigned tasks available to self-assign.
3. Click a task and select **Assign to me**.

> **Note:** If a task is already assigned to another developer, it cannot be self-assigned. Only Managers can reassign tasks between developers.

---

## 13. How to download reports

> **Required role:** Manager  
> **Status:** This feature is currently under development and will be available in a future sprint.

When available, the report download flow will work as follows:

1. Navigate to the **Reports** section from the sidebar.
2. Select the desired **Project** or **Sprint** from the filter dropdowns.
3. Optionally filter by **Date Range** or **Team Member**.
4. Click **Generate Report**.
5. Once generated, click **Download** to save the file to your device.

Reports will include: completed tasks, pending tasks, KPI summaries, and productivity metrics. Data will be sourced directly from Oracle Autonomous Database.

**If no data exists** for the selected parameters, the report will generate with a message indicating that no records were found for the selected filters.

---

## 14. Telegram Bot — Full command reference

The Telegram bot allows you to interact with the project management system using commands directly from your Telegram account.

### 14.1 Getting started with the bot

1. Open Telegram and search for the project bot by its registered name.
2. Send `/start` to begin.
3. The bot will prompt you to authenticate using your system token. Follow the instructions to link your Telegram account to your system profile.

> **Note:** You must have an existing account in the web system before you can use the bot. Authentication is tied to your role — Developers and Managers see different data.

### 14.2 Available commands

| Command | Description | Available to |
|---|---|---|
| `/start` | Begins the session and prompts authentication | All |
| `/tasks` | Lists all tasks assigned to you | Developer, Manager |
| `/sprint` | Shows the current active sprint and its progress | All |
| `/kpi` | Displays your personal KPI summary | All |
| `/ask [question]` | Sends a natural language question to the AI assistant | All |
| `/lim` | Shows the LLM model currently in use | All |

**Example usage:**

```
/tasks
→ Here are your tasks for Sprint 3:
  #289 Configure OCI CLI on GitHub Actions runner
  high priority | 10 story points | ~3h estimated

/sprint
→ Sprint 3 is active (ends June 5). Progress: 72%

/kpi
→ Tasks completed: 7 | Avg time: 3.2h | Sprint points: 68
```

### 14.3 Error handling

- If you send an **unrecognized command**, the bot replies with a help message listing all valid commands.
- If the **backend is unavailable**, the bot notifies you that the service is temporarily down and asks you to try again later.
- If your **authentication token is missing or expired**, the bot denies access and asks you to log in through the web portal first.

> **Note:** The bot responds to all commands within 2 seconds under normal load. All bot-to-backend communication uses HTTPS and JWT authentication. The bot only shows data your role is authorized to access.

---

## 15. AI Assistant (`/ask`)

The AI Assistant is available both in Telegram (via `/ask`) and in the web portal via the **Chat** panel in the sidebar.

The assistant is a context-aware AI agent that can analyze your real project data — tasks, sprints, and team members — and respond based on your role.

**What the assistant can help with:**

- "What are my tasks for Sprint 3?"
- "What is the most complex task assigned to me?"
- "What should I prioritize today?"
- "Summarize the current sprint progress."

**Role-based access:** The assistant only shows data you are authorized to see. A Developer asking about another developer's tasks will receive a message that the data is not available to them. A Manager asking the same question will see the full details.

**Example (Telegram):**

```
/ask What are my tasks for sprint 3?
→ Here are your tasks for Sprint 3:
  #289 Configure OCI CLI on GitHub Actions runner
  high priority | 10 story points | ~3h estimated
  ...
```

**Powered by:** Gemini 2.5 Flash Lite via OpenRouter. AI costs are tracked internally; usage is extremely low (approximately $0.01 per month for 52 requests).

> **Pro Tip:** The assistant works best with specific questions. Instead of "how am I doing?", try "what is my task completion rate for sprint 2?"

---

## 16. Troubleshooting & common errors

| Problem | Likely cause | What to do |
|---|---|---|
| Login returns `401 Unauthorized` | Incorrect credentials or account not created | Check your email/password. Contact your Admin to verify your account exists. |
| Dashboard shows "No tasks available" | No tasks have been assigned to your account | Contact your Manager to assign tasks, or self-assign from the Backlog. |
| KPI charts show "No data available" | No completed tasks in the selected sprint | Complete at least one task or switch the sprint filter to "All sprints". |
| Kanban card snaps back when dragged | Your role does not permit that status change | Confirm your role with your Admin. Developers cannot move tasks assigned to others. |
| Telegram bot does not respond | Bot service is temporarily down | Wait a few minutes and try again. If the issue persists, contact your Admin. |
| Telegram bot says "Unauthorized" | Your account is not linked or token expired | Log into the web portal and follow the bot linking instructions again. |
| Page takes more than 5 seconds to load | Possible network issue or service degradation | Refresh the page. If the issue continues, contact your DevOps engineer. |
| Session expires mid-use | JWT tokens expire after 60 minutes | Log in again. Your data is not lost. |

---

## 17. Glossary

| Term | Definition |
|---|---|
| **Sprint** | A fixed time period (typically 1–2 weeks) during which a set of tasks is completed. |
| **Backlog** | A list of tasks that have been created but not yet assigned to a sprint. |
| **Story Points** | A numeric estimate of the effort required to complete a task. |
| **Sprint Velocity** | The total story points completed during a sprint. Used to predict future sprint capacity. |
| **KPI** | Key Performance Indicator — a measurable value used to evaluate performance. |
| **JWT** | JSON Web Token — a secure, time-limited credential used to authenticate API requests. |
| **Kanban** | A visual task management method using columns to represent workflow stages. |
| **OCI** | Oracle Cloud Infrastructure — the cloud platform where this system is deployed. |
| **Microservice** | An independent software component that handles one specific area of the system (e.g., authentication, task management). |
| **CI/CD** | Continuous Integration / Continuous Deployment — automated processes for building, testing, and deploying code. |
| **Manager** | A user role with full access to create tasks, manage sprints, assign developers, and view team KPIs. |
| **Developer** | A user role with access to their own tasks, personal KPIs, and the Telegram bot. |
| **Admin** | A user role responsible for creating accounts and managing system configuration. Not covered in this guide. |

---

## 18. Changelog

### v1.0.2 — May 22, 2026
- Fixed login screen error message display.

### v1.0.1 — May 22, 2026
- Status labels are now color-coded for easier identification.
- Sprint and project lists are now ordered by start date.

### v1.0.0 — May 21, 2026
- Initial production release.
- KPI dashboard with project-level and sprint-level filters.
- Kanban board with drag-and-drop task management.
- Backlog management with self-assignment for developers.
- Telegram bot with `/tasks`, `/sprint`, `/kpi`, `/ask`, and `/lim` commands.
- AI assistant powered by Gemini 2.5 Flash Lite via OpenRouter, available in both Telegram and the web UI.
- JWT-based authentication with role-based access control (Developer, Manager, Admin).
- Task assignment model updated to single assignee per task.

---

*This guide covers version 1.0.2 of the system. For source code, open issues, or contribution guidelines, visit the [project repository](https://github.com/DaifMX/ITESM_Oracle_OCI).*
