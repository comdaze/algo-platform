#!/bin/bash
# Goldwind Algorithm Platform - Run ML Pipeline Script
# Usage: ./scripts/run_pipeline.sh [pipeline-name]

set -euo pipefail

REGION="cn-northwest-1"
PIPELINE_NAME="${1:-goldwind-algo-pipeline}"

echo "Running pipeline: ${PIPELINE_NAME} in region: ${REGION}"

cd ml_pipeline
python run_pipeline.py --pipeline-name "${PIPELINE_NAME}" --region "${REGION}"

echo "Pipeline execution triggered."
