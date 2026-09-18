#!/usr/bin/env bash
# Build the one-shot DB migrator image (Dockerfile target "migrator": Drizzle +
# migration files) and tag it as MIGRATOR_IMAGE (…/migrator:<sha>).
# Requires: MIGRATOR_IMAGE; run from repo root.
set -euo pipefail

docker build \
  -f apps/api/Dockerfile \
  --target migrator \
  -t "${MIGRATOR_IMAGE}" \
  .
