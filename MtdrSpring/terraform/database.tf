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
  display_name                                   = "MTDRDB"
  is_auto_scaling_enabled                        = "false"
  is_preview_version_with_service_terms_accepted = "false"
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