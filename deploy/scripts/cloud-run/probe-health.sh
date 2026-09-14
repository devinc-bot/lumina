#!/usr/bin/env bash
# Resolve the Cloud Run service URL and GET /api/health/ready with retries to
# confirm the new revision can connect to the runtime database. Requires:
# SERVICE_NAME, PROJECT_ID, REGION.
set -euo pipefail

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.url)')"
curl --fail --retry 5 --retry-delay 5 --retry-all-errors \
  "${SERVICE_URL%/}/api/health/ready"
