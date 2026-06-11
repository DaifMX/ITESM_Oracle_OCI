package com.springboot.MyTodoList.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.EmployeeRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Defines and executes the function-calling tools exposed to the chat agent.
 *
 * Role enforcement happens twice: tool definitions are filtered by role
 * before being sent to the LLM, and execute() re-checks permissions so a
 * hallucinated or injected tool call can never bypass them.
 *
 * Developers: read project/sprint/task data, create tasks assigned to
 * themselves, and edit tasks they are assigned to.
 * Managers/admins: everything above plus full task/sprint/project CRUD,
 * employee registration, and aggregated project insights.
 */
@Service
public class AgentToolService {

    private static final Logger logger = LoggerFactory.getLogger(AgentToolService.class);

    private static final Set<String> TASK_STATUSES = Set.of("todo", "in_progress", "done", "blocked");
    private static final Set<String> TASK_PRIORITIES = Set.of("low", "medium", "high", "critical");
    private static final Set<String> SPRINT_STATUSES = Set.of("planned", "active", "completed");
    private static final Set<String> PROJECT_STATUSES = Set.of("planning", "active", "completed", "on_hold");

    private static final Set<String> MANAGER_ONLY_TOOLS = Set.of(
        "list_employees", "get_project_insights",
        "create_tasks",
        "create_sprint", "update_sprint",
        "create_project", "update_project",
        "register_employee"
    );

    private final ObjectMapper mapper = new ObjectMapper();
    private final SecureRandom random = new SecureRandom();

