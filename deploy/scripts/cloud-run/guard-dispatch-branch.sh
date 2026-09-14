#!/usr/bin/env bash
# Fail fast on workflow_dispatch if the chosen Environment does not match the
# branch (staging → refs/heads/staging, production → refs/heads/main).
# Requires: DISPATCH_ENVIRONMENT, GITHUB_REF
set -euo pipefail

case "${DISPATCH_ENVIRONMENT}" in
  staging)
    test "${GITHUB_REF}" = "refs/heads/staging" \
      || { echo "Dispatch environment 'staging' requires branch staging." >&2; exit 1; }
    ;;
  production)
    test "${GITHUB_REF}" = "refs/heads/main" \
      || { echo "Dispatch environment 'production' requires branch main." >&2; exit 1; }
    ;;
  *)
    echo "Unsupported environment: ${DISPATCH_ENVIRONMENT}" >&2
    exit 1
    ;;
esac
