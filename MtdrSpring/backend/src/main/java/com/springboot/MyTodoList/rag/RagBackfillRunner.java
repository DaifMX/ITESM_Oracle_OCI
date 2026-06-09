package com.springboot.MyTodoList.rag;

import com.springboot.MyTodoList.repository.ProjectRepository;
import com.springboot.MyTodoList.repository.SprintRepository;
import com.springboot.MyTodoList.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * On application startup, enqueues UPSERTs for every entity that doesn't
 * already have a corresponding RAG_CHUNK row. Cheap on warm DBs (the
 * "missing" set is empty), gets the worker started on cold DBs without
 * blocking app boot.
 */
@Component
public class RagBackfillRunner {

    private static final Logger logger = LoggerFactory.getLogger(RagBackfillRunner.class);

    private final boolean enabled;
    private final TaskRepository taskRepo;
    private final SprintRepository sprintRepo;
    private final ProjectRepository projectRepo;
    private final RagChunkRepository chunkRepo;
    private final RagDirtyEnqueuer enqueuer;

    public RagBackfillRunner(@Value("${rag.backfill.on-startup:true}") boolean enabled,
                             TaskRepository taskRepo,
                             SprintRepository sprintRepo,
                             ProjectRepository projectRepo,
                             RagChunkRepository chunkRepo,
                             RagDirtyEnqueuer enqueuer) {
        this.enabled = enabled;
        this.taskRepo = taskRepo;
        this.sprintRepo = sprintRepo;
        this.projectRepo = projectRepo;
        this.chunkRepo = chunkRepo;
        this.enqueuer = enqueuer;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void backfill() {
        if (!enabled) {
            logger.info("RAG backfill disabled.");
            return;
        }
        int enqueued = 0;
        enqueued += enqueueMissing(RagDirtyEnqueuer.TYPE_PROJECT,
                                   projectRepo.findAll().stream()
                                       .mapToLong(p -> p.getProjectId()).toArray());
        enqueued += enqueueMissing(RagDirtyEnqueuer.TYPE_SPRINT,
                                   sprintRepo.findAll().stream()
                                       .mapToLong(s -> s.getSprintId()).toArray());
        enqueued += enqueueMissing(RagDirtyEnqueuer.TYPE_TASK,
                                   taskRepo.findAll().stream()
                                       .mapToLong(t -> t.getTaskId()).toArray());
        logger.info("RAG backfill enqueued {} chunk(s) for indexing.", enqueued);
    }

    private int enqueueMissing(String sourceType, long[] ids) {
        int n = 0;
        for (long id : ids) {
            if (!chunkRepo.existsBySourceTypeAndSourceId(sourceType, id)) {
                enqueuer.upsert(sourceType, id);
                n++;
            }
        }
        return n;
    }
}
