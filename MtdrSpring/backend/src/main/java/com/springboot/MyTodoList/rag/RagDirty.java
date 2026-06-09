package com.springboot.MyTodoList.rag;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Async re-index queue entry. Service write paths INSERT one of these
 * (cheap, in-transaction with the entity write); RagIndexWorker drains
 * and calls RagIndexer.
 */
@Entity
@Table(name = "RAG_DIRTY")
public class RagDirty {

    public static final String ACTION_UPSERT = "UPSERT";
    public static final String ACTION_DELETE = "DELETE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DIRTY_ID")
    private Long dirtyId;

    @Column(name = "SOURCE_TYPE", nullable = false, length = 16)
    private String sourceType;

    @Column(name = "SOURCE_ID", nullable = false)
    private Long sourceId;

    @Column(name = "ACTION", nullable = false, length = 8)
    private String action;

    @Column(name = "ENQUEUED_AT", nullable = false)
    private LocalDateTime enqueuedAt;

    @Column(name = "ATTEMPTS", nullable = false)
    private int attempts;

    @Column(name = "LAST_ERROR", length = 2000)
    private String lastError;

    @PrePersist
    void onCreate() {
        if (enqueuedAt == null) enqueuedAt = LocalDateTime.now();
    }

    public RagDirty() {}

    public RagDirty(String sourceType, Long sourceId, String action) {
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.action = action;
    }

    public Long getDirtyId() { return dirtyId; }
    public void setDirtyId(Long dirtyId) { this.dirtyId = dirtyId; }

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }

    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public LocalDateTime getEnqueuedAt() { return enqueuedAt; }
    public void setEnqueuedAt(LocalDateTime enqueuedAt) { this.enqueuedAt = enqueuedAt; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
}
