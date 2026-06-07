#!/usr/bin/env bash
# Writes ~/.oci/config + private key from environment so that both the OCI CLI
# and the OCI Terraform provider (which falls back to the DEFAULT profile when
# no credentials are set in the provider block) authenticate non-interactively.
#
# Required env vars (set from GitHub Actions secrets):
#   OCI_TENANCY_OCID, OCI_USER_OCID, OCI_FINGERPRINT, OCI_REGION, OCI_PRIVATE_KEY
set -euo pipefail

: "${OCI_TENANCY_OCID:?OCI_TENANCY_OCID is required}"
: "${OCI_USER_OCID:?OCI_USER_OCID is required}"
: "${OCI_FINGERPRINT:?OCI_FINGERPRINT is required}"
: "${OCI_REGION:?OCI_REGION is required}"
: "${OCI_PRIVATE_KEY:?OCI_PRIVATE_KEY is required}"

mkdir -p "$HOME/.oci"
KEY_FILE="$HOME/.oci/oci_api_key.pem"

# Support keys passed either as raw PEM or base64-encoded PEM.
if printf '%s' "$OCI_PRIVATE_KEY" | grep -q 'BEGIN .*PRIVATE KEY'; then
  printf '%s\n' "$OCI_PRIVATE_KEY" > "$KEY_FILE"
else
  printf '%s' "$OCI_PRIVATE_KEY" | base64 -d > "$KEY_FILE"
fi
chmod 600 "$KEY_FILE"

cat > "$HOME/.oci/config" <<EOF
[DEFAULT]
user=${OCI_USER_OCID}
fingerprint=${OCI_FINGERPRINT}
tenancy=${OCI_TENANCY_OCID}
region=${OCI_REGION}
key_file=${KEY_FILE}
EOF
chmod 600 "$HOME/.oci/config"

echo "Wrote ~/.oci/config for user ${OCI_USER_OCID} in region ${OCI_REGION}"
