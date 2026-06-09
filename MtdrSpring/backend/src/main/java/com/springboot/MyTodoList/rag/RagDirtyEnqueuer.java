package com.springboot.MyTodoList.rag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single-INSERT helper services call from their write paths. Participates
 * in the caller's transaction so a rolled-back entity write rolls back
 * the queue insert too -- no phantom dirty rows.
 */
@Component
public class RagDirtyEnqueuer {

    public static final String TYPE_TASK    = "task";
    public static final String TYPE_SPRINT  = "sprint";
    public static final String TYPE_PROJECT = "project";

    @Autowired
    private RagDirtyRepository repo;

    @Transactional(propagation = Propagation.REQUIRED)
    public void upsert(String sourceType, long sourceId) {
        repo.save(new RagDirty(sourceType, sourceId, RagDirty.ACTION_UPSERT));
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void delete(String sourceType, long sourceId) {
        repo.save(new RagDirty(sourceType, sourceId, RagDirty.ACTION_DELETE));
    }
}
