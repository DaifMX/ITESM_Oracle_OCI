#!/usr/bin/env bash
# Downloads the ALL_MINILM_L12_V2 ONNX embedding model into the local cache
# the dev DB container bind-mounts. Idempotent: the file is ~80 MB, so we
# never want to re-fetch.
#
# Mirrors what MtdrSpring/terraform/embeddings.tf does in the cloud path.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEST_DIR="$REPO_ROOT/MtdrSpring/.dev/embeddings"
DEST_FILE="$DEST_DIR/all_MiniLM_L12_v2.onnx"
# Oracle's "augmented" bundle is the only one that works with
# DBMS_VECTOR.LOAD_ONNX_MODEL -- it has the tokenizer + post-processing
# fused into the ONNX graph. The plain all_MiniLM_L12_v2.zip is the
# upstream HuggingFace export and is NOT compatible with VECTOR_EMBEDDING.
#
# This PreAuth URL can rotate. If curl returns 401, grab the current URL
# from Oracle's docs lookup page:
#   https://docs.oracle.com/pls/topic/lookup?ctx=en/database/oracle/oracle-database/26/vecse&id=oml_ai_models_object_storage
SRC_URL='https://adwc4pm.objectstorage.us-ashburn-1.oci.customer-oci.com/p/TtH6hL2y25EypZ0-rrczRZ1aXp7v1ONbRBfCiT-BDBN8WLKQ3lgyW6RxCfIFLdA6/n/adwc4pm/b/OML-ai-models/o/all_MiniLM_L12_v2_augmented.zip'

mkdir -p "$DEST_DIR" 2>/dev/null || true

# compose.dev.yml bind-mounts this directory. If docker brought the DB up
# before this script ran, the daemon created the host directory as root and
# the unprivileged `mv` below will fail with a confusing "Permission denied".
# Detect that here and tell the user exactly what to fix.
if [ ! -w "$DEST_DIR" ]; then
  echo "ERROR: $DEST_DIR is not writable by $USER." >&2
  echo "       This usually means \`docker compose up\` created it as root." >&2
  echo "       Fix:  sudo chown -R \"\$USER\":\"\$USER\" $REPO_ROOT/MtdrSpring/.dev" >&2
  echo "       Then re-run this script." >&2
  exit 1
fi

if [ -s "$DEST_FILE" ]; then
  echo "ONNX model already present at $DEST_FILE -- skipping download."
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading ALL_MINILM_L12_V2 ONNX bundle..."
curl -fsSL -o "$tmp/all_MiniLM_L12_v2.zip" "$SRC_URL"
unzip -o "$tmp/all_MiniLM_L12_v2.zip" -d "$tmp" >/dev/null

# Oracle's archive nests the .onnx file at varying depths; normalize.
onnx_path="$(find "$tmp" -name '*.onnx' -print -quit)"
if [ -z "$onnx_path" ]; then
  echo "ERROR: no .onnx file found inside downloaded bundle" >&2
  exit 1
fi
mv "$onnx_path" "$DEST_FILE"

echo "ONNX model ready: $DEST_FILE"
