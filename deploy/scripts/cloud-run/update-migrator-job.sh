#!/usr/bin/env bash
# Point the Cloud Run Job at the new migrator image (does not run migrations yet).
# Omit --set-secrets / --clear-secrets so existing Secret Manager bindings remain.
# Requires: MIGRATOR_JOB_NAME, PROJECT_ID, REGION, MIGRATOR_IMAGE;
# optional: RUNTIME_SERVICE_ACCOUNT.
set -euo pipefail

ARGS=(
  run jobs deploy "${MIGRATOR_JOB_NAME}"
  --project="${PROJECT_ID}"
  --region="${REGION}"
  --image="${MIGRATOR_IMAGE}"
  --max-retries=0
  --task-timeout=900s
)
if [ -n "${RUNTIME_SERVICE_ACCOUNT:-}" ]; then
  ARGS+=(--service-account="${RUNTIME_SERVICE_ACCOUNT}")
fi
gcloud "${ARGS[@]}"
