package com.springboot.MyTodoList.rag;

import com.springboot.MyTodoList.model.Comment;
import com.springboot.MyTodoList.model.Project;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Task;
import com.springboot.MyTodoList.repository.CommentRepository;
import com.springboot.MyTodoList.repository.ProjectRepository;
import com.springboot.MyTodoList.repository.SprintRepository;
import com.springboot.MyTodoList.repository.TaskRepository;
import oracle.jdbc.OracleType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

/**
 * Builds the embeddable text for one entity, embeds it, and upserts the
 * resulting (text, vector) into RAG_CHUNK via MERGE.
 *
 * No-op fast path: if the existing row's CONTENT_HASH matches the new
 * text's hash, the embedding call (~tens of ms) is skipped.
 *
 * Called by RagIndexWorker, not directly by service write paths.
 */
@Service
public class RagIndexer {

    private static final Logger logger = LoggerFactory.getLogger(RagIndexer.class);

    private final DataSource dataSource;
    private final EmbeddingService embeddingService;
    private final RagChunkRepository chunkRepo;
    private final TaskRepository taskRepo;
    private final SprintRepository sprintRepo;
    private final ProjectRepository projectRepo;
    private final CommentRepository commentRepo;

    public RagIndexer(DataSource dataSource,
                      EmbeddingService embeddingService,
                      RagChunkRepository chunkRepo,
                      TaskRepository taskRepo,
                      SprintRepository sprintRepo,
                      ProjectRepository projectRepo,
                      CommentRepository commentRepo) {
        this.dataSource = dataSource;
        this.embeddingService = embeddingService;
        this.chunkRepo = chunkRepo;
        this.taskRepo = taskRepo;
        this.sprintRepo = sprintRepo;
        this.projectRepo = projectRepo;
        this.commentRepo = commentRepo;
    }

    // ─── public entrypoints ──────────────────────────────────────────────

    /** Re-index one source. Returns true if the row exists in the catalog
     *  after the call (i.e. the source still exists), false if the source
     *  has been deleted and the chunk was removed instead. */
    public boolean reindex(String sourceType, long sourceId) throws SQLException {
        switch (sourceType) {
            case RagDirtyEnqueuer.TYPE_TASK -> {
                Optional<Task> t = taskRepo.findById((int) sourceId);
                if (t.isEmpty()) { delete(sourceType, sourceId); return false; }
                upsertTask(t.get());
                return true;
            }
            case RagDirtyEnqueuer.TYPE_SPRINT -> {
                Optional<Sprint> s = sprintRepo.findById((int) sourceId);
                if (s.isEmpty()) { delete(sourceType, sourceId); return false; }
                upsertSprint(s.get());
                return true;
            }
            case RagDirtyEnqueuer.TYPE_PROJECT -> {
                Optional<Project> p = projectRepo.findById((int) sourceId);
                if (p.isEmpty()) { delete(sourceType, sourceId); return false; }
                upsertProject(p.get());
                return true;
            }
            default -> throw new IllegalArgumentException("Unknown source_type: " + sourceType);
        }
    }

