#!/usr/bin/env bash
# Push the API image built in this job to Artifact Registry. Requires: API_IMAGE.
set -euo pipefail

docker push "${API_IMAGE}"
