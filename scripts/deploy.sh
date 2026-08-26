#!/bin/bash
# Algorithm Platform - Deployment Script
# Usage: ./scripts/deploy.sh [stack-name]

set -euo pipefail

REGION="cn-northwest-1"
STACK_NAME="${1:-}"

echo "Deploying to region: ${REGION}"

cd infrastructure

if [ -n "${STACK_NAME}" ]; then
  npx cdk deploy "${STACK_NAME}" --require-approval never
else
  npx cdk deploy --all --require-approval never
fi

echo "Deployment complete."
