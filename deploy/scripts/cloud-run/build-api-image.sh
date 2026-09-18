#!/usr/bin/env bash
# Build the Nest API runtime image (Dockerfile target "runtime") and tag it as
# API_IMAGE (…/api:<sha>). Requires: API_IMAGE; run from repo root.
set -euo pipefail

docker build \
  -f apps/api/Dockerfile \
  --target runtime \
  -t "${API_IMAGE}" \
  .
