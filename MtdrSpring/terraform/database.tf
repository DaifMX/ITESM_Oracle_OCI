//================= create ATP Instance =======================================
variable "autonomous_database_db_workload" { default = "OLTP" }
variable "autonomous_database_defined_tags_value" { default = "value" }
variable "autonomous_database_license_model" { default = "BRING_YOUR_OWN_LICENSE" }
variable "autonomous_database_is_dedicated" { default = false }
# random_password (not random_string): its `result` is sensitive and its `id`
# is "none", so the generated value never lands in plan/apply logs. A
# random_string exposes the value as its id ([id=...]).
resource "random_password" "autonomous_database_wallet_password" {
  length  = 16
  special = true
}
resource "random_password" "database_admin_password" {
  length      = 12
  upper       = true
  lower       = true
  numeric     = true
  special     = false
  min_lower   = "1"
  min_upper   = "1"
  min_numeric = "1"
}
resource "oci_database_autonomous_database" "autonomous_database_atp" {
  #Required
  admin_password           = random_password.database_admin_password.result
  compartment_id           = var.ociCompartmentOcid
  cpu_core_count           = "1"
  data_storage_size_in_tbs = "1"
  db_name                  = var.mtdrDbName
  # is_free_tier = true , if there exists sufficient service limit
  is_free_tier = true
  # Free tier requires LICENSE_INCLUDED; BYOL is a paid-only feature and is
  # rejected on an Always Free DB ("feature not supported... upgrade to paid").
  license_model = "LICENSE_INCLUDED"
  #Optional #db_workload = "${var.autonomous_database_db_workload}"
  db_workload                                    = var.autonomous_database_db_workload
  db_version                                     = "26ai"
  display_name                                   = "MTDRDB"
  is_auto_scaling_enabled                        = "false"
  is_preview_version_with_service_terms_accepted = "false"

  lifecycle {
    # Always Free DBs can't be scaled -- compute/storage changes are paid-only.
    # OCI also caps a free DB to 20 GB regardless of the requested size, so the
    # 1 TB above shows as perpetual drift and Terraform fires an
    # UpdateAutonomousDatabase that 403s ("feature not supported... upgrade to
    # paid"). Ignore the sizing/compute attributes so no scale update is ever
    # attempted; the values above are only used at create time.
    ignore_changes = [
      cpu_core_count,
      data_storage_size_in_tbs,
      data_storage_size_in_gb,
      compute_count,
      compute_model,
    ]
  }
}
data "oci_database_autonomous_databases" "autonomous_databases_atp" {
  #Required
  compartment_id = var.ociCompartmentOcid
  #Optional
  display_name = "MTDRDB"
  db_workload  = var.autonomous_database_db_workload
}
//======= Name space details ------------------------------------------------------
data "oci_objectstorage_namespace" "test_namespace" {
  #Optional
  compartment_id = var.ociCompartmentOcid
}
//========= Outputs ===========================
output "ns_objectstorage_namespace" {
  value = [data.oci_objectstorage_namespace.test_namespace.namespace]
}
output "autonomous_database_admin_password" {
  value = ["Welcome12345"]
}