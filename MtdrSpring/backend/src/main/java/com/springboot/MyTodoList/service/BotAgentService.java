package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.EmployeeRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Natural-language agent that gathers project data scoped to the caller's
 * role and asks the LLM to answer the question.
 *
 * - Developers only see their own tasks/sprints.
 * - Managers/admins see everything (all employees, tasks, sprints, projects).
 */
@Service
public class BotAgentService {

    private static final Logger logger = LoggerFactory.getLogger(BotAgentService.class);

    private final OpenRouterService openRouterService;
    private final TaskService taskService;
    private final SprintService sprintService;
    private final ProjectService projectService;
    private final EmployeeRepository employeeRepository;

    public BotAgentService(OpenRouterService openRouterService,
                           TaskService taskService,
                           SprintService sprintService,
                           ProjectService projectService,
                           EmployeeRepository employeeRepository) {
        this.openRouterService = openRouterService;
        this.taskService = taskService;
        this.sprintService = sprintService;
        this.projectService = projectService;
        this.employeeRepository = employeeRepository;
    }

    public String processQuery(Employee employee, String query) {
        boolean isManager = "manager".equals(employee.getRole())
                         || "admin".equals(employee.getRole());

        String context = isManager ? buildManagerContext() : buildDeveloperContext(employee);
        String systemPrompt = buildSystemPrompt(employee, isManager);

        String userMessage = "=== DATA ===\n" + context + "\n=== QUESTION ===\n" + query;

        try {
            return openRouterService.chat(systemPrompt, userMessage);
        } catch (Exception e) {
            logger.error("Agent LLM call failed", e);
            return "Sorry, I couldn't process your request right now. Please try again later.";
        }
    }

    // ─── System prompt ───────────────────────────────────────────────────────

    private String buildSystemPrompt(Employee employee, boolean isManager) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a concise project-management assistant embedded in a Telegram bot.\n");
        sb.append("The user's name is ").append(employee.getFirstName()).append(" ")
          .append(employee.getLastName()).append(", role: ").append(employee.getRole()).append(".\n");

        if (isManager) {
            sb.append("The user is a manager/admin and can see ALL data across the organization.\n");
            sb.append("You can answer questions about any employee, task, sprint, or project.\n");
        } else {
            sb.append("The user is a developer. You can ONLY see their own tasks and related sprints/projects.\n");
            sb.append("Do NOT invent data about other employees.\n");
        }

