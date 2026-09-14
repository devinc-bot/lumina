#!/usr/bin/env bash
# Push the migrator image to Artifact Registry. Requires: MIGRATOR_IMAGE.
set -euo pipefail

docker push "${MIGRATOR_IMAGE}"
