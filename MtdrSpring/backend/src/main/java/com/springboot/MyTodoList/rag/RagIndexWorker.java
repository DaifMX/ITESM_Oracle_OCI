package com.springboot.MyTodoList.rag;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Drains RAG_DIRTY on a fixed schedule.
 *
 * Algorithm per tick:
 *   1. SELECT up to batchSize rows ordered by enqueued_at, dirty_id,
 *      FOR UPDATE SKIP LOCKED (so multiple replicas don't fight).
 *   2. Coalesce by (source_type, source_id) -- only the latest action wins.
 *   3. For each group: call RagIndexer (UPSERT -> reindex, DELETE -> delete).
 *   4. On success: delete all dirty rows for that source up to the
 *      highest dirty_id we saw.
 *   5. On failure: increment ATTEMPTS, store LAST_ERROR, leave the rows.
 */
@Component
public class RagIndexWorker {

    private static final Logger logger = LoggerFactory.getLogger(RagIndexWorker.class);

    private final DataSource dataSource;
    private final RagIndexer indexer;
    private final int batchSize;
    private final int maxAttempts;

    public RagIndexWorker(DataSource dataSource,
                          RagIndexer indexer,
                          @Value("${rag.worker.batch-size:32}") int batchSize,
                          @Value("${rag.worker.max-attempts:5}") int maxAttempts) {
        this.dataSource = dataSource;
        this.indexer = indexer;
        this.batchSize = batchSize;
        this.maxAttempts = maxAttempts;
    }

    /** Single batch. Wrapped in REQUIRES_NEW so the SKIP LOCKED select and
     *  the delete-on-success live in the same transaction and the row
     *  locks are released at tick boundaries. */
    @Scheduled(
        fixedDelayString = "${rag.worker.fixed-delay-ms:2000}",
        initialDelayString = "${rag.worker.initial-delay-ms:5000}"
    )
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void tick() {
        try {
            drainOnce();
        } catch (Exception e) {
            logger.error("RAG worker tick failed", e);
        }
    }

    void drainOnce() throws SQLException {
        try (Connection c = dataSource.getConnection()) {
            // Don't auto-commit inside the locked region -- the @Transactional
            // wrapper owns the boundary, but be explicit so behaviour matches
            // whether the bean is invoked from a test or from @Scheduled.
            boolean prevAuto = c.getAutoCommit();
            c.setAutoCommit(false);
            try {
                List<DirtyRow> rows = pickBatch(c);
                if (rows.isEmpty()) {
                    c.commit();
                    return;
                }
                Map<Key, DirtyGroup> groups = coalesce(rows);
                for (DirtyGroup g : groups.values()) {
                    try {
                        if (RagDirty.ACTION_DELETE.equals(g.action)) {
                            indexer.delete(g.key.sourceType, g.key.sourceId);
                        } else {
                            indexer.reindex(g.key.sourceType, g.key.sourceId);
                        }
                        deleteGroup(c, g);
                    } catch (Exception e) {
                        logger.warn("Failed to index {} #{} (attempt #{}): {}",
                                    g.key.sourceType, g.key.sourceId,
                                    g.maxAttemptsSeen + 1, e.toString());
                        markFailure(c, g, e);
                        if (g.maxAttemptsSeen + 1 >= maxAttempts) {
                            logger.error("Giving up after {} attempts on {} #{}: {}",
                                         maxAttempts, g.key.sourceType, g.key.sourceId,
                                         e.toString());
                        }
                    }
                }
                c.commit();
            } catch (RuntimeException | SQLException e) {
                c.rollback();
                throw e;
            } finally {
                c.setAutoCommit(prevAuto);
            }
        }
    }

    // ─── helpers ─────────────────────────────────────────────────────────

    private List<DirtyRow> pickBatch(Connection c) throws SQLException {
        // Oracle rejects `FETCH FIRST n ROWS ONLY ... FOR UPDATE` (ORA-02014)
        // because FETCH FIRST is implemented as an inline window-function view
        // and FOR UPDATE isn't legal against a view with windowing. The
        // canonical workaround is to pick the rowids in a subquery, then
        // lock by rowid in the outer query.
        String sql =
            "SELECT DIRTY_ID, SOURCE_TYPE, SOURCE_ID, ACTION, ATTEMPTS " +
            "  FROM RAG_DIRTY " +
            " WHERE ROWID IN ( " +
            "         SELECT ROWID FROM RAG_DIRTY " +
            "          ORDER BY ENQUEUED_AT, DIRTY_ID " +
            "          FETCH FIRST ? ROWS ONLY " +
            "       ) " +
            " ORDER BY ENQUEUED_AT, DIRTY_ID " +
            "   FOR UPDATE SKIP LOCKED";
        List<DirtyRow> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, batchSize);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(new DirtyRow(
                        rs.getLong("DIRTY_ID"),
                        rs.getString("SOURCE_TYPE"),
                        rs.getLong("SOURCE_ID"),
                        rs.getString("ACTION"),
                        rs.getInt("ATTEMPTS")
                    ));
                }
            }
        }
        return out;
    }

    /** Group by (source_type, source_id). Latest dirty_id wins the action
     *  -- e.g. a DELETE after an UPSERT means "delete". */
    private Map<Key, DirtyGroup> coalesce(List<DirtyRow> rows) {
        Map<Key, DirtyGroup> out = new LinkedHashMap<>();
        for (DirtyRow r : rows) {
            Key k = new Key(r.sourceType, r.sourceId);
            DirtyGroup g = out.computeIfAbsent(k, DirtyGroup::new);
            g.dirtyIds.add(r.dirtyId);
            if (r.dirtyId > g.maxDirtyId) {
                g.maxDirtyId = r.dirtyId;
                g.action = r.action;
            }
            if (r.attempts > g.maxAttemptsSeen) g.maxAttemptsSeen = r.attempts;
        }
        return out;
    }

    private void deleteGroup(Connection c, DirtyGroup g) throws SQLException {
        // Delete by exact ids -- safer than "<= maxDirtyId" if a fresh
        // dirty row landed after our pickBatch (we don't want to swallow it).
        String sql = "DELETE FROM RAG_DIRTY WHERE DIRTY_ID = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            for (Long id : g.dirtyIds) {
                ps.setLong(1, id);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    private void markFailure(Connection c, DirtyGroup g, Exception e) throws SQLException {
        String msg = e.toString();
        if (msg.length() > 1990) msg = msg.substring(0, 1990);
        String sql = "UPDATE RAG_DIRTY SET ATTEMPTS = ATTEMPTS + 1, LAST_ERROR = ? " +
                     " WHERE DIRTY_ID = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            for (Long id : g.dirtyIds) {
                ps.setString(1, msg);
                ps.setLong(2, id);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    // ─── small holder types ──────────────────────────────────────────────

    private record DirtyRow(long dirtyId, String sourceType, long sourceId,
                            String action, int attempts) {}

    private record Key(String sourceType, long sourceId) {}

    private static final class DirtyGroup {
        final Key key;
        final List<Long> dirtyIds = new ArrayList<>();
        long maxDirtyId = Long.MIN_VALUE;
        String action = RagDirty.ACTION_UPSERT;
        int maxAttemptsSeen = 0;

        DirtyGroup(Key key) { this.key = key; }
    }
}