    private final TaskService taskService;
    private final SprintService sprintService;
    private final ProjectService projectService;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    public AgentToolService(TaskService taskService,
                            SprintService sprintService,
                            ProjectService projectService,
                            EmployeeRepository employeeRepository,
                            PasswordEncoder passwordEncoder) {
        this.taskService = taskService;
        this.sprintService = sprintService;
        this.projectService = projectService;
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Tool execution errors that should be reported back to the LLM verbatim. */
    private static class ToolException extends RuntimeException {
        ToolException(String message) { super(message); }
    }

    // ─── Tool definitions ────────────────────────────────────────────────────

    public ArrayNode toolDefinitions(boolean isManager) {
        ArrayNode tools = mapper.createArrayNode();

        tools.add(tool("list_projects",
            "List all projects with their short key (e.g. P1), name, status and dates. "
            + "Use it to resolve a project the user mentioned by name.",
            params -> {}));

        tools.add(tool("list_sprints", "List sprints, optionally filtered by project.",
            params -> projectParam(params, "Only sprints of this project.", false)));

        tools.add(tool("list_tasks",
            isManager
                ? "List tasks with optional filters. Use this for precise, up-to-date task data."
                : "List the user's assigned tasks with optional filters.",
            params -> {
                projectParam(params, "Only tasks in this project.", false);
                intParam(params, "sprintId", "Only tasks in this sprint.", false);
                enumParam(params, "status", "Only tasks with this status.", TASK_STATUSES, false);
                if (isManager) {
                    intParam(params, "assigneeId", "Only tasks assigned to this employee.", false);
                }
            }));

        tools.add(tool("create_task",
            isManager
                ? "Create a new task in a project."
                : "Create a new task for yourself in a project. It will be assigned to you.",
            params -> {
                stringParam(params, "title", "Short task title.", true);
                projectParam(params, "Project the task belongs to.", true);
                stringParam(params, "description", "Longer task description.", false);
                intParam(params, "sprintId", "Sprint to place the task in (must belong to the same project).", false);
                if (isManager) {
                    stringParam(params, "assignee",
                        "Employee to assign, by full name, email, or numeric id. Omit to leave unassigned.", false);
                }
                enumParam(params, "status", "Task status. Defaults to todo.", TASK_STATUSES, false);
                enumParam(params, "priority", "Task priority. Defaults to medium.", TASK_PRIORITIES, false);
                intParam(params, "storyPoints", "Story point estimate.", false);
                numberParam(params, "estimatedHours", "Estimated hours of work.", false);
                dateParam(params, "startDate", "Start date.", false);
                dateParam(params, "expectedEndDate", "Expected end / due date.", false);
            }));

        if (isManager) {
            tools.add(tool("create_tasks",
                "Create the SAME task for several employees at once -- one task per assignee. "
                + "Use this whenever the user asks to assign a task or activity to multiple people "
                + "(e.g. 'give all developers a Linux course'). Resolves each assignee by name, email "
                + "or id, so you do NOT need to look up ids first. Returns every created task.",
                params -> {
                    stringParam(params, "title", "Short task title, shared by all created tasks.", true);
                    projectParam(params, "Project the tasks belong to.", true);
                    stringArrayParam(params, "assignees",
                        "Employees to create a task for, each by full name, email, or numeric id. "
                        + "One task is created per entry.", true);
                    stringParam(params, "description", "Longer task description, shared by all.", false);
                    intParam(params, "sprintId", "Sprint to place the tasks in (must belong to the same project).", false);
                    enumParam(params, "status", "Task status. Defaults to todo.", TASK_STATUSES, false);
                    enumParam(params, "priority", "Task priority. Defaults to medium.", TASK_PRIORITIES, false);
                    intParam(params, "storyPoints", "Story point estimate per task.", false);
                    numberParam(params, "estimatedHours", "Estimated hours of work per task.", false);
                    dateParam(params, "startDate", "Start date.", false);
                    dateParam(params, "expectedEndDate", "Expected end / due date.", false);
                }));
        }

        tools.add(tool("update_task",
            isManager
                ? "Update fields of an existing task. Only provided fields change."
                : "Update fields of a task assigned to you. Only provided fields change.",
            params -> {
                taskParam(params, "The task to update.", true);
                stringParam(params, "title", "New title.", false);
                stringParam(params, "description", "New description.", false);
                enumParam(params, "status", "New status. Setting done also sets the real end date if missing.", TASK_STATUSES, false);
                enumParam(params, "priority", "New priority.", TASK_PRIORITIES, false);
                intParam(params, "storyPoints", "New story points.", false);
                numberParam(params, "estimatedHours", "New estimated hours.", false);
                numberParam(params, "actualHours", "Real hours worked so far.", false);
                dateParam(params, "startDate", "New start date.", false);
                dateParam(params, "expectedEndDate", "New expected end / due date.", false);
                dateParam(params, "endDate", "Real completion date.", false);
                intParam(params, "sprintId", "Move the task to this sprint. Use 0 to remove it from any sprint.", false);
                if (isManager) {
                    intParam(params, "assigneeId", "Reassign to this employee. Use 0 to unassign.", false);
                }
            }));

        if (isManager) {
            tools.add(tool("list_employees",
                "List all employees with id, name, email, role and position. Use it to find assignee ids.",
                params -> {}));

            tools.add(tool("get_project_insights",
                "Aggregated insights for one project: task counts by status/priority, story points, "
                + "estimated vs actual hours, overdue and unassigned tasks, per-sprint progress and "
                + "per-employee workload. Use this for analytical or progress questions.",
                params -> projectParam(params, "Project to analyze.", true)));

            tools.add(tool("create_sprint", "Create a new sprint in a project.",
                params -> {
                    stringParam(params, "name", "Sprint name.", true);
                    projectParam(params, "Project the sprint belongs to.", true);
                    stringParam(params, "goal", "Sprint goal.", false);
                    dateParam(params, "startDate", "Start date.", false);
                    dateParam(params, "endDate", "End date.", false);
                    enumParam(params, "status", "Sprint status. Defaults to planned.", SPRINT_STATUSES, false);
                }));

            tools.add(tool("update_sprint", "Update fields of an existing sprint. Only provided fields change.",
                params -> {
                    intParam(params, "sprintId", "Id of the sprint to update.", true);
                    stringParam(params, "name", "New name.", false);
                    stringParam(params, "goal", "New goal.", false);
                    dateParam(params, "startDate", "New start date.", false);
                    dateParam(params, "endDate", "New end date.", false);
                    enumParam(params, "status", "New status.", SPRINT_STATUSES, false);
                }));

            tools.add(tool("create_project", "Create a new project.",
                params -> {
                    stringParam(params, "name", "Project name.", true);
                    stringParam(params, "shortName", "Jira-style key for tickets, e.g. PAY. Auto-generated from the name if omitted.", false);
                    stringParam(params, "description", "Project description.", false);
                    enumParam(params, "status", "Project status. Defaults to planning.", PROJECT_STATUSES, false);
                    dateParam(params, "startDate", "Start date.", false);
                    dateParam(params, "endDate", "End date.", false);
                }));

            tools.add(tool("update_project", "Update fields of an existing project. Only provided fields change.",
                params -> {
                    projectParam(params, "The project to update.", true);
                    stringParam(params, "name", "New name.", false);
                    stringParam(params, "shortName", "New Jira-style key for tickets, e.g. PAY.", false);
                    stringParam(params, "description", "New description.", false);
                    enumParam(params, "status", "New status.", PROJECT_STATUSES, false);
                    dateParam(params, "startDate", "New start date.", false);
                    dateParam(params, "endDate", "New end date.", false);
                }));

            tools.add(tool("register_employee",
                "Register a new employee account. Managers can only create developers. "
                + "If no password is given, a temporary one is generated and returned -- share it with the user.",
                params -> {
                    stringParam(params, "firstName", "First name.", true);
                    stringParam(params, "lastName", "Last name.", true);
                    stringParam(params, "email", "Unique email address used to log in.", true);
                    stringParam(params, "password", "Initial password. Omit to auto-generate a temporary one.", false);
                    stringParam(params, "role", "Account role: developer or manager (admins only can create managers).", false);
                    stringParam(params, "position", "Job position, e.g. Backend Developer.", false);
                    stringParam(params, "modality", "Work modality: remote or hybrid.", false);
                    stringParam(params, "phoneNumber", "Phone number.", false);
                }));
        }

        return tools;
    }

    // ─── Execution ───────────────────────────────────────────────────────────

    /**
     * Executes one tool call on behalf of the caller and returns a JSON string
     * for the LLM. Errors come back as {"error": "..."} so the model can
     * correct itself or explain the problem to the user.
     */
    public String execute(String name, JsonNode args, Employee caller) {
        boolean isManager = "manager".equals(caller.getRole()) || "admin".equals(caller.getRole());
        try {
            if (MANAGER_ONLY_TOOLS.contains(name) && !isManager) {
                throw new ToolException("Permission denied: only managers can use " + name + ".");
            }
            switch (name) {
                case "list_projects":        return listProjects();
                case "list_sprints":         return listSprints(args);
                case "list_tasks":           return listTasks(args, caller, isManager);
                case "create_task":          return createTask(args, caller, isManager);
                case "create_tasks":         return createTasks(args, caller);
                case "update_task":          return updateTask(args, caller, isManager);
                case "list_employees":       return listEmployees();
                case "get_project_insights": return projectInsights(args);
                case "create_sprint":        return createSprint(args);
                case "update_sprint":        return updateSprint(args);
                case "create_project":       return createProject(args);
                case "update_project":       return updateProject(args);
                case "register_employee":    return registerEmployee(args, caller);
                default:
                    throw new ToolException("Unknown tool: " + name);
            }
        } catch (ToolException e) {
            return errorJson(e.getMessage());
        } catch (Exception e) {
            logger.error("Tool {} failed", name, e);
            return errorJson("Internal error executing " + name + ": " + e.getMessage());
        }
    }

    // ─── Read tools ──────────────────────────────────────────────────────────

    private String listProjects() {
        ArrayNode arr = mapper.createArrayNode();
        for (Project p : projectService.findAll()) arr.add(projectJson(p));
        return wrap("projects", arr);
    }

    private String listSprints(JsonNode args) {
        Project project = resolveProjectArg(args, false);
        List<Sprint> sprints = project != null
            ? sprintService.findByProject(project.getProjectId())
            : sprintService.findAll();
        ArrayNode arr = mapper.createArrayNode();
        for (Sprint s : sprints) arr.add(sprintJson(s));
        return wrap("sprints", arr);
    }

    private String listTasks(JsonNode args, Employee caller, boolean isManager) {
        Project project = resolveProjectArg(args, false);
        Integer projectId = project != null ? project.getProjectId() : null;
        Integer sprintId = optInt(args, "sprintId");
        String status = optString(args, "status");
        Integer assigneeId = isManager ? optInt(args, "assigneeId") : (Integer) caller.getEmployeeId();

        List<Task> tasks;
        if (assigneeId != null) tasks = taskService.findByAssignee(assigneeId);
        else if (sprintId != null) tasks = taskService.findBySprint(sprintId);
        else if (projectId != null) tasks = taskService.findByProject(projectId);
        else tasks = taskService.findAll();

        ArrayNode arr = mapper.createArrayNode();
        for (Task t : tasks) {
            if (projectId != null && (t.getProject() == null || t.getProject().getProjectId() != projectId)) continue;
            if (sprintId != null && (t.getSprint() == null || t.getSprint().getSprintId() != sprintId)) continue;
            if (status != null && !status.equals(t.getStatus())) continue;
            arr.add(taskJson(t));
        }
        return wrap("tasks", arr);
    }

    private String listEmployees() {
        ArrayNode arr = mapper.createArrayNode();
        for (Employee e : employeeRepository.findAll()) {
            ObjectNode n = mapper.createObjectNode();
            n.put("employeeId", e.getEmployeeId());
            n.put("name", e.getFirstName() + " " + e.getLastName());
            n.put("email", e.getEmail());
            n.put("role", e.getRole());
            if (e.getPosition() != null) n.put("position", e.getPosition());
            arr.add(n);
        }
        return wrap("employees", arr);
    }

    private String projectInsights(JsonNode args) {
        Project project = resolveProjectArg(args, true);
        int projectId = project.getProjectId();
        List<Task> tasks = taskService.findByProject(projectId);
        List<Sprint> sprints = sprintService.findByProject(projectId);
        LocalDate today = LocalDate.now();

        ObjectNode root = mapper.createObjectNode();
        root.set("project", projectJson(project));

        ObjectNode totals = root.putObject("totals");
        totals.put("tasks", tasks.size());
        ObjectNode byStatus = totals.putObject("byStatus");
        for (String s : TASK_STATUSES) {
            byStatus.put(s, tasks.stream().filter(t -> s.equals(t.getStatus())).count());
        }
        ObjectNode byPriority = totals.putObject("byPriority");
        for (String p : TASK_PRIORITIES) {
            byPriority.put(p, tasks.stream().filter(t -> p.equals(t.getPriority())).count());
        }
        totals.put("storyPointsTotal", tasks.stream()
            .map(Task::getStoryPoints).filter(sp -> sp != null).mapToInt(Integer::intValue).sum());
        totals.put("storyPointsDone", tasks.stream()
            .filter(t -> "done".equals(t.getStatus()))
            .map(Task::getStoryPoints).filter(sp -> sp != null).mapToInt(Integer::intValue).sum());
        totals.put("estimatedHours", sumHours(tasks, true).toPlainString());
        totals.put("actualHours", sumHours(tasks, false).toPlainString());
        totals.put("unassignedTasks", tasks.stream().filter(t -> t.getAssignee() == null).count());

        ArrayNode overdue = root.putArray("overdueTasks");
        tasks.stream()
            .filter(t -> !"done".equals(t.getStatus())
                      && t.getExpectedEndDate() != null
                      && t.getExpectedEndDate().isBefore(today))
            .forEach(t -> overdue.add(taskJson(t)));

        ArrayNode sprintStats = root.putArray("sprints");
        for (Sprint s : sprints) {
            List<Task> st = tasks.stream()
                .filter(t -> t.getSprint() != null && t.getSprint().getSprintId() == s.getSprintId())
                .toList();
            ObjectNode n = sprintJson(s);
            n.put("tasks", st.size());
            n.put("tasksDone", st.stream().filter(t -> "done".equals(t.getStatus())).count());
            n.put("storyPointsTotal", st.stream()
                .map(Task::getStoryPoints).filter(sp -> sp != null).mapToInt(Integer::intValue).sum());
            n.put("storyPointsDone", st.stream()
                .filter(t -> "done".equals(t.getStatus()))
                .map(Task::getStoryPoints).filter(sp -> sp != null).mapToInt(Integer::intValue).sum());
            sprintStats.add(n);
        }

        ArrayNode workload = root.putArray("workloadByEmployee");
        tasks.stream()
            .filter(t -> t.getAssignee() != null)
            .collect(java.util.stream.Collectors.groupingBy(t -> t.getAssignee().getEmployeeId()))
            .forEach((empId, empTasks) -> {
                Employee e = empTasks.get(0).getAssignee();
                ObjectNode n = workload.addObject();
                n.put("employeeId", e.getEmployeeId());
                n.put("name", e.getFirstName() + " " + e.getLastName());
                n.put("tasks", empTasks.size());
                n.put("tasksDone", empTasks.stream().filter(t -> "done".equals(t.getStatus())).count());
                n.put("tasksInProgress", empTasks.stream().filter(t -> "in_progress".equals(t.getStatus())).count());
                n.put("storyPoints", empTasks.stream()
                    .map(Task::getStoryPoints).filter(sp -> sp != null).mapToInt(Integer::intValue).sum());
                n.put("estimatedHours", sumHours(empTasks, true).toPlainString());
                n.put("actualHours", sumHours(empTasks, false).toPlainString());
            });

        return root.toString();
    }

    // ─── Write tools ─────────────────────────────────────────────────────────

    private String createTask(JsonNode args, Employee caller, boolean isManager) {
        Task task = new Task();
        task.setTitle(reqString(args, "title"));
        task.setProject(resolveProjectArg(args, true));
        task.setDescription(optString(args, "description"));
        task.setStatus(validated(optString(args, "status"), TASK_STATUSES, "status", "todo"));
        task.setPriority(validated(optString(args, "priority"), TASK_PRIORITIES, "priority", "medium"));
        task.setStoryPoints(optInt(args, "storyPoints"));
        task.setEstimatedHours(optDecimal(args, "estimatedHours"));
        task.setStartDate(optDate(args, "startDate"));
        task.setExpectedEndDate(optDate(args, "expectedEndDate"));

        Integer sprintId = optInt(args, "sprintId");
        if (sprintId != null) {
            task.setSprint(requireSprintInProject(sprintId, task.getProject().getProjectId()));
        }

        if (isManager) {
            Employee assignee = resolveAssigneeArg(args);
            if (assignee != null) task.setAssignee(assignee);
        } else {
            // Developers always create tasks for themselves.
            task.setAssignee(caller);
        }

        Task saved = taskService.save(task);
        return okJson("Task created.", "task", taskJson(saved));
    }

    /**
     * Creates one task per assignee, all sharing the same fields. Manager-only
     * (developers can only self-assign). Every assignee is resolved up front so
     * a bad name fails the whole batch before anything is written, rather than
     * leaving a half-created set.
     */
    private String createTasks(JsonNode args, Employee caller) {
        String title = reqString(args, "title");
        Project project = resolveProjectArg(args, true);

        JsonNode assignees = args.path("assignees");
        if (!assignees.isArray() || assignees.isEmpty()) {
            throw new ToolException("Missing required field: assignees "
                + "(a non-empty list of employee names, emails or ids).");
        }
        List<Employee> targets = new ArrayList<>();
        for (JsonNode a : assignees) targets.add(resolveEmployeeRef(a.asText()));

        String description = optString(args, "description");
        String status = validated(optString(args, "status"), TASK_STATUSES, "status", "todo");
        String priority = validated(optString(args, "priority"), TASK_PRIORITIES, "priority", "medium");
        Integer storyPoints = optInt(args, "storyPoints");
        BigDecimal estimatedHours = optDecimal(args, "estimatedHours");
        LocalDate startDate = optDate(args, "startDate");
        LocalDate expectedEndDate = optDate(args, "expectedEndDate");

        Sprint sprint = null;
        Integer sprintId = optInt(args, "sprintId");
        if (sprintId != null) sprint = requireSprintInProject(sprintId, project.getProjectId());

        ArrayNode created = mapper.createArrayNode();
        for (Employee target : targets) {
            Task task = new Task();
            task.setTitle(title);
            task.setProject(project);
            task.setDescription(description);
            task.setStatus(status);
            task.setPriority(priority);
            task.setStoryPoints(storyPoints);
            task.setEstimatedHours(estimatedHours);
            task.setStartDate(startDate);
            task.setExpectedEndDate(expectedEndDate);
            task.setSprint(sprint);
            task.setAssignee(target);
            created.add(taskJson(taskService.save(task)));
        }

        ObjectNode root = mapper.createObjectNode();
        root.put("ok", true);
        root.put("message", "Created " + created.size() + " task(s).");
        root.set("tasks", created);
        return root.toString();
    }

    private String updateTask(JsonNode args, Employee caller, boolean isManager) {
        Task task = resolveTaskArg(args);

        if (!isManager) {
            if (task.getAssignee() == null || task.getAssignee().getEmployeeId() != caller.getEmployeeId()) {
                throw new ToolException("Permission denied: you can only edit tasks assigned to you.");
            }
        }

        if (args.hasNonNull("title")) task.setTitle(reqString(args, "title"));
        if (args.hasNonNull("description")) task.setDescription(args.get("description").asText());
        if (args.hasNonNull("status")) {
            task.setStatus(validated(args.get("status").asText(), TASK_STATUSES, "status", null));
            if ("done".equals(task.getStatus()) && task.getEndDate() == null) {
                task.setEndDate(LocalDate.now());
            }
        }
        if (args.hasNonNull("priority")) {
            task.setPriority(validated(args.get("priority").asText(), TASK_PRIORITIES, "priority", null));
        }
        if (args.hasNonNull("storyPoints")) task.setStoryPoints(args.get("storyPoints").asInt());
        if (args.hasNonNull("estimatedHours")) task.setEstimatedHours(optDecimal(args, "estimatedHours"));
        if (args.hasNonNull("actualHours")) task.setTotalHours(optDecimal(args, "actualHours"));
        if (args.hasNonNull("startDate")) task.setStartDate(optDate(args, "startDate"));
        if (args.hasNonNull("expectedEndDate")) task.setExpectedEndDate(optDate(args, "expectedEndDate"));
        if (args.hasNonNull("endDate")) task.setEndDate(optDate(args, "endDate"));

        if (args.hasNonNull("sprintId")) {
            int sprintId = args.get("sprintId").asInt();
            if (sprintId == 0) {
                task.setSprint(null);
            } else {
                int projectId = task.getProject() != null ? task.getProject().getProjectId() : -1;
                task.setSprint(requireSprintInProject(sprintId, projectId));
            }
        }

        if (args.hasNonNull("assigneeId")) {
            if (!isManager) {
                throw new ToolException("Permission denied: only managers can reassign tasks.");
            }
            int assigneeId = args.get("assigneeId").asInt();
            task.setAssignee(assigneeId == 0 ? null : requireEmployee(assigneeId));
        }

        Task saved = taskService.save(task);
        return okJson("Task updated.", "task", taskJson(saved));
    }

    private String createSprint(JsonNode args) {
        Sprint sprint = new Sprint();
        sprint.setName(reqString(args, "name"));
        sprint.setProject(resolveProjectArg(args, true));
        sprint.setGoal(optString(args, "goal"));
        sprint.setStatus(validated(optString(args, "status"), SPRINT_STATUSES, "status", "planned"));
        sprint.setStartDate(optDate(args, "startDate"));
        sprint.setEndDate(optDate(args, "endDate"));
        checkDateOrder(sprint.getStartDate(), sprint.getEndDate());
        Sprint saved = sprintService.save(sprint);
        return okJson("Sprint created.", "sprint", sprintJson(saved));
    }

    private String updateSprint(JsonNode args) {
        int sprintId = reqInt(args, "sprintId");
        Sprint sprint = sprintService.findById(sprintId)
            .orElseThrow(() -> new ToolException("Sprint " + sprintId + " not found."));
        if (args.hasNonNull("name")) sprint.setName(args.get("name").asText());
        if (args.hasNonNull("goal")) sprint.setGoal(args.get("goal").asText());
        if (args.hasNonNull("status")) {
            sprint.setStatus(validated(args.get("status").asText(), SPRINT_STATUSES, "status", null));
        }
        if (args.hasNonNull("startDate")) sprint.setStartDate(optDate(args, "startDate"));
        if (args.hasNonNull("endDate")) sprint.setEndDate(optDate(args, "endDate"));
        checkDateOrder(sprint.getStartDate(), sprint.getEndDate());
        Sprint saved = sprintService.save(sprint);
        return okJson("Sprint updated.", "sprint", sprintJson(saved));
    }

    private String createProject(JsonNode args) {
        Project project = new Project();
        project.setName(reqString(args, "name"));
        applyShortName(project, optString(args, "shortName"), -1);
        project.setDescription(optString(args, "description"));
        project.setStatus(validated(optString(args, "status"), PROJECT_STATUSES, "status", "planning"));
        project.setStartDate(optDate(args, "startDate"));
        project.setEndDate(optDate(args, "endDate"));
        checkDateOrder(project.getStartDate(), project.getEndDate());
        Project saved = projectService.save(project);
        return okJson("Project created.", "project", projectJson(saved));
    }

    private String updateProject(JsonNode args) {
        Project project = resolveProjectArg(args, true);
        if (args.hasNonNull("name")) project.setName(args.get("name").asText());
        if (args.hasNonNull("shortName")) {
            applyShortName(project, args.get("shortName").asText(), project.getProjectId());
        }
        if (args.hasNonNull("description")) project.setDescription(args.get("description").asText());
        if (args.hasNonNull("status")) {
            project.setStatus(validated(args.get("status").asText(), PROJECT_STATUSES, "status", null));
        }
        if (args.hasNonNull("startDate")) project.setStartDate(optDate(args, "startDate"));
        if (args.hasNonNull("endDate")) project.setEndDate(optDate(args, "endDate"));
        checkDateOrder(project.getStartDate(), project.getEndDate());
        Project saved = projectService.save(project);
        return okJson("Project updated.", "project", projectJson(saved));
    }

    private String registerEmployee(JsonNode args, Employee caller) {
        String callerRole = caller.getRole() != null ? caller.getRole() : "developer";
        String targetRole = optString(args, "role");
        if (targetRole == null) targetRole = "developer";
        if (!Set.of("developer", "manager").contains(targetRole)) {
            throw new ToolException("Invalid role '" + targetRole + "'. Allowed: developer, manager.");
        }
        // Same rule as /auth/register: managers can only create developers.
        if ("manager".equals(callerRole) && !"developer".equals(targetRole)) {
            throw new ToolException("Permission denied: managers can only create developer accounts.");
        }

        String email = reqString(args, "email");
        if (employeeRepository.findByEmail(email).isPresent()) {
            throw new ToolException("Email " + email + " is already in use.");
        }

        String password = optString(args, "password");
        boolean generated = password == null || password.isBlank();
        if (generated) password = generateTempPassword();

        Employee emp = new Employee();
        emp.setFirstName(reqString(args, "firstName"));
        emp.setLastName(reqString(args, "lastName"));
        emp.setEmail(email);
        emp.setPasswordHash(passwordEncoder.encode(password));
        emp.setRole(targetRole);
        emp.setPosition(optString(args, "position"));
        emp.setModality(optString(args, "modality"));
        emp.setPhoneNumber(optString(args, "phoneNumber"));
        Employee saved = employeeRepository.save(emp);

        ObjectNode result = mapper.createObjectNode();
        result.put("ok", true);
        result.put("message", "Employee registered.");
        result.put("employeeId", saved.getEmployeeId());
        result.put("email", saved.getEmail());
        result.put("role", saved.getRole());
        if (generated) {
            result.put("temporaryPassword", password);
            result.put("note", "Share this temporary password with the new employee and ask them to change it.");
        }
        return result.toString();
    }

    // ─── Lookup helpers ──────────────────────────────────────────────────────

    /**
     * Resolves the "project" argument, which may be a numeric id, a short key
     * like "P1", or a (possibly partial) project name. A legacy "projectId"
     * argument is also honored. Returns null when optional and absent.
     */
    private Project resolveProjectArg(JsonNode args, boolean required) {
        Integer id = optInt(args, "projectId");
        if (id != null) return requireProject(id);
        String ref = optString(args, "project");
        if (ref == null || ref.isBlank()) {
            if (!required) return null;
            throw new ToolException("Missing required field: project (name, short key like P1, or id).");
        }
        return resolveProjectRef(ref.trim());
    }

    private Project resolveProjectRef(String ref) {
        if (ref.matches("\\d+")) return requireProject(Integer.parseInt(ref));

        Optional<Project> byKey = projectService.findByShortName(ref);
        if (byKey.isPresent()) return byKey.get();

        List<Project> all = projectService.findAll();
        List<Project> exact = all.stream()
            .filter(p -> p.getName() != null && p.getName().equalsIgnoreCase(ref))
            .toList();
        if (exact.size() == 1) return exact.get(0);

        List<Project> partial = all.stream()
            .filter(p -> p.getName() != null && p.getName().toLowerCase().contains(ref.toLowerCase()))
            .toList();
        if (partial.size() == 1) return partial.get(0);

        String catalog = all.stream()
            .map(p -> (p.getShortName() != null ? p.getShortName() : "?") + " = " + p.getName())
            .collect(java.util.stream.Collectors.joining("; "));
        if (partial.size() > 1) {
            throw new ToolException("Project reference '" + ref + "' is ambiguous. Projects: " + catalog);
        }
        throw new ToolException("Project '" + ref + "' not found. Projects: "
            + (catalog.isBlank() ? "(none exist yet)" : catalog));
    }

    /** Resolves the "task" argument: a ticket key like "P1-7" or a numeric id ("taskId" also honored). */
    private Task resolveTaskArg(JsonNode args) {
        Integer id = optInt(args, "taskId");
        if (id == null) {
            String ref = optString(args, "task");
            if (ref == null || ref.isBlank()) {
                throw new ToolException("Missing required field: task (ticket key like P1-7, or id).");
            }
            String trimmed = ref.trim().replaceFirst("^#", "");
            if (!trimmed.matches("\\d+")) {
                return taskService.findByTicketKey(trimmed)
                    .orElseThrow(() -> new ToolException("Task '" + ref
                        + "' not found. Use list_tasks to find valid ticket keys."));
            }
            id = Integer.parseInt(trimmed);
        }
        int taskId = id;
        return taskService.findById(taskId)
            .orElseThrow(() -> new ToolException("Task " + taskId + " not found. Use list_tasks to find valid ids."));
    }

    /** Normalizes and applies a user-provided project key, rejecting duplicates. */
    private void applyShortName(Project project, String rawKey, int selfId) {
        if (rawKey == null || rawKey.isBlank()) return;
        String key;
        try {
            key = ProjectService.normalizeShortName(rawKey);
        } catch (IllegalArgumentException e) {
            throw new ToolException(e.getMessage());
        }
        projectService.findByShortName(key)
            .filter(other -> other.getProjectId() != selfId)
            .ifPresent(other -> {
                throw new ToolException("Short name " + key + " is already used by project '"
                    + other.getName() + "'.");
            });
        project.setShortName(key);
    }

    private Project requireProject(int id) {
        return projectService.findById(id)
            .orElseThrow(() -> new ToolException("Project " + id + " not found. Use list_projects to find valid ids."));
    }

    private Sprint requireSprintInProject(int sprintId, int projectId) {
        Sprint sprint = sprintService.findById(sprintId)
            .orElseThrow(() -> new ToolException("Sprint " + sprintId + " not found. Use list_sprints to find valid ids."));
        if (sprint.getProject() != null && sprint.getProject().getProjectId() != projectId) {
            throw new ToolException("Sprint " + sprintId + " belongs to project "
                + sprint.getProject().getProjectId() + ", not project " + projectId + ".");
        }
        return sprint;
    }

    private Employee requireEmployee(int id) {
        Optional<Employee> e = employeeRepository.findById(id);
        return e.orElseThrow(() -> new ToolException("Employee " + id + " not found. Use list_employees to find valid ids."));
    }

    /** Resolves the optional manager "assignee" argument: numeric assigneeId, or assignee name/email/id. */
    private Employee resolveAssigneeArg(JsonNode args) {
        Integer id = optInt(args, "assigneeId");
        if (id != null) return requireEmployee(id);
        String ref = optString(args, "assignee");
        if (ref == null || ref.isBlank()) return null;
        return resolveEmployeeRef(ref.trim());
    }

    /**
     * Resolves an employee reference: a numeric id, an email, or a full/partial
     * name. Throws (listing candidates) when nothing or several match, so the
     * model can't silently invent or mis-assign a person.
     */
    private Employee resolveEmployeeRef(String ref) {
        String trimmed = ref == null ? "" : ref.trim();
        if (trimmed.isEmpty()) throw new ToolException("Empty employee reference.");
        if (trimmed.matches("\\d+")) return requireEmployee(Integer.parseInt(trimmed));

        List<Employee> all = employeeRepository.findAll();

        // Email is unique -> an exact email match wins outright.
        Optional<Employee> byEmail = all.stream()
            .filter(e -> trimmed.equalsIgnoreCase(e.getEmail()))
            .findFirst();
        if (byEmail.isPresent()) return byEmail.get();

        List<Employee> exact = all.stream()
            .filter(e -> fullName(e).equalsIgnoreCase(trimmed))
            .toList();
        List<Employee> matches = !exact.isEmpty() ? exact
            : all.stream()
                .filter(e -> fullName(e).toLowerCase().contains(trimmed.toLowerCase()))
                .toList();
        if (matches.size() == 1) return matches.get(0);

        String catalog = all.stream()
            .map(e -> fullName(e) + " (" + e.getEmail() + ")")
            .collect(java.util.stream.Collectors.joining("; "));
        if (matches.size() > 1) {
            throw new ToolException("Employee reference '" + ref + "' is ambiguous. Employees: " + catalog);
        }
        throw new ToolException("Employee '" + ref + "' not found. Employees: "
            + (catalog.isBlank() ? "(none exist yet)" : catalog));
    }

    private String fullName(Employee e) {
        return (e.getFirstName() + " " + e.getLastName()).trim();
    }

    // ─── JSON serialization helpers ──────────────────────────────────────────

    private ObjectNode taskJson(Task t) {
        ObjectNode n = mapper.createObjectNode();
        n.put("taskId", t.getTaskId());
        if (t.getTicketKey() != null) n.put("ticketKey", t.getTicketKey());
        n.put("title", t.getTitle());
        n.put("status", t.getStatus());
        n.put("priority", t.getPriority());
        if (t.getProject() != null) {
            n.put("projectId", t.getProject().getProjectId());
            n.put("projectName", t.getProject().getName());
        }
        if (t.getSprint() != null) {
            n.put("sprintId", t.getSprint().getSprintId());
            n.put("sprintName", t.getSprint().getName());
        }
        if (t.getAssignee() != null) {
            n.put("assigneeId", t.getAssignee().getEmployeeId());
            n.put("assigneeName", t.getAssignee().getFirstName() + " " + t.getAssignee().getLastName());
        }
        if (t.getStoryPoints() != null) n.put("storyPoints", t.getStoryPoints());
        if (t.getEstimatedHours() != null) n.put("estimatedHours", t.getEstimatedHours().toPlainString());
        if (t.getTotalHours() != null) n.put("actualHours", t.getTotalHours().toPlainString());
        if (t.getStartDate() != null) n.put("startDate", t.getStartDate().toString());
        if (t.getExpectedEndDate() != null) n.put("expectedEndDate", t.getExpectedEndDate().toString());
        if (t.getEndDate() != null) n.put("endDate", t.getEndDate().toString());
        return n;
    }

    private ObjectNode sprintJson(Sprint s) {
        ObjectNode n = mapper.createObjectNode();
        n.put("sprintId", s.getSprintId());
        n.put("name", s.getName());
        n.put("status", s.getStatus());
        if (s.getProject() != null) {
            n.put("projectId", s.getProject().getProjectId());
            n.put("projectName", s.getProject().getName());
        }
        if (s.getGoal() != null) n.put("goal", s.getGoal());
        if (s.getStartDate() != null) n.put("startDate", s.getStartDate().toString());
        if (s.getEndDate() != null) n.put("endDate", s.getEndDate().toString());
        return n;
    }

    private ObjectNode projectJson(Project p) {
        ObjectNode n = mapper.createObjectNode();
        n.put("projectId", p.getProjectId());
        if (p.getShortName() != null) n.put("shortName", p.getShortName());
        n.put("name", p.getName());
        n.put("status", p.getStatus());
        if (p.getDescription() != null) n.put("description", p.getDescription());
        if (p.getStartDate() != null) n.put("startDate", p.getStartDate().toString());
        if (p.getEndDate() != null) n.put("endDate", p.getEndDate().toString());
        return n;
    }

    // ─── Argument parsing helpers ────────────────────────────────────────────

    private String reqString(JsonNode args, String field) {
        String v = optString(args, field);
        if (v == null || v.isBlank()) throw new ToolException("Missing required field: " + field);
        return v;
    }

    private int reqInt(JsonNode args, String field) {
        Integer v = optInt(args, field);
        if (v == null) throw new ToolException("Missing required field: " + field);
        return v;
    }

    private String optString(JsonNode args, String field) {
        return args != null && args.hasNonNull(field) ? args.get(field).asText() : null;
    }

    private Integer optInt(JsonNode args, String field) {
        if (args == null || !args.hasNonNull(field)) return null;
        JsonNode n = args.get(field);
        if (n.isNumber()) return n.asInt();
        try {
            return Integer.parseInt(n.asText().trim());
        } catch (NumberFormatException e) {
            throw new ToolException("Field " + field + " must be an integer, got: " + n.asText());
        }
    }

    private BigDecimal optDecimal(JsonNode args, String field) {
        if (args == null || !args.hasNonNull(field)) return null;
        try {
            return new BigDecimal(args.get(field).asText().trim());
        } catch (NumberFormatException e) {
            throw new ToolException("Field " + field + " must be a number, got: " + args.get(field).asText());
        }
    }

    private LocalDate optDate(JsonNode args, String field) {
        if (args == null || !args.hasNonNull(field)) return null;
        String raw = args.get(field).asText().trim();
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException e) {
            throw new ToolException("Field " + field + " must be an ISO date (YYYY-MM-DD), got: " + raw);
        }
    }

