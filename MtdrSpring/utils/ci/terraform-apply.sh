#!/usr/bin/env bash
# Initialises Terraform against the OCI Object Storage (S3-compatible) remote
# backend and applies the configuration. Idempotent: a no-op when the
# infrastructure already matches the committed config.
#
# The backend file is generated here (NOT committed) so that local runs of
# `source setup.sh` keep using local state, while CI uses the shared remote
# state required for "deploy only if not deployed" and for undeploy to know
# what exists.
#
# Required env vars:
#   OCI_REGION, OCI_NAMESPACE, TF_STATE_BUCKET
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY   (OCI Customer Secret Key pair)
#   TF_VAR_ociTenancyOcid, TF_VAR_ociUserOcid, TF_VAR_ociCompartmentOcid,
#   TF_VAR_ociRegionIdentifier, TF_VAR_runName, TF_VAR_mtdrDbName, TF_VAR_mtdrKey
set -euo pipefail

: "${OCI_REGION:?}" ; : "${OCI_NAMESPACE:?}" ; : "${TF_STATE_BUCKET:?}"
: "${AWS_ACCESS_KEY_ID:?}" ; : "${AWS_SECRET_ACCESS_KEY:?}"

TF_DIR="${MTDRWORKSHOP_LOCATION:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/terraform"
cd "$TF_DIR"

# S3-compatible backend block. Generated, never committed.
cat > backend_ci_override.tf <<EOF
terraform {
  backend "s3" {
    bucket                      = "${TF_STATE_BUCKET}"
    key                         = "mtdr/terraform.tfstate"
    region                      = "${OCI_REGION}"
    endpoints                   = { s3 = "https://${OCI_NAMESPACE}.compat.objectstorage.${OCI_REGION}.oraclecloud.com" }
    use_path_style              = true
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
EOF

terraform init -input=false -reconfigure
terraform apply -input=false -auto-approve
