// =============================================================================
// ONNX embedding model provisioning for Oracle 26ai AI Vector Search.
//
// Uploads ALL_MINILM_L12_V2 (~80 MB ONNX) to the project's existing
// object-storage bucket and issues a PreAuth Request URL the autonomous
// database can read without needing its own credentials.
//
// The ONNX file must already exist at .cache/all_MiniLM_L12_v2.onnx before
// `terraform plan` runs: oci_objectstorage_object reads `source` to hash it
// at plan time, so the download CANNOT be a null_resource (those only run at
// apply). The CI/local wrapper (utils/ci/terraform-apply.sh) fetches it first.
//
// The bootstrap-app.sh script reads `minilm_onnx_par_url` and passes it to
// DBMS_VECTOR.LOAD_ONNX_MODEL_CLOUD on first deploy.
// =============================================================================

resource "oci_objectstorage_object" "minilm_onnx" {
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
