package com.springboot.MyTodoList.rag;

import com.springboot.MyTodoList.model.Employee;
import oracle.jdbc.OracleType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Role-scoped top-K similarity search over RAG_CHUNK.
 *
 * Access control is enforced in the SQL WHERE clause:
 *   - managers/admins see every chunk
 *   - developers see all sprint/project chunks (organizational context)
 *     plus only the task chunks where they are the assignee
 *
 * FETCH APPROX FIRST is what asks the optimizer to use the HNSW vector
 * index. With plain FETCH FIRST it would do an exact scan, which is fine
 * at low row counts but defeats the index.
 */
@Service
public class RagRetriever {

    private static final Logger logger = LoggerFactory.getLogger(RagRetriever.class);

    private final DataSource dataSource;
    private final EmbeddingService embeddingService;

    public RagRetriever(DataSource dataSource, EmbeddingService embeddingService) {
        this.dataSource = dataSource;
        this.embeddingService = embeddingService;
    }

    public record RetrievedChunk(String sourceType, long sourceId,
                                 String content, double distance) {}

    public List<RetrievedChunk> search(String query,
                                       int topK,
                                       Employee caller,
                                       boolean isManager) throws SQLException {
        if (query == null || query.isBlank()) return List.of();
        float[] qvec = embeddingService.embed(query);

        String sql =
            "SELECT SOURCE_TYPE, SOURCE_ID, CONTENT, " +
            "       VECTOR_DISTANCE(EMBEDDING, ?, COSINE) AS DIST " +
            "  FROM RAG_CHUNK " +
            " WHERE (? = 1 " +
            "        OR SOURCE_TYPE IN ('sprint','project') " +
            "        OR OWNER_EMPLOYEE_ID = ?) " +
            " ORDER BY VECTOR_DISTANCE(EMBEDDING, ?, COSINE) " +
            " FETCH APPROX FIRST ? ROWS ONLY";

        List<RetrievedChunk> out = new ArrayList<>(topK);
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setObject(1, qvec, OracleType.VECTOR_FLOAT32);
            ps.setInt(2, isManager ? 1 : 0);
            ps.setLong(3, caller != null ? caller.getEmployeeId() : -1L);
            ps.setObject(4, qvec, OracleType.VECTOR_FLOAT32);
            ps.setInt(5, topK);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(new RetrievedChunk(
                        rs.getString("SOURCE_TYPE"),
                        rs.getLong("SOURCE_ID"),
                        rs.getString("CONTENT"),
                        rs.getDouble("DIST")
                    ));
                }
            }
        }
        return out;
    }
}
