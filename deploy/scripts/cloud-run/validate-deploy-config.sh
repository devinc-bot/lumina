#!/usr/bin/env bash
# Fail before authenticating or changing GCP when a required environment-specific
# deployment value is missing. Values come from the selected GitHub Environment.
set -euo pipefail

REQUIRED_VARIABLES=(
  PROJECT_ID
  REGION
  REPOSITORY
  SERVICE_NAME
  MIGRATOR_JOB_NAME
  RUNTIME_SERVICE_ACCOUNT
  SCHEDULER_JOB_NAME
  SCHEDULER_SERVICE_ACCOUNT
  INTERNAL_JOBS_OIDC_AUDIENCE
)

for variable_name in "${REQUIRED_VARIABLES[@]}"; do
  if [ -z "${!variable_name:-}" ]; then
    echo "Missing required deployment configuration: ${variable_name}" >&2
    exit 1
  fi
done

case "${INTERNAL_JOBS_OIDC_AUDIENCE}" in
  https://*) ;;
  *)
    echo "INTERNAL_JOBS_OIDC_AUDIENCE must be an HTTPS URL." >&2
    exit 1
    ;;
esac
