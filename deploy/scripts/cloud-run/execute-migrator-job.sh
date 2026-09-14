#!/usr/bin/env bash
# Run the migrator Job once and wait until it finishes (applies pending DB
# migrations before the API revision rolls out). Requires: MIGRATOR_JOB_NAME,
# PROJECT_ID, REGION.
set -euo pipefail

gcloud run jobs execute "${MIGRATOR_JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --wait
