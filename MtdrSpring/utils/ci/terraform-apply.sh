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

# Resolve absolute paths up front -- the `cd` below would otherwise break any
# later $(dirname "${BASH_SOURCE[0]}") that relies on the original invocation.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${MTDRWORKSHOP_LOCATION:-$(cd "$SCRIPT_DIR/../.." && pwd)}/terraform"
cd "$TF_DIR"

# OCI Object Storage's S3-compatible endpoint rejects the AWS SDK's default
# aws-chunked / flexible-checksum uploads with "501 NotImplemented: AWS chunked
# encoding not supported". skip_s3_checksum in the backend isn't enough on
# modern Terraform; these tell the bundled AWS SDK to only add checksums when a
# request actually requires them, so state writes use a plain PutObject.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

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

# -upgrade so the provider source swap (hashicorp/oci -> oracle/oci) and its
# version constraint are re-resolved and the (uncommitted) lock is rebuilt.
terraform init -input=false -reconfigure -upgrade

# The ONNX embedding model must be on disk BEFORE `terraform plan`:
# oci_objectstorage_object.minilm_onnx reads its `source` file to hash it at
# plan time. A null_resource can't supply it (those run at apply, too late).
# fetch-onnx-cache.sh is idempotent (skips when the file is already there).
bash "$SCRIPT_DIR/fetch-onnx-cache.sh" "$TF_DIR/.cache"

# Plan to a file, with the diff sent to /dev/null. The plan's full attribute
# diff is the real leak surface -- it prints every value, including ones
# Terraform doesn't redact -- and nobody needs it streamed. The saved plan
# drives the apply, so what runs is exactly what was planned.
echo "Planning..."
terraform plan -input=false -out=tfplan >/dev/null

# Apply the saved plan with visible progress. A saved-plan apply streams only
# resource addresses, OCIDs and "Still creating..." timers (no attribute
# values), and Terraform redacts anything sensitive (random_password etc.), so
# this is safe to log while still showing what's happening.
echo "Applying..."
terraform apply -input=false -auto-approve tfplan
