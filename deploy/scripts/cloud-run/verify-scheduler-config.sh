#!/usr/bin/env bash
# Verify the bootstrapped Cloud Scheduler HTTP target and OIDC token settings
# against the live Cloud Run service after each rollout. Requires: SERVICE_NAME,
# PROJECT_ID, REGION, SCHEDULER_JOB_NAME, SCHEDULER_SERVICE_ACCOUNT, and
# INTERNAL_JOBS_OIDC_AUDIENCE.
set -euo pipefail

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.url)')"
EXPECTED_URI="${SERVICE_URL%/}/api/internal/jobs/run"

SCHEDULER_URI="$(gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --format='value(httpTarget.uri)')"
SCHEDULER_AUDIENCE="$(gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --format='value(httpTarget.oidcToken.audience)')"
SCHEDULER_SERVICE_ACCOUNT_ACTUAL="$(gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --format='value(httpTarget.oidcToken.serviceAccountEmail)')"

if [ "${SCHEDULER_URI}" != "${EXPECTED_URI}" ]; then
  echo "Scheduler URI must be ${EXPECTED_URI}; received ${SCHEDULER_URI}." >&2
  exit 1
fi

if [ "${SCHEDULER_AUDIENCE}" != "${INTERNAL_JOBS_OIDC_AUDIENCE}" ]; then
  echo "Scheduler OIDC audience does not match INTERNAL_JOBS_OIDC_AUDIENCE." >&2
  exit 1
fi

if [ "${SCHEDULER_SERVICE_ACCOUNT_ACTUAL}" != "${SCHEDULER_SERVICE_ACCOUNT}" ]; then
  echo "Scheduler service account does not match SCHEDULER_SERVICE_ACCOUNT." >&2
  exit 1
fi
