#!/usr/bin/env bash
# Roll out the Cloud Run API service to the new API_IMAGE (scale-to-zero,
# public ingress). Omit --set-secrets / --clear-secrets so existing Secret
# Manager bindings remain. Requires: SERVICE_NAME, PROJECT_ID, REGION, API_IMAGE;
# optional: RUNTIME_SERVICE_ACCOUNT.
set -euo pipefail

ARGS=(
  run deploy "${SERVICE_NAME}"
  --project="${PROJECT_ID}"
  --region="${REGION}"
  --platform=managed
  --image="${API_IMAGE}"
  --allow-unauthenticated
  --min-instances=0
  --max-instances=2
  --port=3000
  --cpu=1
  --memory=512Mi
  --concurrency=40
  --timeout=180s
  --update-env-vars=NODE_ENV=production,ENABLE_IN_PROCESS_SCHEDULERS=false,DATABASE_POOL_MAX=3
)
if [ -n "${RUNTIME_SERVICE_ACCOUNT:-}" ]; then
  ARGS+=(--service-account="${RUNTIME_SERVICE_ACCOUNT}")
fi
gcloud "${ARGS[@]}"
