package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.rag.RagRetriever;
import com.springboot.MyTodoList.rag.RagRetriever.RetrievedChunk;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * RAG-backed chat agent: embeds the user's question, pulls the top-K
 * relevant chunks from RAG_CHUNK (role-scoped in SQL), and asks the LLM
 * to answer using ONLY that retrieved context.
 *
 * Replaces the previous full-context-dump implementation, which sent
 * every task/sprint/project the user could see to the LLM on every turn.
 */
@Service
public class BotAgentService {

    private static final Logger logger = LoggerFactory.getLogger(BotAgentService.class);

    private final OpenRouterService openRouterService;
    private final RagRetriever ragRetriever;
    private final int topK;

    public BotAgentService(OpenRouterService openRouterService,
                           RagRetriever ragRetriever,
                           @Value("${rag.retrieval.top-k:8}") int topK) {
        this.openRouterService = openRouterService;
        this.ragRetriever = ragRetriever;
        this.topK = topK;
    }

    public String processQuery(Employee employee, String query) {
        boolean isManager = "manager".equals(employee.getRole())
                         || "admin".equals(employee.getRole());

        List<RetrievedChunk> chunks;
        try {
            chunks = ragRetriever.search(query, topK, employee, isManager);
        } catch (Exception e) {
            logger.error("RAG retrieval failed", e);
            return "Sorry, I couldn't search the project data right now. Please try again later.";
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
        if (context.isBlank()) {
            context = "(no relevant project data was found for this question)";
        }

        String systemPrompt = buildSystemPrompt(employee, isManager);
        String userMessage = "=== RETRIEVED CONTEXT ===\n" + context +
                             "\n=== QUESTION ===\n" + query;

        try {
            return openRouterService.chat(systemPrompt, userMessage);
        } catch (Exception e) {
            logger.error("Agent LLM call failed", e);
            return "Sorry, I couldn't process your request right now. Please try again later.";
        }
    }

    private String buildSystemPrompt(Employee employee, boolean isManager) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a concise project-management assistant embedded in a Telegram bot.\n");
        sb.append("The user's name is ").append(employee.getFirstName()).append(" ")
          .append(employee.getLastName()).append(", role: ").append(employee.getRole()).append(".\n");

        if (isManager) {
            sb.append("The user is a manager/admin and can see ALL data across the organization.\n");
        } else {
            sb.append("The user is a developer. The retrieved context only includes tasks ")
              .append("they are assigned to, plus organizational sprints/projects.\n");
            sb.append("Do NOT invent data about other employees or tasks not in the context.\n");
        }

        sb.append("\nRules:\n");
        sb.append("- Answer ONLY based on the RETRIEVED CONTEXT section below.\n");
        sb.append("- If the retrieved context doesn't contain enough information to answer, ")
          .append("say so plainly. Do NOT guess from prior knowledge.\n");
        sb.append("- The context contains entries prefixed with [TASK #id], [SPRINT #id], or ")
          .append("[PROJECT #id]. Refer to them by their IDs when useful.\n");
        sb.append("- Be concise -- short paragraphs or bullet lists.\n");
        sb.append("- Use plain text only (no Markdown, no asterisks, no backticks).\n");
        sb.append("- NEVER use Key:Value or Key: Value format. Write naturally like a human.\n");
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
        sb.append("- Write conversationally. Don't just dump data -- present it clearly.\n");
        sb.append("- Keep it clean and easy to read on a phone screen.\n");
        return sb.toString();
    }
}
