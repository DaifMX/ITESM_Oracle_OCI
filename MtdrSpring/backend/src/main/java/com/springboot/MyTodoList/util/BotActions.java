package com.springboot.MyTodoList.util;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.EmployeeRepository;
import com.springboot.MyTodoList.service.BotAgentService;
import com.springboot.MyTodoList.service.OpenRouterService;
import com.springboot.MyTodoList.service.ProjectService;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TaskService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;
import org.telegram.telegrambots.meta.generics.TelegramClient;

public class BotActions {

    private static final Logger logger = LoggerFactory.getLogger(BotActions.class);

    // ─── Conversation state machine ───────────────────────────────────────────
    private enum ConvState {
        NONE,
        AWAITING_PROJECT_NAME,
        AWAITING_PROJECT_DESCRIPTION,
    }

    // Per-chatId conversation state (survives across messages)
    private static final ConcurrentHashMap<Long, ConvState> stateMap = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<Long, Map<String, String>> dataMap  = new ConcurrentHashMap<>();

    // ─── Instance fields ──────────────────────────────────────────────────────
    private String requestText;
    private long chatId;
    private boolean handled;

    private final TelegramClient telegramClient;
    private final TaskService taskService;
    private final SprintService sprintService;
    private final ProjectService projectService;
    private final EmployeeRepository employeeRepository;
    private final OpenRouterService openRouterService;
    private final BotAgentService botAgentService;

    public BotActions(TelegramClient tc,
                      TaskService ts, SprintService ss, ProjectService ps,
                      EmployeeRepository er, OpenRouterService ors,
                      BotAgentService bas) {
        this.telegramClient = tc;
        this.taskService = ts;
        this.sprintService = ss;
        this.projectService = ps;
        this.employeeRepository = er;
        this.openRouterService = ors;
        this.botAgentService = bas;
        this.handled = false;
    }

    public void setRequestText(String text) { this.requestText = text.trim(); }
    public void setChatId(long id) { this.chatId = id; }

    // ─── Entry point ─────────────────────────────────────────────────────────

    /** Single dispatch method — call this once per incoming message. */
    public void dispatch() {
        // /start, /help and /hide are always available — no auth needed
        if (matches(BotCommands.START_COMMAND)) { fnStart(); return; }
        if (matches(BotCommands.HELP))          { fnHelp();  return; }
        if (matches(BotCommands.HIDE_COMMAND))  { fnHide();  return; }

        // Every other command requires a registered account
        Optional<Employee> empOpt = employeeRepository.findByTelegramChatId(String.valueOf(chatId));
        if (empOpt.isEmpty()) {
            send("🔒 *Access denied*\n\n" +
                 "Your Telegram account is not linked to any user in the system\\.\n" +
                 "Ask your administrator to register your Telegram Chat ID\\.");
            return;
        }
        Employee employee = empOpt.get();

        // If in a conversation flow (e.g. guided project wizard), continue it
        ConvState state = stateMap.getOrDefault(chatId, ConvState.NONE);
        if (state != ConvState.NONE && !requestText.startsWith("/")) {
            handleConversationReply(state, employee);
            return;
        }

        // Commands available to all registered users
        if (matches(BotCommands.MY_TASKS))      { fnMyTasks(employee);      return; }
        if (matches(BotCommands.SPRINT))        { fnActiveSprint(employee); return; }
        if (startsWith(BotCommands.DONE_TASK))  { fnDoneTask();             return; }
        if (matches(BotCommands.LIST_PROJECTS)) { fnListProjects();         return; }
        if (startsWith(BotCommands.LLM_REQ))    { fnLLM();                  return; }
        if (startsWith(BotCommands.ASK))         { fnAsk(employee);          return; }

        // Commands restricted to managers and admins
        if (startsWith(BotCommands.NEW_PROJECT) || startsWith(BotCommands.NEW_SPRINT)) {
            if (!isManagerOrAdmin(employee)) {
                send("⛔ *Permission denied*\n\nThis command is only available to managers and admins\\.");
                return;
            }
            if (startsWith(BotCommands.NEW_PROJECT)) { fnNewProject(); return; }
            if (startsWith(BotCommands.NEW_SPRINT))  { fnNewSprint();  return; }
        }

        send("❓ Unknown command\\. Type /help to see available commands\\.");
    }

    private static boolean isManagerOrAdmin(Employee emp) {
        String role = emp.getRole();
        return "manager".equals(role) || "admin".equals(role);
    }

    // ─── /start ──────────────────────────────────────────────────────────────