    public void delete(String sourceType, long sourceId) throws SQLException {
        String sql = "DELETE FROM RAG_CHUNK WHERE SOURCE_TYPE = ? AND SOURCE_ID = ?";
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, sourceType);
            ps.setLong(2, sourceId);
            ps.executeUpdate();
        }
    }

    // ─── per-type upsert ─────────────────────────────────────────────────

    private void upsertTask(Task t) throws SQLException {
        String content = buildTaskText(t);
        Long ownerId   = t.getAssignee() != null ? (long) t.getAssignee().getEmployeeId() : null;
        Long projectId = t.getProject()  != null ? (long) t.getProject().getProjectId()   : null;
        Long sprintId  = t.getSprint()   != null ? (long) t.getSprint().getSprintId()     : null;
        merge(RagDirtyEnqueuer.TYPE_TASK, (long) t.getTaskId(), content, ownerId, projectId, sprintId);
    }

    private void upsertSprint(Sprint s) throws SQLException {
        String content = buildSprintText(s);
        Long projectId = s.getProject() != null ? (long) s.getProject().getProjectId() : null;
        merge(RagDirtyEnqueuer.TYPE_SPRINT, (long) s.getSprintId(),
              content, null, projectId, (long) s.getSprintId());
    }

    private void upsertProject(Project p) throws SQLException {
        String content = buildProjectText(p);
        merge(RagDirtyEnqueuer.TYPE_PROJECT, (long) p.getProjectId(),
              content, null, (long) p.getProjectId(), null);
    }

    // ─── MERGE with hash fast-path ───────────────────────────────────────

    private void merge(String sourceType,
                       long sourceId,
                       String content,
                       Long ownerEmployeeId,
                       Long projectId,
                       Long sprintId) throws SQLException {
        String hash = sha256(content);

        // Skip the embedding call if nothing semantically changed.
        Optional<RagChunk> existing = chunkRepo.findBySourceTypeAndSourceId(sourceType, sourceId);
        if (existing.isPresent() && hash.equals(existing.get().getContentHash())) {
            return;
        }

        float[] vec = embeddingService.embed(content);

        String sql =
            "MERGE INTO RAG_CHUNK c " +
            "USING (SELECT ? AS st, ? AS sid FROM dual) src " +
            "   ON (c.SOURCE_TYPE = src.st AND c.SOURCE_ID = src.sid) " +
            " WHEN MATCHED THEN UPDATE " +
            "    SET CONTENT           = ?, " +
            "        EMBEDDING         = ?, " +
            "        CONTENT_HASH      = ?, " +
            "        OWNER_EMPLOYEE_ID = ?, " +
            "        PROJECT_ID        = ?, " +
            "        SPRINT_ID         = ?, " +
            "        UPDATED_AT        = CURRENT_TIMESTAMP " +
            " WHEN NOT MATCHED THEN INSERT " +
            "    (SOURCE_TYPE, SOURCE_ID, CONTENT, EMBEDDING, CONTENT_HASH, " +
            "     OWNER_EMPLOYEE_ID, PROJECT_ID, SPRINT_ID) " +
            "  VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            int i = 1;
            // src
            ps.setString(i++, sourceType);
            ps.setLong  (i++, sourceId);
            // UPDATE branch
            ps.setString(i++, content);
            ps.setObject(i++, vec, OracleType.VECTOR_FLOAT32);
            ps.setString(i++, hash);
            setNullableLong(ps, i++, ownerEmployeeId);
            setNullableLong(ps, i++, projectId);
            setNullableLong(ps, i++, sprintId);
            // INSERT branch
            ps.setString(i++, sourceType);
            ps.setLong  (i++, sourceId);
            ps.setString(i++, content);
            ps.setObject(i++, vec, OracleType.VECTOR_FLOAT32);
            ps.setString(i++, hash);
            setNullableLong(ps, i++, ownerEmployeeId);
            setNullableLong(ps, i++, projectId);
            setNullableLong(ps, i,   sprintId);
            ps.executeUpdate();
        }
    }

    private static void setNullableLong(PreparedStatement ps, int idx, Long v) throws SQLException {
        if (v == null) ps.setNull(idx, java.sql.Types.NUMERIC);
        else           ps.setLong(idx, v);
    }

    // ─── text builders ───────────────────────────────────────────────────

    private String buildTaskText(Task t) {
        StringBuilder sb = new StringBuilder();
        sb.append("[TASK #").append(t.getTaskId());
        if (t.getTicketKey() != null) sb.append(" | ").append(t.getTicketKey());
        sb.append("] ").append(nz(t.getTitle())).append('\n');
        sb.append("Status: ").append(nz(t.getStatus()))
          .append(" | Priority: ").append(nz(t.getPriority()))
          .append(" | Sprint: ").append(t.getSprint() != null ? t.getSprint().getName() : "none")
          .append('\n');
        sb.append("Project: ")
          .append(t.getProject() != null ? t.getProject().getName() : "none")
          .append('\n');
        sb.append("Assignee: ");
        if (t.getAssignee() != null) {
            sb.append(nz(t.getAssignee().getFirstName())).append(' ')
              .append(nz(t.getAssignee().getLastName()));
        } else {
            sb.append("unassigned");
        }
        sb.append('\n');
        if (t.getStoryPoints() != null) sb.append("Story points: ").append(t.getStoryPoints()).append('\n');
        if (t.getEstimatedHours() != null) sb.append("Estimated hours: ").append(t.getEstimatedHours()).append('\n');
        sb.append("Due: ").append(t.getExpectedEndDate() != null ? t.getExpectedEndDate() : "-").append('\n');
        sb.append("Description: ")
          .append(t.getDescription() != null && !t.getDescription().isBlank()
                  ? t.getDescription() : "-")
          .append('\n');

        List<Comment> comments = commentRepo.findByTask_TaskIdOrderByCreatedAtAsc(t.getTaskId());
        if (!comments.isEmpty()) {
            sb.append("Comments:\n");
            for (Comment c : comments) {
                sb.append("- ").append(nz(c.getContent())).append('\n');
            }
        }
        return sb.toString();
    }

    private String buildSprintText(Sprint s) {
        StringBuilder sb = new StringBuilder();
        sb.append("[SPRINT #").append(s.getSprintId()).append("] ")
          .append(nz(s.getName()))
          .append(" (").append(nz(s.getStatus())).append(")\n");
        sb.append("Project: ")
          .append(s.getProject() != null ? s.getProject().getName() : "none")
          .append('\n');
        sb.append("Dates: ")
          .append(s.getStartDate() != null ? s.getStartDate() : "-")
          .append(" -> ")
          .append(s.getEndDate() != null ? s.getEndDate() : "-")
          .append('\n');
        sb.append("Goal: ")
          .append(s.getGoal() != null && !s.getGoal().isBlank() ? s.getGoal() : "-")
          .append('\n');
        return sb.toString();
    }

    private String buildProjectText(Project p) {
        StringBuilder sb = new StringBuilder();
        sb.append("[PROJECT #").append(p.getProjectId());
        if (p.getShortName() != null) sb.append(" | ").append(p.getShortName());
        sb.append("] ").append(nz(p.getName()))
          .append(" (").append(nz(p.getStatus())).append(")\n");
        sb.append("Dates: ")
          .append(p.getStartDate() != null ? p.getStartDate() : "-")
          .append(" -> ")
          .append(p.getEndDate() != null ? p.getEndDate() : "-")
          .append('\n');
        if (p.getDescription() != null && !p.getDescription().isBlank()) {
            sb.append("Description: ").append(p.getDescription()).append('\n');
        }
        return sb.toString();
    }

    private static String nz(String s) { return s != null ? s : ""; }

    private static String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] out = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(out.length * 2);
            for (byte b : out) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
