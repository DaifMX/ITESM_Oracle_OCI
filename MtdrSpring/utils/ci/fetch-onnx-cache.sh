#!/usr/bin/env bash
# Idempotent: downloads ALL_MINILM_L12_V2_augmented.zip from Oracle's OML AI
# models Object Storage bucket (via a PreAuth URL) and extracts the .onnx into
# the cache directory the `oci_objectstorage_object.minilm_onnx` resource reads
# off disk at plan time.
#
# Both terraform-apply.sh and terraform-destroy.sh need this because
# Terraform validates the resource's `source` attribute during plan even when
# the destroy is -targeted elsewhere. Without the file on disk, plan blows up
# with "cannot get file information for the specified source".
#
# Usage:
#   bash fetch-onnx-cache.sh <cache-dir>
# Result:
#   <cache-dir>/all_MiniLM_L12_v2.onnx exists and is non-empty.
#
# Oracle's "augmented" bundle is the only one compatible with
# DBMS_VECTOR.LOAD_ONNX_MODEL (tokenizer + post-processing fused into the
# graph). If the PreAuth URL ever 401s, get the current one from:
#   https://docs.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/26/vecse&id=oml_ai_models_object_storage
set -euo pipefail

CACHE_DIR="${1:?usage: fetch-onnx-cache.sh <cache-dir>}"
ONNX_URL="${MINILM_ONNX_BUNDLE_URL:-https://adwc4pm.objectstorage.us-ashburn-1.oci.customer-oci.com/p/TtH6hL2y25EypZ0-rrczRZ1aXp7v1ONbRBfCiT-BDBN8WLKQ3lgyW6RxCfIFLdA6/n/adwc4pm/b/OML-ai-models/o/all_MiniLM_L12_v2_augmented.zip}"
ONNX_FILE="$CACHE_DIR/all_MiniLM_L12_v2.onnx"

if [ -s "$ONNX_FILE" ]; then
  exit 0
fi

echo "Fetching ALL_MINILM_L12_V2 ONNX model..."
mkdir -p "$CACHE_DIR"
onnx_tmp="$(mktemp -d)"
trap 'rm -rf "$onnx_tmp"' EXIT

curl -fsSL -o "$onnx_tmp/model.zip" "$ONNX_URL"
unzip -o "$onnx_tmp/model.zip" -d "$onnx_tmp" >/dev/null
onnx_src="$(find "$onnx_tmp" -name '*.onnx' -print -quit)"
if [ -z "$onnx_src" ]; then
  echo 'ERROR: no .onnx file found inside downloaded bundle' >&2
  exit 1
fi
mv "$onnx_src" "$ONNX_FILE"
echo "ONNX model ready: $ONNX_FILE"
