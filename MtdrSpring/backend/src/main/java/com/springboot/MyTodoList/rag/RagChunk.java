package com.springboot.MyTodoList.rag;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * One indexed unit of retrievable text (task, sprint, or project).
 *
 * The EMBEDDING column is an Oracle 23ai/26ai VECTOR(384, FLOAT32) but is
 * mapped here as a raw byte[] because Hibernate has no native VECTOR
 * mapping yet. The indexer/retriever bypass JPA for the embedding column
 * and use JDBC + OracleType.VECTOR_FLOAT32 directly -- this entity is
 * only used for the surrounding metadata (existence checks, owner/project
 * scoping, hash comparison).
 */
@Entity
@Table(name = "RAG_CHUNK")
public class RagChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CHUNK_ID")
    private Long chunkId;

    @Column(name = "SOURCE_TYPE", nullable = false, length = 16)
    private String sourceType;

    @Column(name = "SOURCE_ID", nullable = false)
    private Long sourceId;

    @Column(name = "OWNER_EMPLOYEE_ID")
    private Long ownerEmployeeId;

    @Column(name = "PROJECT_ID")
    private Long projectId;

    @Column(name = "SPRINT_ID")
    private Long sprintId;

    @Lob
    @Column(name = "CONTENT", nullable = false)
    private String content;

    @Column(name = "CONTENT_HASH", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;

    public RagChunk() {}

    public Long getChunkId() { return chunkId; }
    public void setChunkId(Long chunkId) { this.chunkId = chunkId; }

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }

    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }

    public Long getOwnerEmployeeId() { return ownerEmployeeId; }
    public void setOwnerEmployeeId(Long ownerEmployeeId) { this.ownerEmployeeId = ownerEmployeeId; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public Long getSprintId() { return sprintId; }
    public void setSprintId(Long sprintId) { this.sprintId = sprintId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getContentHash() { return contentHash; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