        sb.append("\nRules:\n");
        sb.append("- Answer ONLY based on the DATA section provided. Never invent data.\n");
        sb.append("- Be concise — short paragraphs or bullet lists.\n");
        sb.append("- Use plain text only (no Markdown, no asterisks, no backticks).\n");
        sb.append("- NEVER use Key:Value or Key: Value format. Write naturally like a human.\n");
        sb.append("- If the data doesn't contain enough information to answer, say so.\n");
        sb.append("- Answer in the same language the user writes in.\n");
        sb.append("\nFormatting guidelines:\n");
        sb.append("- Use emojis to make the output visually clear and scannable.\n");
        sb.append("- Status emojis: in_progress = 🔄, todo = 📋, done = ✅, blocked = 🚫\n");
        sb.append("- Priority emojis: high = 🔴, medium = 🟡, low = 🟢\n");
        sb.append("- When listing tasks, format each like:\n");
        sb.append("  [status emoji] #ID Title\n");
        sb.append("     [priority emoji] priority  |  X story points  |  ~Xh estimated\n");
        sb.append("     Sprint name  |  Due date\n");
        sb.append("- Separate items with a blank line.\n");
        sb.append("- Use section headers with emojis (e.g. '📌 Your Active Tasks').\n");
        sb.append("- Write conversationally. Don't just dump data — present it clearly.\n");
        sb.append("- Keep it clean and easy to read on a phone screen.\n");
        return sb.toString();
    }

    // ─── Developer context (own data only) ───────────────────────────────────

    private String buildDeveloperContext(Employee employee) {
        StringBuilder sb = new StringBuilder();
        int empId = employee.getEmployeeId();

        // Own tasks
        List<Task> myTasks = taskService.findByAssignee(empId);
        sb.append("[MY TASKS]\n");
        if (myTasks.isEmpty()) {
            sb.append("No tasks assigned.\n");
        } else {
            for (Task t : myTasks) {
                appendTask(sb, t);
            }
        }

        // Active sprints that contain my tasks
        List<Sprint> activeSprints = sprintService.findByStatus("active");
        sb.append("\n[ACTIVE SPRINTS]\n");
        if (activeSprints.isEmpty()) {
            sb.append("No active sprints.\n");
        } else {
            for (Sprint s : activeSprints) {
                long myCount = myTasks.stream()
                        .filter(t -> t.getSprint() != null
                                && t.getSprint().getSprintId() == s.getSprintId())
                        .count();
                if (myCount > 0) {
                    appendSprint(sb, s);
                    sb.append("  My tasks in this sprint: ").append(myCount).append("\n");
                }
            }
        }

        // Projects related to my tasks
        sb.append("\n[MY PROJECTS]\n");
        myTasks.stream()
                .map(Task::getProject)
                .filter(p -> p != null)
                .collect(Collectors.toMap(Project::getProjectId, p -> p, (a, b) -> a))
                .values()
                .forEach(p -> appendProject(sb, p));

        return sb.toString();
    }

    // ─── Manager context (everything) ────────────────────────────────────────

    private String buildManagerContext() {
        StringBuilder sb = new StringBuilder();

        // All employees
        List<Employee> employees = employeeRepository.findAll();
        sb.append("[EMPLOYEES]\n");
        for (Employee e : employees) {
            sb.append("ID:").append(e.getEmployeeId())
              .append(" Name:").append(e.getFirstName()).append(" ").append(e.getLastName())
              .append(" Role:").append(e.getRole())
              .append(" Position:").append(e.getPosition())
              .append("\n");
        }

        // All tasks grouped by status
        List<Task> allTasks = taskService.findAll();
        sb.append("\n[ALL TASKS] (total: ").append(allTasks.size()).append(")\n");
        Map<String, List<Task>> byStatus = allTasks.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus() != null ? t.getStatus() : "unknown"));
        for (Map.Entry<String, List<Task>> entry : byStatus.entrySet()) {
            sb.append("-- Status: ").append(entry.getKey())
              .append(" (").append(entry.getValue().size()).append(" tasks) --\n");
            for (Task t : entry.getValue()) {
                appendTask(sb, t);
            }
        }

        // All sprints
        List<Sprint> sprints = sprintService.findAll();
        sb.append("\n[ALL SPRINTS]\n");
        for (Sprint s : sprints) {
            appendSprint(sb, s);
        }

        // All projects
        List<Project> projects = projectService.findAll();
        sb.append("\n[ALL PROJECTS]\n");
        for (Project p : projects) {
            appendProject(sb, p);
        }

        return sb.toString();
    }

    // ─── Formatting helpers ──────────────────────────────────────────────────

    private void appendTask(StringBuilder sb, Task t) {
        sb.append("#").append(t.getTaskId())
          .append(" \"").append(t.getTitle()).append("\"");
        sb.append(" (").append(t.getStatus()).append(", ").append(t.getPriority()).append(" priority)");
        if (t.getStoryPoints() != null) sb.append(", ").append(t.getStoryPoints()).append(" story points");
        if (t.getEstimatedHours() != null) sb.append(", ~").append(t.getEstimatedHours()).append("h estimated");
        if (t.getAssignee() != null) {
            sb.append(", assigned to ").append(t.getAssignee().getFirstName())
              .append(" ").append(t.getAssignee().getLastName());
        } else {
            sb.append(", unassigned");
        }
        if (t.getSprint() != null) sb.append(", in ").append(t.getSprint().getName());
        if (t.getProject() != null) sb.append(", project \"").append(t.getProject().getName()).append("\"");
        if (t.getExpectedEndDate() != null) sb.append(", due ").append(t.getExpectedEndDate());
        if (t.getDescription() != null && !t.getDescription().isBlank()) {
            sb.append("\n  Description: ").append(t.getDescription());
        }
        sb.append("\n");
    }

    private void appendSprint(StringBuilder sb, Sprint s) {
        sb.append("\"").append(s.getName()).append("\" (ID #").append(s.getSprintId()).append(")");
        sb.append(" — ").append(s.getStatus());
        if (s.getProject() != null) sb.append(", project \"").append(s.getProject().getName()).append("\"");
        if (s.getStartDate() != null && s.getEndDate() != null) {
            sb.append(", ").append(s.getStartDate()).append(" to ").append(s.getEndDate());
        } else if (s.getEndDate() != null) {
            sb.append(", ends ").append(s.getEndDate());
        }
        if (s.getGoal() != null) sb.append(", goal: ").append(s.getGoal());
        sb.append("\n");
    }

    private void appendProject(StringBuilder sb, Project p) {
        sb.append("\"").append(p.getName()).append("\" (ID #").append(p.getProjectId()).append(")");
        sb.append(" — ").append(p.getStatus());
        if (p.getStartDate() != null && p.getEndDate() != null) {
            sb.append(", ").append(p.getStartDate()).append(" to ").append(p.getEndDate());
        } else if (p.getEndDate() != null) {
            sb.append(", ends ").append(p.getEndDate());
        }
        sb.append("\n");
    }
}
