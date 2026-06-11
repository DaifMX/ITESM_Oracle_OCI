# [1.5.0](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.4.0...v1.5.0) (2026-06-11)


### Bug Fixes

* **ci:** prevent PlantUML diagrams from being clipped ([ffee786](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/ffee786825cc0d873dd1feb81d2af78894f1b3db))
* restore auto-generated UML diagrams from main ([1048479](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/10484797de2b68da8afe65a684e4f51f0f1c4b1d))


### Features

* **tasks:** let developers create and edit tasks from dashboards ([c849eaa](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/c849eaaa10b519e609ba58b36fc791b308a8e382))

# [1.4.0](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.3.0...v1.4.0) (2026-06-10)


### Bug Fixes

* **comments:** set task and author when creating a comment ([82272a0](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/82272a06ccff8f0a59474bf33c2bb9083ef68b26))
* **routing:** serve SPA fallback and return 401 on expired token ([bc1d165](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/bc1d1654cf7166c736415220396843ec346c4d17))
* **task:** enforce 500-char description limit across all layers ([7a4ac24](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/7a4ac24288ca4a3ef762f485ecfeb45e9ffebedc))


### Features

* **ai:** agentic tool-calling assistant with persistent chat memory ([dabe3a8](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/dabe3a8b273f3cdb3408c60978bb92995ab2df1c)), closes [#17](https://github.com/DaifMX/ITESM_Oracle_OCI/issues/17) [#18](https://github.com/DaifMX/ITESM_Oracle_OCI/issues/18)

# [1.3.0](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.2.0...v1.3.0) (2026-06-09)


### Bug Fixes

* **infra:** fetch ONNX model before terraform plan in destroy ([172c186](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/172c18630aa21c0c20bb4a12bf3de4da82b46608))
* **infra:** resolve fetch-onnx-cache.sh path before `cd` ([464f2b2](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/464f2b2d15101d522fdb6ac46be11a8d30f2dc0d))


### Features

* **rag:** self-heal embedding model load at app startup ([2afe6a7](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/2afe6a74aa1108ea62b013b3645e327d45ae0c4d))

# [1.2.0](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.1.1...v1.2.0) (2026-06-09)


### Bug Fixes

* **infra:** fetch ONNX model before terraform plan ([6d070b0](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/6d070b0d553e7ba84c86ff381f92abc2e9ff6f15))


### Features

* **rag:** add in-database RAG assistant on Oracle 26ai AI Vector Search ([dfd4c22](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/dfd4c22821628ad8d1dccbe5b97a61d2f678f862))

## [1.1.1](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.1.0...v1.1.1) (2026-06-08)


### Bug Fixes

* **infra:** allow service LB to reach worker NodePorts ([05d83af](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/05d83af07786bd244db945553e755cae57626f03))

# [1.1.0](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.0.3...v1.1.0) (2026-06-08)


### Bug Fixes

* **ci:** install libaio1t64 on Ubuntu 24.04 for sqlplus ([05e8e32](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/05e8e3264de672e6564361a9eb3e857ee8e50d8f))
* **ci:** make ATP admin password update idempotent ([c914200](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/c914200271277a218bb1f8535224e1ab080f8212))
* **ci:** read TELEGRAM_BOT_NAME from secrets, not vars ([39334c7](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/39334c70091db2b067dcc05674905419726fda51))
* **ci:** register oracle instant client libs with ldconfig ([1e286ba](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/1e286ba945d97ffd53274530953750deb2d38681))
* **ci:** require exactly one ATP DB in bootstrap lookup ([1c2d6e8](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/1c2d6e8e4b5d85a2c2271c57fe78d069695c21cd))
* **ci:** symlink libaio.so.1 for sqlplus on Ubuntu 24.04 ([5a483f7](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/5a483f7954b0c9168b62c7b099b30a92bf8d5169))
* **ci:** tolerate ORA-28007 when re-setting TODOUSER password ([3e06e7b](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/3e06e7b97b76b0b77b34c0b28ab436594cc88f98))
* **ci:** use docker driver for buildx to avoid Docker Hub pull ([ebb0f0a](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/ebb0f0a45f584ce265697646534ebb4d34520360))
* **infra:** stop terraform scaling the Always Free ATP database ([0372779](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/0372779b93821e44e7183b4bba3c5181e46662bc))
* **infra:** upgrade oci provider, pin k8s image, fix ATP free tier ([34a574e](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/34a574e1516d0bdc005186531926dbee2da8c832))


### Features

* **ci:** inject app config secrets and auto-generate JWT secret ([c59ea0c](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/c59ea0cface2e29169d831464c3c130fb9aa5783))
* **infra:** pin ATP to Oracle Database 26ai ([efee9f4](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/efee9f48ed8e007e9ebb2a068cdcd08a63a6bfe9))

## [1.0.3](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.0.2...v1.0.3) (2026-06-05)


### Bug Fixes

* **tests:** make EmployeeControllerTest pass under the real security chain ([60ead61](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/60ead6168b550e70104549a5d1c3a531d8e04767))

## [1.0.2](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.0.1...v1.0.2) (2026-05-22)


### Bug Fixes

* login screen message ([c35daad](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/c35daadcbd2564c28498ee0f2c675c1ae1b22af7))

## [1.0.1](https://github.com/DaifMX/ITESM_Oracle_OCI/compare/v1.0.0...v1.0.1) (2026-05-22)


### Bug Fixes

* color code to status and status names. Order in which sprints and projects appeared is now displayed by start date. ([62f731a](https://github.com/DaifMX/ITESM_Oracle_OCI/commit/62f731adb32b87992b715ced8676a6f775eda463))

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