    private void fnStart() {
        String welcome = "👋 *Welcome to the Project Manager Bot\\!*\n\n" +
                "I help you manage your agile projects right from Telegram\\.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "📋  /mytasks — view your tasks\n" +
                "🏃  /sprint — active sprints\n" +
                "📁  /listprojects — all projects\n" +
                "🤖  /ask — AI assistant\n" +
                "━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Use the keyboard below or type /help for more\\.";

        send(welcome, ReplyKeyboardMarkup.builder()
                .resizeKeyboard(true)
                .keyboardRow(new KeyboardRow("/mytasks", "/sprint"))
                .keyboardRow(new KeyboardRow("/listprojects", "/newproject"))
                .keyboardRow(new KeyboardRow("/ask", "/help"))
                .keyboardRow(new KeyboardRow("/hide"))
                .build());
    }

    // ─── /help ───────────────────────────────────────────────────────────────

    private void fnHelp() {
        String help = "📖 *Help \\— All Commands*\n\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "📋 *Tasks*\n" +
                "  /mytasks — view your assigned tasks\n" +
                "  /done `<taskId>` — mark a task as done\n\n" +
                "🏃 *Sprints*\n" +
                "  /sprint — view your active sprints\n" +
                "  /newsprint `<projectId>` `<name>` — create a sprint\n\n" +
                "📁 *Projects*\n" +
                "  /listprojects — view all projects\n" +
                "  /newproject — guided project creation\n" +
                "  /newproject `<name>` — quick create\n\n" +
                "🤖 *AI Assistant*\n" +
                "  /ask `<question>` — smart agent \\(uses your data\\)\n" +
                "  /llm `<prompt>` — direct LLM prompt\n\n" +
                "⚙️ *Other*\n" +
                "  /start — main menu\n" +
                "  /hide — hide keyboard\n" +
                "━━━━━━━━━━━━━━━━━━━━";
        send(help);
    }

    // ─── /hide ───────────────────────────────────────────────────────────────

    private void fnHide() {
        clearState();
        // BotHelper default overload already uses ReplyKeyboardRemove(true)
        send("👋 Keyboard hidden\\. Type /start to show it again\\.");
    }

    // ─── /mytasks ────────────────────────────────────────────────────────────

