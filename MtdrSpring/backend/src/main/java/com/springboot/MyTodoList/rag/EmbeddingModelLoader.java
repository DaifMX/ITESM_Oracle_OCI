package com.springboot.MyTodoList.rag;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.sql.Blob;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Self-healing loader for the in-database embedding model.
 *
 * On startup, checks whether the configured model exists in the current
 * user's schema. If it doesn't, downloads Oracle's augmented bundle
 * (ALL_MINILM_L12_V2 by default), extracts the .onnx, and calls
 * DBMS_VECTOR.LOAD_ONNX_MODEL with the BLOB overload. The model ends up
 * owned by whatever schema the JDBC connection is using -- so the same
 * code path works for TODOUSER in prod and for any other dev/test schema
 * without bootstrap script choreography.
 *
 * Failure modes:
 *   - URL 404 (PAR rotated) / network down → logged at ERROR, app still
 *     boots, RAG silently doesn't work. Set rag.embedding.model.url to
 *     the current Oracle URL to fix; no rebuild needed.
 *   - DBMS_VECTOR missing or no CREATE MINING MODEL → same: ERROR, RAG
 *     off. Run the V5 grants.
 *
 * Idempotent: subsequent boots see the model and skip the download
 * entirely (a single COUNT(*) query).
 */
@Component
public class EmbeddingModelLoader {

    private static final Logger logger = LoggerFactory.getLogger(EmbeddingModelLoader.class);

    private static final String DEFAULT_URL =
        "https://adwc4pm.objectstorage.us-ashburn-1.oci.customer-oci.com" +
        "/p/TtH6hL2y25EypZ0-rrczRZ1aXp7v1ONbRBfCiT-BDBN8WLKQ3lgyW6RxCfIFLdA6" +
        "/n/adwc4pm/b/OML-ai-models/o/all_MiniLM_L12_v2_augmented.zip";

    private static final String LOAD_METADATA =
        "{\"function\":\"embedding\"," +
        "\"embeddingOutput\":\"embedding\"," +
        "\"input\":{\"input\":[\"DATA\"]}}";

    private final DataSource dataSource;
    private final String modelName;
    private final String modelUrl;

    public EmbeddingModelLoader(
            DataSource dataSource,
            @Value("${rag.embedding.model:ALL_MINILM_L12_V2}") String modelName,
            @Value("${rag.embedding.model.url:}") String modelUrl) {
        this.dataSource = dataSource;
        this.modelName = modelName;
        this.modelUrl = (modelUrl == null || modelUrl.isBlank()) ? DEFAULT_URL : modelUrl;
    }

    /** Runs before RagBackfillRunner (default precedence) so the worker
     *  doesn't waste its first ticks with ORA-40284. */
    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public void ensureLoaded() {
        try {
            if (existsInCurrentSchema()) {
                logger.info("Embedding model {} already present in current schema.", modelName);
                return;
            }
            logger.info("Embedding model {} not found -- downloading from {}...",
                        modelName, modelUrl);
            byte[] onnx = downloadAndExtractOnnx();
            logger.info("Downloaded ONNX bundle ({} bytes). Loading into DB...", onnx.length);
            try {
                loadIntoDb(onnx);
            } catch (SQLException e) {
                // Another instance may have loaded it concurrently.
                if (existsInCurrentSchema()) {
                    logger.info("Embedding model {} became available during load; continuing.", modelName);
                    return;
                }
                throw e;
            }
            logger.info("Loaded {} into the current user's schema.", modelName);
        } catch (Exception e) {
            logger.error("Embedding model load failed -- RAG will not work until this is " +
                         "resolved. Set rag.embedding.model.url if Oracle's PAR has rotated.",
                         e);
        }
    }
    }

    // ─── helpers ─────────────────────────────────────────────────────────

    private boolean existsInCurrentSchema() throws SQLException {
        String sql = "SELECT COUNT(*) FROM user_mining_models WHERE model_name = ?";
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, modelName);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1) > 0;
            }
        }
    }

    private byte[] downloadAndExtractOnnx() throws IOException {
        // Oracle's "augmented" bundle is a zip containing a single .onnx with
        // the tokenizer + post-processing fused into the graph. Stream-extract
        // the .onnx and return its bytes; we never touch the disk.
        var url = URI.create(modelUrl).toURL();
        var conn = url.openConnection();
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(120_000);
        try (InputStream raw = conn.getInputStream();
             ZipInputStream zip = new ZipInputStream(raw)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!entry.isDirectory()
                        && entry.getName().toLowerCase().endsWith(".onnx")) {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    zip.transferTo(out);
                    return out.toByteArray();
                }
            }
            throw new IOException("No .onnx entry inside bundle from " + modelUrl);
        }
    }

    private void loadIntoDb(byte[] onnx) throws SQLException {
        // BLOB overload: model_name is the catalog name (unqualified -> current
        // schema), model_data is the raw ONNX bytes, metadata describes the IO
        // shape. JSON(...) parses a JSON literal in PL/SQL.
        String call =
            "BEGIN " +
            "  DBMS_VECTOR.LOAD_ONNX_MODEL( " +
            "    model_name => ?, " +
            "    model_data => ?, " +
            "    metadata   => JSON(?) " +
            "  ); " +
            "END;";
        try (Connection c = dataSource.getConnection();
             CallableStatement cs = c.prepareCall(call)) {
            Blob blob = c.createBlob();
            try {
                blob.setBytes(1, onnx);
                cs.setString(1, modelName);
                cs.setBlob(2, blob);
                cs.setString(3, LOAD_METADATA);
                cs.execute();
            } finally {
                blob.free();
            }
        }
    }
}
