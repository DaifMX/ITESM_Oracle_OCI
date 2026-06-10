package com.springboot.MyTodoList.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.springboot.MyTodoList.dto.ChatMessage;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.rag.RagRetriever;
import com.springboot.MyTodoList.rag.RagRetriever.RetrievedChunk;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * RAG-backed agentic chat: embeds the user's question, pulls the top-K
 * relevant chunks from RAG_CHUNK (role-scoped in SQL), and runs a
 * function-calling loop so the LLM can both answer from retrieved context
 * and take actions (create/edit tasks, sprints, projects, register
 * employees, compute project insights) via AgentToolService.
 *
 * Every tool execution re-checks the caller's role server-side, so the
 * model cannot escalate privileges no matter what it calls.
 */
@Service
public class BotAgentService {

    private static final Logger logger = LoggerFactory.getLogger(BotAgentService.class);

    /** Hard stop for the tool loop so a confused model can't spin forever. */
    private static final int MAX_TOOL_ROUNDS = 6;

    /** How many prior conversation turns are replayed to the LLM. */
    private static final int MAX_HISTORY_MESSAGES = 12;

    private final OpenRouterService openRouterService;
    private final RagRetriever ragRetriever;
    private final AgentToolService agentToolService;
    private final ObjectMapper mapper = new ObjectMapper();
    private final int topK;

    public BotAgentService(OpenRouterService openRouterService,
                           RagRetriever ragRetriever,
                           AgentToolService agentToolService,
                           @Value("${rag.retrieval.top-k:8}") int topK) {
        this.openRouterService = openRouterService;
        this.ragRetriever = ragRetriever;
        this.agentToolService = agentToolService;
        this.topK = topK;
    }

    public String processQuery(Employee employee, String query) {
        return processQuery(employee, query, null);
    }

