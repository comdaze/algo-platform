#!/usr/bin/env bash
# Phase 0 spike: run MLZero against a dataset using a China OpenAI-compatible LLM.
#
# Usage:
#   export LLM_ENDPOINT_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
#   export LLM_MODEL_ID="qwen2.5-72b-instruct"
#   export OPENAI_API_KEY="sk-..."          # the key MLZero's openai provider reads
#   bash run.sh /path/to/dataset-dir
#
# These 3 map 1:1 to the platform's global LLM settings (Endpoint/Model/API Key).
set -euo pipefail

DATASET="${1:?usage: run.sh <dataset-dir>}"
: "${LLM_ENDPOINT_URL:?set LLM_ENDPOINT_URL}"
: "${LLM_MODEL_ID:?set LLM_MODEL_ID}"
: "${OPENAI_API_KEY:?set OPENAI_API_KEY}"

HERE="$(cd "$(dirname "$0")" && pwd)"
CFG="$(mktemp /tmp/mlzero_config_XXXX.yaml)"
sed -e "s|__PROXY_URL__|${LLM_ENDPOINT_URL}|g" \
    -e "s|__MODEL_ID__|${LLM_MODEL_ID}|g" \
    "${HERE}/custom_config.template.yaml" > "${CFG}"

echo "== rendered config (${CFG}) =="
grep -E "provider|model|proxy_url" "${CFG}"

# shellcheck disable=SC1090
[ -f ~/mlzero-venv/bin/activate ] && source ~/mlzero-venv/bin/activate || true

echo "== running MLZero =="
time mlzero -i "${DATASET}" -c "${CFG}"
echo "== done. Inspect the generated solution/artifacts in the run output dir. =="
