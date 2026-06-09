package com.springboot.MyTodoList.rag;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Wraps the in-database call to VECTOR_EMBEDDING(model USING ? AS DATA).
 *
 * Returns a float[] of {@code expectedDimensions} length (384 for
 * ALL_MINILM_L12_V2). All embedding calls go through here so swapping
 * models is a single-knob change.
 */
@Service
public class EmbeddingService {

    private static final Logger logger = LoggerFactory.getLogger(EmbeddingService.class);

    private final DataSource dataSource;
    private final String modelName;

    public EmbeddingService(DataSource dataSource,
                            @Value("${rag.embedding.model:ALL_MINILM_L12_V2}") String modelName) {
        this.dataSource = dataSource;
        this.modelName = modelName;
    }

    public String modelName() {
        return modelName;
    }

    public float[] embed(String text) throws SQLException {
        if (text == null) text = "";
        // Model name is a SQL identifier so it must be inlined, not bound.
        // It comes from app config (not user input), so this is safe.
        String sql = "SELECT VECTOR_EMBEDDING(" + modelName + " USING ? AS DATA) FROM dual";
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, text);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new SQLException("VECTOR_EMBEDDING returned no rows");
                }
                // The 23ai+ JDBC driver exposes VECTOR(*, FLOAT32) as float[]
                // via getObject(int, Class). Falling back to getBytes would
                // require manual decoding of the wire format.
                float[] vec = rs.getObject(1, float[].class);
                if (vec == null) {
                    throw new SQLException("VECTOR_EMBEDDING returned NULL");
                }
                return vec;
            }
        }
    }
}