    private String validated(String value, Set<String> allowed, String field, String defaultValue) {
        if (value == null || value.isBlank()) return defaultValue;
        String v = value.trim().toLowerCase();
        if (!allowed.contains(v)) {
            throw new ToolException("Invalid " + field + " '" + value + "'. Allowed: " + String.join(", ", allowed));
        }
        return v;
    }

    private void checkDateOrder(LocalDate start, LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new ToolException("endDate cannot be before startDate.");
        }
    }

    private BigDecimal sumHours(List<Task> tasks, boolean estimated) {
        return tasks.stream()
            .map(t -> estimated ? t.getEstimatedHours() : t.getTotalHours())
            .filter(h -> h != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String generateTempPassword() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) sb.append(alphabet.charAt(random.nextInt(alphabet.length())));
        return sb.toString();
    }

    private String wrap(String field, ArrayNode arr) {
        ObjectNode root = mapper.createObjectNode();
        root.put("count", arr.size());
        root.set(field, arr);
        return root.toString();
    }

    private String okJson(String message, String field, ObjectNode payload) {
        ObjectNode root = mapper.createObjectNode();
        root.put("ok", true);
        root.put("message", message);
        root.set(field, payload);
        return root.toString();
    }

    private String errorJson(String message) {
        ObjectNode root = mapper.createObjectNode();
        root.put("error", message);
        return root.toString();
    }

    // ─── Tool schema builders ────────────────────────────────────────────────

    private interface ParamsBuilder { void build(ObjectNode properties); }

    private ObjectNode tool(String name, String description, ParamsBuilder builder) {
        ObjectNode tool = mapper.createObjectNode();
        tool.put("type", "function");
        ObjectNode fn = tool.putObject("function");
        fn.put("name", name);
        fn.put("description", description);
        ObjectNode params = fn.putObject("parameters");
        params.put("type", "object");
        ObjectNode properties = params.putObject("properties");
        builder.build(properties);
        ArrayNode required = params.putArray("required");
        properties.fields().forEachRemaining(entry -> {
            JsonNode req = entry.getValue().get("x-required");
            if (req != null && req.asBoolean()) {
                required.add(entry.getKey());
                ((ObjectNode) entry.getValue()).remove("x-required");
            }
        });
        return tool;
    }

    private void stringParam(ObjectNode props, String name, String description, boolean required) {
        param(props, name, "string", description, required);
    }

    private void stringArrayParam(ObjectNode props, String name, String description, boolean required) {
        ObjectNode p = param(props, name, "array", description, required);
        p.putObject("items").put("type", "string");
    }

    private void projectParam(ObjectNode props, String description, boolean required) {
        param(props, "project", "string", description
            + " Accepts the project name, its short key (e.g. P1), or its numeric id.", required);
    }

    private void taskParam(ObjectNode props, String description, boolean required) {
        param(props, "task", "string", description
            + " Accepts the ticket key (e.g. P1-7) or the numeric task id.", required);
    }

    private void intParam(ObjectNode props, String name, String description, boolean required) {
        param(props, name, "integer", description, required);
    }

    private void numberParam(ObjectNode props, String name, String description, boolean required) {
        param(props, name, "number", description, required);
    }

    private void dateParam(ObjectNode props, String name, String description, boolean required) {
        param(props, name, "string", description + " ISO format YYYY-MM-DD.", required);
    }

    private void enumParam(ObjectNode props, String name, String description, Set<String> values, boolean required) {
        ObjectNode p = param(props, name, "string", description, required);
        ArrayNode en = p.putArray("enum");
        values.forEach(en::add);
    }

    private ObjectNode param(ObjectNode props, String name, String type, String description, boolean required) {
        ObjectNode p = props.putObject(name);
        p.put("type", type);
        p.put("description", description);
        if (required) p.put("x-required", true);
        return p;
    }
}
