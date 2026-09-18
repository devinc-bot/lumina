#!/usr/bin/env bash
# Allow docker push/pull to Artifact Registry for this region
# (REGION-docker.pkg.dev). Requires: REGION; gcloud already authenticated.
set -euo pipefail

gcloud auth configure-docker \
  "${REGION}-docker.pkg.dev" \
  --quiet
