#!/usr/bin/env bash
# Stops OCI compute charges while PRESERVING the database and its data.
#
# It targets only the billed compute -- the OKE cluster + node pool -- and
# sweeps the Load Balancer the Kubernetes Service created (not in Terraform
# state, so it would otherwise orphan and keep billing). The Always-Free ATP
# database, its bucket, the container repo and the VCN are left untouched, so
# the next deploy recreates the cluster against the existing DB with all data
# intact.
#
# Same required env vars as terraform-apply.sh, plus the TF_VAR_* set.
set -euo pipefail

: "${OCI_REGION:?}" ; : "${OCI_NAMESPACE:?}" ; : "${TF_STATE_BUCKET:?}"
: "${AWS_ACCESS_KEY_ID:?}" ; : "${AWS_SECRET_ACCESS_KEY:?}"
: "${TF_VAR_ociCompartmentOcid:?}"

TF_DIR="${MTDRWORKSHOP_LOCATION:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/terraform"
cd "$TF_DIR"

# See terraform-apply.sh: OCI's S3-compatible endpoint rejects aws-chunked
# uploads, so make the AWS SDK add checksums only when required.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

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

# Delete the Service-created Load Balancers first so terraform can drop the
# subnets/VCN cleanly, and so no orphan LB keeps billing.
echo "Sweeping Load Balancers in compartment ${TF_VAR_ociCompartmentOcid}"
LBIDS=$(oci lb load-balancer list --compartment-id "$TF_VAR_ociCompartmentOcid" \
  --query "join(' ',data[*].id)" --raw-output 2>/dev/null || true)
for lb in $LBIDS; do
  echo "Deleting LB $lb"
  oci lb load-balancer delete --load-balancer-id "$lb" --force || true
done

# Targeted destroy: only the compute. Anything depending on these (nothing
# else does) goes too; the DB, bucket, repo and VCN stay in state.
# stdout is discarded so the plan/destroy text (which can echo non-redacted
# resource attributes) never lands in the CI log; errors stay on stderr.
echo "Destroying compute (node pool + cluster)..."
terraform destroy -input=false -auto-approve \
  -target=oci_containerengine_node_pool.oke_node_pool \
  -target=oci_containerengine_cluster.mtdrworkshop_cluster >/dev/null
echo "Destroy complete."

echo
echo "Compute torn down. The ATP database, bucket and VCN were preserved."
echo "Verify in the OCI Console that the OKE node pool, its boot volumes, and"
echo "the Load Balancer are gone (Terraform occasionally leaves boot volumes"
echo "behind). The DB should still be present with your data."
