# 1.0.0 (2026-05-21)


### Bug Fixes

* bad boolean condition for data initializer, last one only fixed the role issue. ([15e9ae1](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/15e9ae115d40ba046cfd0c7c93a59bba00a7fc69))
* **bot:** correct illegal Java escape sequences in MarkdownV2 strings ([6982775](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/69827759d37508ff97db799fa437ecebf319be6f))
* **bot:** escape sprint end date and log token prefix on startup ([9f294cf](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/9f294cf82fba7443cd301ab6ea83728b510412da))
* **bot:** switch Telegram parse mode to MarkdownV2 and escape special chars ([9f4b56f](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/9f4b56f22417b1e11bc3344a362ea5818611d031))
* **ci:** add imagePullSecrets and fix deployment rollout ([565d6cb](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/565d6cbe4c8949cd12e839d704efca1ae8fc3cca))
* **ci:** use git SHA image tag and force Docker no-cache ([e2c03fc](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/e2c03fc16ab2da335ef00e06e838c5f7a413e38c))
* **frontend:** correct lib/utils import path in Insights.jsx ([bb4f8c8](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/bb4f8c864011ae896287a9d5852ef5c8c5b90a71))
* **frontend:** translate all Spanish strings to English in manager Dashboard ([4db3172](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/4db3172ea8b44d5da0df90c7ab9a1169a84463fd))
* k8s manifest. ([f3c081c](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/f3c081cb12cca6df85b080453bedfd0938ded5c1))
* package.json wasnt included on last commit. ([38e5af4](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/38e5af4a50f1374cc977a0520cfdf534248f529d))


### Code Refactoring

* **tasks:** replace many-to-many assignees with single developer assignee ([ed13120](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/ed131204ba7b8258886b030f2826a466a512e3b2))


### Features

* add admin role, KPI dashboard, and date range validation ([7953619](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/79536198eb5919df77b831f0f94e0d00f8d9d9d9))
* add KPI dashboard, kanban view, and backlog for RF-004. ([284d646](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/284d6465a9af9fd4a274ee03d99cee0efd0b1229))
* API creates a default user if there's no admins registered on the database. ([c73dc91](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/c73dc91e74c62c1ce0e258657ef994cf38f16e83))
* **bot:** replace DeepSeek with OpenRouter and add /ask agent command ([577feda](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/577feda62dc5ba19b232f6a0e48faba86227c23a))
* **chat:** expose LLM assistant to all roles via web UI ([4d4b455](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/4d4b455a3a4a608ab904bd1b2c69e6942bf6d67e))
* fixed bad boolean condition. ([1c8b869](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/1c8b869f70cffe76a4b6b06817daf47c7191fa13))
* **frontend:** add backlog, user edit, sprint banner, and role enforcement ([e149d04](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/e149d04dc6beedc9707dd473e9577f4e14c3ce54))
* **frontend:** adopt SWR, skeleton loading states, and English copy ([d855d51](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/d855d511549c3cc56c3b46d405b899a2eb1f5553))
* **frontend:** implement agile project management UI and backend CRUD operations and DB schemas for hibernate. ([5c4759b](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/5c4759b021d4b65b724993ed54ecee481e573ee6))
* **kpi:** add project-level filter to Team KPIs dashboard ([0c4607d](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/0c4607dbaf56dff5df93c1de8f022b48192c254e))
* **kpi:** include managers in task assignment and KPI charts ([d145756](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/d145756bfbcc599d0d542d29a2d3883ed1afae57))
* new frontend and login ([d907373](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/d907373b792fe3f4a6a189490330ebf63dd7a9e6))
* new tables for sprints and the rest of the workflow. ([fbcc3c8](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/fbcc3c874fb90cd6053f159c99c53dbff4813fc8))
* **ui:** improve sprint cards, board header, and task creation UX ([cf3ef59](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/cf3ef596e02c7cbbf016775bfc8c73db01c0dcd6))


### BREAKING CHANGES

* **tasks:** EMPLOYEE_TASK table is dropped; run migrations/V2__single_assignee.sql before deploying

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
