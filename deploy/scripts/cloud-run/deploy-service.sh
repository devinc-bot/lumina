#!/usr/bin/env bash
# Roll out the Cloud Run API service to the new API_IMAGE (scale-to-zero,
# public ingress). Update Mercado Pago config and Secret Manager bindings on each deploy
# while preserving every other existing binding. Requires: SERVICE_NAME, PROJECT_ID,
# REGION, API_IMAGE, Mercado Pago runtime config, and Mercado Pago *_SECRET_ID values;
# optional: RUNTIME_SERVICE_ACCOUNT.
set -euo pipefail

RUNTIME_ENV_VARS=(
  "NODE_ENV=production"
  "ENABLE_IN_PROCESS_SCHEDULERS=false"
  "DATABASE_POOL_MAX=3"
  "MERCADOPAGO_MARKETPLACE_ENABLED=${MERCADOPAGO_MARKETPLACE_ENABLED}"
  "MERCADOPAGO_TEST_MODE=${MERCADOPAGO_TEST_MODE}"
  "MERCADOPAGO_OAUTH_REDIRECT_URI=${MERCADOPAGO_OAUTH_REDIRECT_URI}"
  "MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY_VERSION=${MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY_VERSION}"
)
RUNTIME_ENV_VARS_CSV="$(IFS=,; printf '%s' "${RUNTIME_ENV_VARS[*]}")"

ARGS=(
  run deploy "${SERVICE_NAME}"
  --project="${PROJECT_ID}"
  --region="${REGION}"
  --platform=managed
  --image="${API_IMAGE}"
  --allow-unauthenticated
  --min-instances=0
  --max-instances=2
  --port=3000
  --cpu=1
  --memory=512Mi
  --concurrency=40
  --timeout=180s
  --update-env-vars="${RUNTIME_ENV_VARS_CSV}"
)
if [ -n "${RUNTIME_SERVICE_ACCOUNT:-}" ]; then
  ARGS+=(--service-account="${RUNTIME_SERVICE_ACCOUNT}")
fi
gcloud "${ARGS[@]}"
