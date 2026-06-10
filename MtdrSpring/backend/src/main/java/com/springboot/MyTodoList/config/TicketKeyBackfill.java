package com.springboot.MyTodoList.config;

import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.rag.RagDirtyEnqueuer;
import com.springboot.MyTodoList.repository.ProjectRepository;
import com.springboot.MyTodoList.repository.TaskRepository;
import com.springboot.MyTodoList.service.ProjectService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * One-time backfill for the Jira-style keys: gives every project a unique
 * SHORT_NAME and every task a per-project TICKET_NUMBER, then marks the
 * affected rows RAG-dirty so their chunks are re-embedded with the new keys.
 *
 * Idempotent -- rows that already have values are skipped, so this is a
 * cheap no-op on every later startup.
 */
@Component
public class TicketKeyBackfill implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(TicketKeyBackfill.class);

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final RagDirtyEnqueuer ragDirty;

    public TicketKeyBackfill(ProjectRepository projectRepository,
                             TaskRepository taskRepository,
                             ProjectService projectService,
                             RagDirtyEnqueuer ragDirty) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.projectService = projectService;
        this.ragDirty = ragDirty;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            backfillProjectKeys();
            backfillTicketNumbers();
        } catch (Exception e) {
            // Never block startup over this; keys will be filled on next boot.
            logger.error("Ticket key backfill failed", e);
        }
    }

    private void backfillProjectKeys() {
        int filled = 0;
        for (Project p : projectRepository.findAll()) {
            if (p.getShortName() != null && !p.getShortName().isBlank()) continue;
            projectService.ensureShortName(p);
            projectRepository.save(p);
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_PROJECT, p.getProjectId());
            filled++;
        }
        if (filled > 0) logger.info("Backfilled short names for {} project(s)", filled);
    }

    private void backfillTicketNumbers() {
        List<Task> missing = taskRepository.findByTicketNumberIsNullOrderByProject_ProjectIdAscTaskIdAsc();
        if (missing.isEmpty()) return;

        Map<Integer, Integer> nextByProject = new HashMap<>();
        for (Task t : missing) {
            if (t.getProject() == null) continue;
            int projectId = t.getProject().getProjectId();
            int next = nextByProject.computeIfAbsent(projectId,
                id -> taskRepository.findMaxTicketNumber(id) + 1);
            t.setTicketNumber(next);
            nextByProject.put(projectId, next + 1);
            taskRepository.save(t);
            ragDirty.upsert(RagDirtyEnqueuer.TYPE_TASK, t.getTaskId());
        }
        logger.info("Backfilled ticket numbers for {} task(s)", missing.size());
    }
}
