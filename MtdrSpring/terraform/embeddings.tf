// =============================================================================
// ONNX embedding model provisioning for Oracle 26ai AI Vector Search.
//
// Downloads ALL_MINILM_L12_V2 (~80 MB ONNX) from Oracle's public bundle at
// terraform-apply time, uploads it to the project's existing object-storage
// bucket, and issues a PreAuth Request URL the autonomous database can read
// without needing its own credentials.
//
// The bootstrap-app.sh script reads `minilm_onnx_par_url` and passes it to
// DBMS_VECTOR.LOAD_ONNX_MODEL_CLOUD on first deploy.
// =============================================================================

resource "null_resource" "download_minilm" {
  triggers = {
    // Re-run if the source URL or target filename ever changes.
    src = "all_MiniLM_L12_v2_augmented.zip:v2"
  }

  // The "augmented" bundle is the only one compatible with
  // DBMS_VECTOR.LOAD_ONNX_MODEL -- it has the tokenizer + post-processing
  // fused into the ONNX graph. The plain HuggingFace export does NOT work.
  //
  // If the PreAuth URL ever 401s, get the current one from Oracle's docs:
  //   https://docs.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/26/vecse&id=oml_ai_models_object_storage
  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      cache="${path.module}/.cache"
      mkdir -p "$cache"
      cd "$cache"
      if [ ! -f all_MiniLM_L12_v2.onnx ]; then
        curl -fsSL -o all_MiniLM_L12_v2_augmented.zip \
          'https://adwc4pm.objectstorage.us-ashburn-1.oci.customer-oci.com/p/TtH6hL2y25EypZ0-rrczRZ1aXp7v1ONbRBfCiT-BDBN8WLKQ3lgyW6RxCfIFLdA6/n/adwc4pm/b/OML-ai-models/o/all_MiniLM_L12_v2_augmented.zip'
        unzip -o all_MiniLM_L12_v2_augmented.zip
        # The augmented bundle ships a single .onnx file (possibly nested).
        find . -name '*.onnx' -not -name 'all_MiniLM_L12_v2.onnx' \
          -exec mv {} all_MiniLM_L12_v2.onnx \;
      fi
    EOT
  }
}

resource "oci_objectstorage_object" "minilm_onnx" {
  depends_on   = [null_resource.download_minilm]
  namespace    = data.oci_objectstorage_namespace.namespace.namespace
  bucket       = oci_objectstorage_bucket.dbbucket.name
  object       = "embeddings/all_MiniLM_L12_v2.onnx"
  source       = "${path.module}/.cache/all_MiniLM_L12_v2.onnx"
  content_type = "application/octet-stream"
}

resource "oci_objectstorage_preauthrequest" "minilm_par" {
  namespace    = data.oci_objectstorage_namespace.namespace.namespace
  bucket       = oci_objectstorage_bucket.dbbucket.name
  name         = "minilm-onnx"
  object_name  = oci_objectstorage_object.minilm_onnx.object
  access_type  = "ObjectRead"
  // 1 year. The model load only needs to succeed once per DB; the PAR is a
  // safety net for re-bootstraps.
  time_expires = timeadd(timestamp(), "8760h")
}

output "minilm_onnx_par_url" {
  value     = "https://objectstorage.${var.ociRegionIdentifier}.oraclecloud.com${oci_objectstorage_preauthrequest.minilm_par.access_uri}"
  sensitive = true
}