    public String processQuery(Employee employee, String query, List<ChatMessage> history) {
        boolean isManager = "manager".equals(employee.getRole())
                         || "admin".equals(employee.getRole());

        String context = retrieveContext(employee, query, isManager);

        ArrayNode messages = mapper.createArrayNode();

        ObjectNode sysMsg = messages.addObject();
        sysMsg.put("role", "system");
        sysMsg.put("content", buildSystemPrompt(employee, isManager));

        appendHistory(messages, history);

        ObjectNode usrMsg = messages.addObject();
        usrMsg.put("role", "user");
        usrMsg.put("content", "=== RETRIEVED CONTEXT ===\n" + context +
                              "\n=== QUESTION ===\n" + query);

        ArrayNode tools = agentToolService.toolDefinitions(isManager);

        try {
            for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
                JsonNode assistantMsg = openRouterService.chatCompletion(messages, tools);
                JsonNode toolCalls = assistantMsg.path("tool_calls");

                if (!toolCalls.isArray() || toolCalls.isEmpty()) {
                    String content = assistantMsg.path("content").asText("");
                    return content.isBlank()
                        ? "Sorry, I couldn't produce an answer for that. Please rephrase your request."
                        : content;
                }

                // Replay the assistant message (with its tool_calls) and append
                // one tool-result message per call, then ask the model again.
                messages.add(assistantMsg.deepCopy());

                for (JsonNode call : toolCalls) {
                    String callId = call.path("id").asText("");
                    String name = call.path("function").path("name").asText("");
                    JsonNode args = parseArguments(call.path("function").path("arguments").asText("{}"));

                    logger.info("Chat agent executing tool '{}' for {} ({})",
                                name, employee.getEmail(), employee.getRole());
                    String result = agentToolService.execute(name, args, employee);

                    ObjectNode toolMsg = messages.addObject();
                    toolMsg.put("role", "tool");
                    toolMsg.put("tool_call_id", callId);
                    toolMsg.put("name", name);
                    toolMsg.put("content", result);
                }
            }
            return "I started working on that but it needed too many steps. " +
                   "Anything already created or updated was reported above -- " +
                   "please ask me to continue or verify the result.";
        } catch (Exception e) {
            logger.error("Agent LLM call failed", e);
            return "Sorry, I couldn't process your request right now. Please try again later.";
        }
    }

    private String retrieveContext(Employee employee, String query, boolean isManager) {
        List<RetrievedChunk> chunks;
        try {
            chunks = ragRetriever.search(query, topK, employee, isManager);
        } catch (Exception e) {
            logger.error("RAG retrieval failed", e);
            return "(project data search is temporarily unavailable -- rely on the list/insight tools instead)";
        }

        if (logger.isDebugEnabled()) {
            logger.debug("Retrieved {} chunks for query '{}' (manager={}):",
                         chunks.size(), query, isManager);
            for (RetrievedChunk c : chunks) {
                logger.debug("  - {} #{} dist={}",
                             c.sourceType(), c.sourceId(), c.distance());
            }
        }

        String context = chunks.stream()
            .map(RetrievedChunk::content)
            .collect(Collectors.joining("\n\n---\n\n"));
        return context.isBlank()
            ? "(no relevant project data was found for this question)"
            : context;
    }

    private void appendHistory(ArrayNode messages, List<ChatMessage> history) {
        if (history == null || history.isEmpty()) return;
        List<ChatMessage> recent = history.size() > MAX_HISTORY_MESSAGES
            ? history.subList(history.size() - MAX_HISTORY_MESSAGES, history.size())
            : history;
        for (ChatMessage m : recent) {
            if (m == null || m.getContent() == null || m.getContent().isBlank()) continue;
            if (!Set.of("user", "assistant").contains(m.getRole())) continue;
            ObjectNode msg = messages.addObject();
            msg.put("role", m.getRole());
            msg.put("content", m.getContent());
        }
    }

    private JsonNode parseArguments(String rawArguments) {
        try {
            return mapper.readTree(rawArguments == null || rawArguments.isBlank() ? "{}" : rawArguments);
        } catch (Exception e) {
            logger.warn("Tool call had unparseable arguments: {}", rawArguments);
            return mapper.createObjectNode();
        }
    }

    private String buildSystemPrompt(Employee employee, boolean isManager) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a concise project-management assistant with the ability to take actions.\n");
        sb.append("Today's date is ").append(LocalDate.now()).append(".\n");
        sb.append("The user's name is ").append(employee.getFirstName()).append(" ")
          .append(employee.getLastName()).append(" (employee id ").append(employee.getEmployeeId())
          .append("), role: ").append(employee.getRole()).append(".\n");

        if (isManager) {
            sb.append("The user is a manager/admin and can see ALL data across the organization.\n");
            sb.append("They can create and modify tasks, sprints and projects, reassign tasks, ")
              .append("register new employees, and request aggregated project insights.\n");
        } else {
            sb.append("The user is a developer. The retrieved context only includes tasks ")
              .append("they are assigned to, plus organizational sprints/projects.\n");
            sb.append("They can create tasks (always assigned to themselves) and edit tasks ")
              .append("assigned to them. They can NOT modify sprints, projects, other people's ")
              .append("tasks, or register employees -- politely refuse such requests.\n");
            sb.append("Do NOT invent data about other employees or tasks not in the context.\n");
            sb.append("The user can only be registered on a single project and sprint at the same time.");
        }

        sb.append("\nTool usage rules:\n");
        sb.append("- Use the tools to take actions and to fetch precise or aggregated data. ")
          .append("The RETRIEVED CONTEXT is a semantic search result and may be incomplete; ")
          .append("when the user asks for exact lists, counts or analytics, prefer the tools.\n");
        sb.append("- Users refer to projects by NAME or short key (e.g. P1) and to tasks by ")
          .append("ticket key (e.g. P1-7). Tools accept those directly -- NEVER ask the user ")
          .append("for a numeric id. If a name is unknown or ambiguous, look it up with ")
          .append("list_projects / list_tasks yourself and only ask the user to choose ")
          .append("between candidates when several genuinely match.\n");
        sb.append("- Never invent ids or keys. If you don't know one, look it up first with ")
          .append("the list tools.\n");
        sb.append("- Dates passed to tools must be ISO format (YYYY-MM-DD). Resolve relative ")
          .append("dates like 'next Friday' using today's date.\n");
        sb.append("- Before destructive or sweeping changes (reassigning many tasks, changing ")
          .append("project status, registering accounts), confirm with the user unless the ")
          .append("request is already explicit.\n");
        sb.append("- If a tool returns an error, fix your call if possible; otherwise explain ")
          .append("the problem to the user in plain words.\n");
        sb.append("- The conversation history above is authoritative for follow-ups. When the user ")
          .append("says 'it', 'that', 'this task', 'the one', 'the task you just created/updated', or ")
          .append("otherwise refers back without giving a key, resolve the reference to the most ")
          .append("recently created or discussed task in this conversation and act on it directly. ")
          .append("Do NOT ask for the ticket key when the history already makes the referent clear -- ")
          .append("you summarized that task by its key in a previous turn, so reuse that key.\n");
        sb.append("- Only ask the user to clarify which task they mean when there is genuinely no ")
          .append("recent referent in the conversation, or when several tasks plausibly match.\n");
        sb.append("- If a request is genuinely ambiguous, consider the user's current context: analyze ")
          .append("what they are working on and try to precisely infer what they mean. If you still ")
          .append("cannot tell, ask the user.\n");
        sb.append("- When the user gives only a brief description and omits a field like title or ")
          .append("description, infer a sensible value from what they said and state the assumption ")
          .append("you made rather than blocking on a question.\n");
        sb.append("- After performing actions, summarize exactly what was done, referring to ")
          .append("tasks by ticket key (e.g. P1-7) and projects by name.\n");


        sb.append("\nAnswering rules:\n");
        sb.append("- Answer questions ONLY from the RETRIEVED CONTEXT or from tool results. ")
          .append("If neither contains enough information, say so plainly. Do NOT guess.\n");
        sb.append("- The context contains entries prefixed with [TASK #id | KEY-N], [SPRINT #id], ")
          .append("or [PROJECT #id | KEY]. Prefer the ticket key (e.g. P1-7) when referring to ")
          .append("tasks and the short key or name for projects.\n");
        sb.append("- Be concise -- short paragraphs or bullet lists.\n");
        sb.append("- Use plain text only (no Markdown, no asterisks, no backticks).\n");
        sb.append("- NEVER use Key:Value or Key: Value format. Write naturally like a human.\n");
        sb.append("- Answer in the same language the user writes in.\n");

        sb.append("\nFormatting guidelines:\n");
        sb.append("- Use emojis to make the output visually clear and scannable.\n");
        sb.append("- Status emojis: in_progress = 🔄, todo = 📋, done = ✅, blocked = 🚫\n");
        sb.append("- Priority emojis: high = 🔴, medium = 🟡, low = 🟢\n");
        sb.append("- When listing tasks, format each like:\n");
        sb.append("  [status emoji] TICKET-KEY Title   (e.g. 🔄 P1-7 Fix login redirect)\n");
        sb.append("     [priority emoji] priority  |  X story points  |  ~Xh estimated\n");
        sb.append("     Sprint name  |  Due date\n");
        sb.append("- Separate items with a blank line.\n");
        sb.append("- Use section headers with emojis (e.g. '📌 Your Active Tasks').\n");
        sb.append("- Write conversationally. Don't just dump data -- present it clearly.\n");
        sb.append("- Keep it clean and easy to read on a phone screen.\n");
        return sb.toString();
    }
}
