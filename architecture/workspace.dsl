workspace "MtdrSpring Sprint Tracker" "Team sprint tracking system deployed on Oracle Kubernetes Engine" {

    model {

        # Actors
        developer    = person "Developer"     "Team member who manages tasks, logs hours and tracks personal KPIs"
        scrumMaster  = person "Scrum Master"  "Manages sprints, reviews team KPIs and monitors velocity"
        admin        = person "Admin"         "Manages users, teams and projects via User Management page"
        telegramUser = person "Telegram User" "Interacts with the bot to query tasks and receive notifications"

        # External systems
        telegramApi  = softwareSystem "Telegram Bot API"       "External Telegram platform; receives webhook events and outbound bot messages" "External"
        openRouterAI = softwareSystem "OpenRouter"             "External LLM gateway used by the AI chat agent" "External"
        ociRegistry  = softwareSystem "OCI Container Registry" "Oracle Cloud image registry storing built Docker images" "External"
        githubCI     = softwareSystem "GitHub Actions"         "CI/CD pipeline: build, test, push image and kubectl rollout" "External"

        # Main system
        mtdrSystem = softwareSystem "MtdrSpring Sprint Tracker" "Full-stack sprint tracker with React SPA, Spring Boot API, Oracle DB, Telegram bot and AI chat" {

            # Infrastructure containers
            terraformIaC = container "Terraform IaC" "Provisions OCI resources: VCN, OKE cluster, ATP database, API Gateway, Object Storage, Container Registry" "Terraform / HCL" "IaC" 
            deployScripts = container "Deploy Scripts" "Shell and PowerShell scripts for building, deploying and managing the Kubernetes workload" "Shell / kubectl" "CI Tool"

            # Frontend SPA
            frontendSPA = container "React SPA" "Single-page application built with Vite and React; served as static assets from Spring Boot" "React 18 / Vite / Tailwind" "Web Browser" {

                appJsx         = component "App.jsx"               "Root component; sets up React Router and ThemeContext provider"
                routerJsx      = component "router.jsx"            "Client-side route definitions mapping paths to page components"
                appLayout      = component "AppLayout"             "Authenticated layout wrapper with Sidebar navigation"
                rootLayout     = component "RootLayout"            "Root layout; handles unauthenticated redirect to login"
                sidebar        = component "Sidebar"               "Navigation sidebar with links to all pages"
                chatWidget     = component "ChatWidget"            "Floating AI chat widget; calls /api/chat endpoint"
                loginPage      = component "LoginPage"             "JWT login form; stores access and refresh tokens"
                kanbanPage     = component "KanbanPage"            "Sprint Kanban board with columns: To Do, In Progress, Done"
                dashboardPage  = component "DashboardPage"         "Scrum Master dashboard: sprint velocity, grouped bar charts, team KPIs"
                devDashboard   = component "DeveloperDashboardPage" "Developer view: personal KPI cards, Kanban board and backlog"
                sprintsPage    = component "SprintsPage"           "Sprint management: create, view and close sprints"
                projectsPage   = component "ProjectsPage"          "Projects listing and backlog management"
                backlogPage    = component "BacklogPage"           "Backlog view for a given project"
                userMgmtPage   = component "UserManagementPage"    "Admin page for managing employees and team assignments"
                todosPage      = component "TodosPage"             "Simple to-do list view"
                apiLib         = component "api.js"                "Axios HTTP client with JWT auth headers and base URL config"
                authLib        = component "auth.js"               "Helpers for reading and storing JWT tokens in localStorage"
                fetcherLib     = component "fetcher.js"            "SWR-compatible fetcher wrapper around api.js"
            }

            # Spring Boot backend
            springBackend = container "Spring Boot API" "REST API and Telegram bot backend; serves the compiled React SPA as static resources" "Java 17 / Spring Boot 3 / Maven" "Spring Boot App" {

                # Entry point
                appMain        = component "MyTodoListApplication"  "Spring Boot entry point; bootstraps application context"

                # Config
                oracleConfig   = component "OracleConfiguration"    "Configures Oracle JDBC DataSource from application.properties"
                corsConfig     = component "CorsConfig"             "Global CORS rules allowing React dev server and production origin"
                botProps       = component "BotProps"               "Binds Telegram bot token and username from config"
                openRouterCfg  = component "OpenRouterConfig"       "Binds OpenRouter API key and model from config"
                dataInit       = component "DataInitializer"        "Seeds default roles and admin user on first startup"

                # Security
                jwtAuthFilter  = component "JwtAuthFilter"          "OncePerRequestFilter; validates Bearer JWT on every request"
                jwtUtil        = component "JwtUtil"                 "Generates and validates JWT access tokens"
                webSecurity    = component "WebSecurityConfiguration" "Spring Security filter chain; public routes and JWT integration"
                userDetailsSvc = component "UserDetailsServiceImpl"  "Loads UserDetails from EmployeeRepository for Spring Security"

                # Controllers
                authController     = component "AuthController"         "POST /api/auth/login and /api/auth/refresh"
                taskController     = component "TaskController"         "CRUD REST endpoints for Task resources"
                sprintController   = component "SprintController"       "CRUD REST endpoints for Sprint resources"
                projectController  = component "ProjectController"      "CRUD REST endpoints for Project resources"
                employeeController = component "EmployeeController"     "CRUD REST endpoints for Employee (user) resources"
                teamController     = component "TeamController"         "REST endpoints for Team management"
                commentController  = component "CommentController"      "REST endpoints for Task comments"
                userController     = component "UserController"         "REST endpoints for user profile and role management"
                chatController     = component "ChatController"         "POST /api/chat; proxies message to BotAgentService"
                telegramController = component "TelegramBotController"  "Handles incoming Telegram webhook updates"

                # Services
                taskService        = component "TaskService"           "Business logic for task lifecycle and state transitions"
                sprintService      = component "SprintService"         "Sprint planning, activation and velocity calculation"
                projectService     = component "ProjectService"        "Project creation and backlog management"
                employeeTeamSvc    = component "EmployeeTeamService"   "Manages employee-team membership records"
                teamService        = component "TeamService"           "Team CRUD and membership orchestration"
                commentService     = component "CommentService"        "Task comment creation and retrieval"
                userService        = component "UserService"           "User registration, role assignment and profile updates"
                refreshTokenSvc    = component "RefreshTokenService"   "Issues and validates JWT refresh tokens"
                botAgentSvc        = component "BotAgentService"       "Orchestrates AI chat: builds context and calls OpenRouterService"
                openRouterSvc      = component "OpenRouterService"     "HTTP client that calls the OpenRouter LLM completion API"

                # Repositories
                taskRepo           = component "TaskRepository"        "Spring Data JPA repository for Task entities"
                sprintRepo         = component "SprintRepository"      "Spring Data JPA repository for Sprint entities"
                projectRepo        = component "ProjectRepository"     "Spring Data JPA repository for Project entities"
                employeeRepo       = component "EmployeeRepository"    "Spring Data JPA repository for Employee entities"
                employeeTeamRepo   = component "EmployeeTeamRepository" "Spring Data JPA repository for EmployeeTeam join entities"
                teamRepo           = component "TeamRepository"        "Spring Data JPA repository for Team entities"
                commentRepo        = component "CommentRepository"     "Spring Data JPA repository for Comment entities"
                refreshTokenRepo   = component "RefreshTokenRepository" "Spring Data JPA repository for RefreshToken entities"

                # Domain models
                taskModel      = component "Task"          "JPA entity: id, title, status, priority, storyPoints, assignee, sprint"
                sprintModel    = component "Sprint"        "JPA entity: id, name, startDate, endDate, status, project"
                projectModel   = component "Project"       "JPA entity: id, name, description, team"
                employeeModel  = component "Employee"      "JPA entity: id, name, email, passwordHash, role"
                teamModel      = component "Team"          "JPA entity: id, name"
                commentModel   = component "Comment"       "JPA entity: id, content, author, task, createdAt"
                refreshTokenMdl = component "RefreshToken" "JPA entity: id, token, employee, expiryDate"

                # Bot utilities
                botActions     = component "BotActions"    "Enum of Telegram bot action strings"
                botClient      = component "BotClient"     "Low-level Telegram Bot API HTTP client"
                botCommands    = component "BotCommands"   "Enum of slash command strings"
                botHelper      = component "BotHelper"     "Builds Telegram message payloads"
                botLabels      = component "BotLabels"     "Display label constants for bot messages"
                botMessages    = component "BotMessages"   "Outbound message templates"
            }

            # Database
            oracleDB = container "Oracle Autonomous DB" "Relational store for all entities; accessed via JDBC with Oracle wallet" "Oracle ATP 19c / SQL" "Database"
        }

        # Relationships - actors to system
        developer    -> mtdrSystem   "Creates and updates tasks, logs work hours"
        scrumMaster  -> mtdrSystem   "Manages sprints and monitors team KPIs"
        admin        -> mtdrSystem   "Manages users and team assignments"
        telegramUser -> telegramApi  "Sends commands to bot"
        telegramApi  -> telegramUser "Delivers bot replies and notifications"

        # Relationships - system to external
        mtdrSystem   -> telegramApi  "Sends notifications and bot replies" "HTTPS"
        telegramApi  -> mtdrSystem   "Delivers webhook events" "HTTPS"
        mtdrSystem   -> openRouterAI "Requests LLM completions" "HTTPS"
        openRouterAI -> mtdrSystem   "Returns LLM completions" "HTTPS"
        githubCI     -> ociRegistry  "Pushes built Docker image" "HTTPS"
        githubCI     -> mtdrSystem   "Triggers kubectl rollout restart"

        # Relationships - containers
        developer     -> frontendSPA   "Uses via browser" "HTTPS"
        scrumMaster   -> frontendSPA   "Uses via browser" "HTTPS"
        admin         -> frontendSPA   "Uses via browser" "HTTPS"
        terraformIaC  -> deployScripts "Supports provisioning"
        deployScripts -> springBackend "Builds and deploys Docker image"
        frontendSPA   -> springBackend "REST API calls" "JSON / HTTPS"
        springBackend -> oracleDB      "Reads and writes all entities" "JDBC / TLS"
        springBackend -> telegramApi   "Sends bot messages and handles webhooks" "HTTPS"
        telegramApi   -> springBackend "Delivers webhook updates" "HTTPS"
        springBackend -> openRouterAI  "Calls LLM for chat agent" "HTTPS"
        openRouterAI  -> springBackend "Returns LLM completions" "HTTPS"

        # Relationships - components (Frontend SPA)
        appJsx        -> routerJsx     "Uses"
        appJsx        -> chatWidget    "Renders"
        routerJsx     -> rootLayout    "Wraps unauthenticated routes"
        routerJsx     -> appLayout     "Wraps authenticated routes"
        appLayout     -> sidebar       "Renders"
        appLayout     -> kanbanPage    "Routes to"
        appLayout     -> dashboardPage "Routes to"
        appLayout     -> devDashboard  "Routes to"
        appLayout     -> sprintsPage   "Routes to"
        appLayout     -> projectsPage  "Routes to"
        appLayout     -> userMgmtPage  "Routes to"
        appLayout     -> todosPage     "Routes to"
        rootLayout    -> loginPage     "Routes to"
        kanbanPage    -> apiLib        "Uses"
        dashboardPage -> apiLib        "Uses"
        devDashboard  -> apiLib        "Uses"
        sprintsPage   -> apiLib        "Uses"
        projectsPage  -> apiLib        "Uses"
        backlogPage   -> apiLib        "Uses"
        userMgmtPage  -> apiLib        "Uses"
        chatWidget    -> apiLib        "Uses"
        loginPage     -> authLib       "Stores tokens via"
        apiLib        -> authLib       "Reads JWT from"
        fetcherLib    -> apiLib        "Wraps"
        apiLib        -> springBackend "HTTP requests" "JSON / HTTPS"

        # Relationships - components (Spring Boot - security)
        appMain        -> oracleConfig    "Loads"
        appMain        -> dataInit        "Triggers on startup"
        jwtAuthFilter  -> jwtUtil         "Validates token via"
        jwtAuthFilter  -> userDetailsSvc  "Loads user via"
        webSecurity    -> jwtAuthFilter   "Registers filter"
        userDetailsSvc -> employeeRepo    "Queries employee by email"

        # Relationships - components (Spring Boot - controllers to services)
        authController     -> userService       "Authenticates via"
        authController     -> refreshTokenSvc   "Issues refresh token via"
        taskController     -> taskService       "Delegates to"
        sprintController   -> sprintService     "Delegates to"
        projectController  -> projectService    "Delegates to"
        employeeController -> userService       "Delegates to"
        teamController     -> teamService       "Delegates to"
        commentController  -> commentService    "Delegates to"
        userController     -> userService       "Delegates to"
        chatController     -> botAgentSvc       "Delegates to"
        telegramController -> botAgentSvc       "Delegates to"
        telegramController -> botClient         "Sends replies via"

        # Relationships - components (Spring Boot - services to repos)
        taskService      -> taskRepo          "Persists via"
        taskService      -> sprintRepo        "Reads sprint via"
        taskService      -> employeeRepo      "Reads assignee via"
        sprintService    -> sprintRepo        "Persists via"
        sprintService    -> projectRepo       "Reads project via"
        projectService   -> projectRepo       "Persists via"
        teamService      -> teamRepo          "Persists via"
        teamService      -> employeeTeamSvc   "Manages members via"
        employeeTeamSvc  -> employeeTeamRepo  "Persists via"
        commentService   -> commentRepo       "Persists via"
        commentService   -> taskRepo          "Reads task via"
        userService      -> employeeRepo      "Persists via"
        refreshTokenSvc  -> refreshTokenRepo  "Persists via"
        botAgentSvc      -> openRouterSvc     "Calls for LLM reply"
        botAgentSvc      -> taskRepo          "Reads tasks for context"
        openRouterSvc    -> openRouterAI      "POST /api/v1/chat/completions" "HTTPS"

        # Relationships - repos to DB
        taskRepo         -> oracleDB  "SQL" "JDBC"
        sprintRepo       -> oracleDB  "SQL" "JDBC"
        projectRepo      -> oracleDB  "SQL" "JDBC"
        employeeRepo     -> oracleDB  "SQL" "JDBC"
        employeeTeamRepo -> oracleDB  "SQL" "JDBC"
        teamRepo         -> oracleDB  "SQL" "JDBC"
        commentRepo      -> oracleDB  "SQL" "JDBC"
        refreshTokenRepo -> oracleDB  "SQL" "JDBC"

        # Relationships - bot utilities
        botClient   -> telegramApi  "POST /bot{token}/sendMessage" "HTTPS"
        botHelper   -> botLabels    "Uses"
        botHelper   -> botMessages  "Uses"
        telegramController -> botHelper   "Builds payloads via"
        telegramController -> botActions  "Uses"
        telegramController -> botCommands "Uses"

        # Deployment
        deploymentEnvironment "Production" {

            deploymentNode "Oracle Cloud Infrastructure" "OCI production region" "Oracle Cloud" {

                deploymentNode "Oracle Kubernetes Engine" "Managed Kubernetes cluster" "OKE" {
                    deploymentNode "mtdrworkshop namespace" "Production namespace" "Kubernetes Namespace" {
                        deploymentNode "todolistapp-springboot-deployment" "Spring Boot deployment (rolling update)" "Kubernetes Deployment" {
                            apiInstance = containerInstance springBackend
                        }
                        deploymentNode "react-static-resources" "React SPA compiled into Spring Boot static resources" "Embedded in Spring Boot" {
                            spaInstance = containerInstance frontendSPA
                        }
                        deploymentNode "oracle-atp-service" "Oracle ATP accessed via K8s service and wallet secret" "Kubernetes Service" {
                            dbInstance = containerInstance oracleDB
                        }
                    }
                }

                deploymentNode "OCI Terraform Runner" "Terraform and OCI CLI execution environment" "OCI Cloud Shell" {
                    iacInstance = containerInstance terraformIaC
                }
            }

            deploymentNode "GitHub Actions Runner" "ubuntu-latest hosted runner" "CI/CD" {
                ciInstance = containerInstance deployScripts
            }
        }
    }

    views {

        systemLandscape "SystemLandscape" "All actors, systems and external dependencies" {
            include *
            autoLayout tb
        }

        systemContext mtdrSystem "SystemContext" "MtdrSpring and its direct users and external systems" {
            include *
            autoLayout tb
        }

        container mtdrSystem "Containers" "Deployable containers within MtdrSpring" {
            include *
            autoLayout tb
        }

        component frontendSPA "ComponentsFrontend" "Internal components of the React SPA" {
            include *
            autoLayout tb
        }

        component springBackend "ComponentsBackend" "Internal components of the Spring Boot backend" {
            include *
            autoLayout tb
        }

        deployment mtdrSystem "Production" "DeploymentDiagram" "Production deployment on Oracle Kubernetes Engine" {
            include *
            autoLayout tb
        }

        dynamic mtdrSystem "DynamicLogin" "JWT authentication flow" {
            developer     -> frontendSPA   "Submits login form"
            frontendSPA   -> springBackend "POST /api/auth/login"
            springBackend -> oracleDB      "SELECT employee by email"
            frontendSPA   -> springBackend "Subsequent requests with Bearer token"
            autoLayout tb
        }

        dynamic mtdrSystem "DynamicTaskCreation" "Developer creates a task on the Kanban board" {
            developer     -> frontendSPA   "Fills task form and submits"
            frontendSPA   -> springBackend "POST /api/tasks"
            springBackend -> oracleDB      "INSERT task row"
            springBackend -> telegramApi   "Notify assignee via bot"
            autoLayout tb
        }

        dynamic mtdrSystem "DynamicAIChat" "User asks the AI chat widget a question" {
            developer     -> frontendSPA   "Types question in ChatWidget"
            frontendSPA   -> springBackend "POST /api/chat"
            springBackend -> oracleDB      "Reads task context for prompt"
            springBackend -> openRouterAI  "POST /api/v1/chat/completions"
            autoLayout tb
        }

        dynamic springBackend "DynamicTelegramBot" "Internal flow when a Telegram webhook arrives" {
            telegramController -> botAgentSvc  "Processes incoming command"
            botAgentSvc        -> taskRepo     "Queries tasks for context"
            botAgentSvc        -> openRouterSvc "Requests AI-assisted reply"
            telegramController -> botClient    "Sends reply message"
            autoLayout tb
        }

        dynamic springBackend "DynamicStartup" "Spring Boot startup sequence" {
            appMain -> oracleConfig "Loads datasource config"
            appMain -> dataInit     "Seeds initial data if needed"
            autoLayout tb
        }

        styles {
            element "Web Browser" {
                shape WebBrowser
            }
            element "Database" {
                shape Cylinder
            }
            element "Spring Boot App" {
                shape Hexagon
            }
            element "External" {
                background #999999
                color #ffffff
            }
            element "IaC" {
                shape Component
            }
            element "CI Tool" {
                shape Component
            }
        }

        theme default
    }

}