    private void fnMyTasks(Employee employee) {
        List<Task> tasks = taskService.findByAssignee(employee.getEmployeeId());

        if (tasks.isEmpty()) {
            send("🎉 *No tasks\\!* You have no tasks assigned right now\\.");
            return;
        }

        StringBuilder sb = new StringBuilder("📋 *Your Tasks* \\(").append(tasks.size()).append("\\)\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━\n\n");
        for (Task t : tasks) {
            sb.append(statusEmoji(t.getStatus())).append(" *\\#").append(t.getTaskId())
              .append(" \\— ").append(escapeMarkdown(t.getTitle())).append("*\n");
            sb.append("     ").append(priorityLabel(t.getPriority()));
            if (t.getStoryPoints() != null) sb.append(" \\| SP: `").append(t.getStoryPoints()).append("`");
            if (t.getEstimatedHours() != null) sb.append(" \\| Est: `").append(t.getEstimatedHours()).append("h`");
            sb.append("\n");
            if (t.getSprint() != null) sb.append("     🏃 ").append(escapeMarkdown(t.getSprint().getName()));
            if (t.getExpectedEndDate() != null) sb.append(" \\| 📅 Due: `").append(t.getExpectedEndDate()).append("`");
            if (t.getSprint() != null || t.getExpectedEndDate() != null) sb.append("\n");
            sb.append("\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━\n");
        sb.append("💡 Use `/done <taskId>` to complete a task");
        send(sb.toString());
    }

    // ─── /sprint ─────────────────────────────────────────────────────────────

    private void fnActiveSprint(Employee employee) {
        List<Sprint> activeSprints = sprintService.findByStatus("active");
        if (activeSprints.isEmpty()) {
            send("📅 No active sprints right now\\.");
            return;
        }

        List<Task> myTasks = taskService.findByAssignee(employee.getEmployeeId());

        StringBuilder sb = new StringBuilder("🏃 *Active Sprints*\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━\n\n");
        for (Sprint s : activeSprints) {
            sb.append("🔵 *").append(escapeMarkdown(s.getName())).append("*");
            if (s.getProject() != null)
                sb.append(" — ").append(escapeMarkdown(s.getProject().getName()));
            sb.append("\n");
            if (s.getGoal() != null) sb.append("     🎯 ").append(escapeMarkdown(s.getGoal())).append("\n");
            if (s.getStartDate() != null || s.getEndDate() != null) {
                sb.append("     📅 ");
                if (s.getStartDate() != null) sb.append(escapeMarkdown(s.getStartDate().toString()));
                if (s.getStartDate() != null && s.getEndDate() != null) sb.append(" → ");
                if (s.getEndDate() != null) sb.append(escapeMarkdown(s.getEndDate().toString()));
                sb.append("\n");
            }

            long myCount = myTasks.stream()
                    .filter(t -> t.getSprint() != null
                            && t.getSprint().getSprintId() == s.getSprintId())
                    .count();
            if (myCount > 0) sb.append("     📋 Your tasks: ").append(myCount).append("\n");
            sb.append("\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━");
        send(sb.toString());
    }

    // ─── /done <taskId> ──────────────────────────────────────────────────────

    private void fnDoneTask() {
        String[] parts = requestText.trim().split("\\s+");
        if (parts.length < 2) {
            send("Usage: `/done <taskId>`\nExample: `/done 42`");
            return;
        }
        try {
            int taskId = Integer.parseInt(parts[1]);
            Optional<Task> taskOpt = taskService.findById(taskId);
            if (taskOpt.isEmpty()) {
                send("❌ Task \\#" + taskId + " not found\\.");
                return;
            }
            Task task = taskOpt.get();
            if ("done".equals(task.getStatus())) {
                send("ℹ️ Task *" + escapeMarkdown(task.getTitle()) + "* is already done\\.");
                return;
            }
            task.setStatus("done");
            taskService.update(taskId, task);
            send("🎉 *Task completed\\!*\n\n" +
                 "✅ *\\#" + taskId + " \\— " + escapeMarkdown(task.getTitle()) + "*\n\n" +
                 "Great work\\! Keep it up 💪");
        } catch (NumberFormatException e) {
            send("❌ Invalid task ID\\. Usage: `/done <taskId>`");
        }
    }

    // ─── /listprojects ───────────────────────────────────────────────────────

    private void fnListProjects() {
        List<Project> projects = projectService.findAll();
        if (projects.isEmpty()) {
            send("📁 No projects yet\\. Use /newproject to create one\\.");
            return;
        }
        StringBuilder sb = new StringBuilder("📁 *Projects* \\(").append(projects.size()).append("\\)\n");
        sb.append("━━━━━━━━━━━━━━━━━━━━\n\n");
        for (Project p : projects) {
            sb.append(projectEmoji(p.getStatus()))
              .append(" *\\#").append(p.getProjectId())
              .append(" \\— ").append(escapeMarkdown(p.getName())).append("*\n");
            sb.append("     Status: `").append(p.getStatus()).append("`");
            if (p.getStartDate() != null) sb.append(" \\| Start: `").append(p.getStartDate()).append("`");
            if (p.getEndDate() != null) sb.append(" \\| End: `").append(p.getEndDate()).append("`");
            sb.append("\n\n");
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━\n");
        sb.append("💡 Use `/newsprint <projectId> <name>` to add a sprint");
        send(sb.toString());
    }

    // ─── /newproject [name] ───────────────────────────────────────────────────

    private void fnNewProject() {
        String[] parts = requestText.split("\\s+", 2);
        if (parts.length >= 2 && !parts[1].isBlank()) {
            // Inline: /newproject My Project Name
            createProject(parts[1].trim(), null);
        } else {
            // Start guided wizard
            stateMap.put(chatId, ConvState.AWAITING_PROJECT_NAME);
            dataMap.put(chatId, new HashMap<>());
            send("📁 *New Project*\n\nPlease enter the project name:");
        }
    }

    // ─── /newsprint <projectId> <name> ───────────────────────────────────────

    private void fnNewSprint() {
        String[] parts = requestText.split("\\s+", 3);
        if (parts.length < 3) {
            send("Usage: `/newsprint <projectId> <name>`\nExample: `/newsprint 1 Sprint 1`");
            return;
        }
        try {
            int projectId = Integer.parseInt(parts[1]);
            String sprintName = parts[2].trim();

            Optional<Project> projOpt = projectService.findById(projectId);
            if (projOpt.isEmpty()) {
                send("❌ Project \\#" + projectId + " not found\\. Use /listprojects to see all projects\\.");
                return;
            }

            Sprint sprint = new Sprint();
            sprint.setName(sprintName);
            sprint.setStatus("planned");
            sprint.setProject(projOpt.get());
            Sprint saved = sprintService.save(sprint);

            send("🎉 *Sprint created\\!*\n\n" +
                    "🏃 *" + escapeMarkdown(saved.getName()) + "*\n" +
                    "     📁 Project: " + escapeMarkdown(projOpt.get().getName()) + "\n" +
                    "     🆔 Sprint ID: `" + saved.getSprintId() + "`\n" +
                    "     📊 Status: `planned`");
        } catch (NumberFormatException e) {
            send("❌ Invalid project ID\\. Usage: `/newsprint <projectId> <name>`");
        }
    }

    // ─── /llm <prompt> ───────────────────────────────────────────────────────

    private void fnLLM() {
        String[] parts = requestText.split("\\s+", 2);
        String prompt = parts.length >= 2 ? parts[1] : "What can you do?";
        String out = "<no response>";
        try {
            out = openRouterService.generateText(prompt);
        } catch (Exception e) {
            logger.error("LLM error", e);
        }
        send("🤖 " + out);
    }

    // ─── /ask <question> — smart agent ───────────────────────────────────────

    private void fnAsk(Employee employee) {
        String[] parts = requestText.split("\\s+", 2);
        if (parts.length < 2 || parts[1].isBlank()) {
            send("Usage: `/ask <question>`\n" +
                 "Example: `/ask What tasks should I prioritize this sprint?`");
            return;
        }
        String question = parts[1].trim();
        send("🔍 Analyzing your data\\.\\.\\. please wait\\.");
        String answer = botAgentService.processQuery(employee, question);
        send("🤖 " + escapeMarkdown(answer));
    }

    // ─── Conversation reply handler ──────────────────────────────────────────

    private void handleConversationReply(ConvState state, Employee employee) {
        Map<String, String> data = dataMap.getOrDefault(chatId, new HashMap<>());

        switch (state) {
            case AWAITING_PROJECT_NAME -> {
                data.put("name", requestText);
                dataMap.put(chatId, data);
                stateMap.put(chatId, ConvState.AWAITING_PROJECT_DESCRIPTION);
                send("Got it\\! Now enter a description \\(or send `/skip` to leave it empty\\):");
            }
            case AWAITING_PROJECT_DESCRIPTION -> {
                String description = requestText.equals("/skip") ? null : requestText;
                String name = data.get("name");
                clearState();
                createProject(name, description);
            }
            default -> {
                clearState();
                send("❓ Unexpected input\\. Type /start to return to the main menu\\.");
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void createProject(String name, String description) {
        try {
            Project project = new Project();
            project.setName(name);
            project.setDescription(description);
            project.setStatus("planning");
            Project saved = projectService.save(project);
            send("🎉 *Project created\\!*\n\n" +
                    "📁 *" + escapeMarkdown(saved.getName()) + "*\n" +
                    "     🆔 ID: `" + saved.getProjectId() + "`\n" +
                    "     📊 Status: `planning`\n\n" +
                    "💡 Next: `/newsprint " + saved.getProjectId() + " Sprint 1` to create your first sprint");
        } catch (Exception e) {
            logger.error("Error creating project", e);
            send("❌ Failed to create project\\. Please try again\\.");
        }
    }

    private void clearState() {
        stateMap.remove(chatId);
        dataMap.remove(chatId);
    }

    private boolean matches(BotCommands cmd) {
        // Strip optional @BotName suffix (e.g. /help@MyBot -> /help)
        String text = requestText.replaceFirst("@\\S+$", "").trim();
        return text.equalsIgnoreCase(cmd.getCommand());
    }

    private boolean startsWith(BotCommands cmd) {
        // Strip optional @BotName suffix before checking prefix
        String text = requestText.replaceFirst("@\\S+", "").trim();
        return text.toLowerCase().startsWith(cmd.getCommand().toLowerCase());
    }

    private void send(String text) {
        BotHelper.sendMessageToTelegram(chatId, text, telegramClient);
    }

    private void send(String text, ReplyKeyboardMarkup keyboard) {
        BotHelper.sendMessageToTelegram(chatId, text, telegramClient, keyboard);
    }

    private static String statusEmoji(String status) {
        if (status == null) return "⬜";
        return switch (status.toLowerCase()) {
            case "todo"        -> "�";
            case "in_progress" -> "🔄";
            case "done"        -> "✅";
            case "blocked"     -> "🚫";
            default            -> "⬜";
        };
    }

    private static String priorityLabel(String priority) {
        if (priority == null) return "⬜ unknown";
        return switch (priority.toLowerCase()) {
            case "high"   -> "🔴 High";
            case "medium" -> "🟡 Medium";
            case "low"    -> "🟢 Low";
            default       -> "⬜ " + priority;
        };
    }

    private static String projectEmoji(String status) {
        if (status == null) return "📁";
        return switch (status.toLowerCase()) {
            case "active"    -> "🟢";
            case "completed" -> "✅";
            case "on_hold"   -> "⏸";
            default          -> "📁";
        };
    }

    /** Escape special Markdown v2 characters for Telegram. */
    private static String escapeMarkdown(String text) {
        if (text == null) return "";
        return text.replaceAll("([_*\\[\\]()~`>#+\\-=|{}.!])", "\\\\$1");
    }
}
