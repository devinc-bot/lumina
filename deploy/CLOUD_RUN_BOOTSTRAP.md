# Cloud Run staging bootstrap (PowerShell)

Copy/paste operator runbook for the Lumina API on Google Cloud Run. This guide bootstraps
**staging** and records the exact commands used during the initial setup. It does not contain
credentials or secret values.

For the canonical topology and the production equivalent, read [CLOUD_RUN.md](./CLOUD_RUN.md).

## Safety rules

- Run commands from the repository root in **PowerShell 7+**.
- Do not paste database URLs, access keys, JWTs, OAuth client secrets, or payment tokens into a
  shell history, GitHub issue, chat, or committed file.
- Use a separate resource name, database, Secret Manager secret, and service account for staging.
- Keep `DATABASE_URL` pooled for the API and `DATABASE_MIGRATION_URL` direct for the migrator.
- Do not use `--force` when disabling Google APIs.

## 1. Set the project and enable the required APIs

Billing must be linked before enabling Cloud Run, Artifact Registry, Cloud Scheduler, or Secret
Manager.

```powershell
gcloud billing accounts list
gcloud billing projects link YOUR_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
gcloud billing projects describe YOUR_PROJECT_ID

gcloud config set project YOUR_PROJECT_ID

gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudscheduler.googleapis.com `
  secretmanager.googleapis.com `
  iam.googleapis.com `
  iamcredentials.googleapis.com `
  sts.googleapis.com `
  cloudresourcemanager.googleapis.com `
  logging.googleapis.com
```

If `gcloud services enable` reports `Billing account ... is not found`, stop and link billing
first. Enabling an API is not itself the billable resource; the resources created behind it are.

## 2. Create Artifact Registry

```powershell
$PROJECT_ID = gcloud config get-value project
$REGION = "southamerica-east1"
$AR_REPO = "lumina"

gcloud artifacts repositories create $AR_REPO `
  --project=$PROJECT_ID `
  --location=$REGION `
  --repository-format=docker `
  --description="Lumina API container images"

gcloud artifacts repositories describe $AR_REPO `
  --project=$PROJECT_ID `
  --location=$REGION
```

## 3. Create service accounts

```powershell
$PROJECT_ID = gcloud config get-value project

gcloud iam service-accounts create lumina-api-runtime-staging `
  --project=$PROJECT_ID --display-name="Lumina API runtime staging"
gcloud iam service-accounts create lumina-api-runtime `
  --project=$PROJECT_ID --display-name="Lumina API runtime production"

gcloud iam service-accounts create lumina-scheduler-staging `
  --project=$PROJECT_ID --display-name="Lumina Scheduler staging"
gcloud iam service-accounts create lumina-scheduler `
  --project=$PROJECT_ID --display-name="Lumina Scheduler production"

gcloud iam service-accounts create lumina-api-deploy-staging `
  --project=$PROJECT_ID --display-name="Lumina deploy staging"
gcloud iam service-accounts create lumina-api-deploy `
  --project=$PROJECT_ID --display-name="Lumina deploy production"

gcloud iam service-accounts list --project=$PROJECT_ID
```

The output does not need to be saved as a file. The service account emails are the values used in
GitHub Environments and IAM bindings.

## 4. Configure GitHub Workload Identity Federation

```powershell
$PROJECT_ID = gcloud config get-value project
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$POOL_ID = "github-actions"
$PROVIDER_ID = "github"
$GITHUB_REPOSITORY = "devinc-bot/lumina"

gcloud iam workload-identity-pools create $POOL_ID `
  --project=$PROJECT_ID `
  --location=global `
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID `
  --project=$PROJECT_ID `
  --location=global `
  --workload-identity-pool=$POOL_ID `
  --display-name="GitHub Actions provider" `
  --issuer-uri="https://token.actions.githubusercontent.com" `
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.environment=assertion.environment" `
  --attribute-condition="assertion.repository=='$GITHUB_REPOSITORY'"

gcloud iam workload-identity-pools providers describe $PROVIDER_ID `
  --project=$PROJECT_ID `
  --location=global `
  --workload-identity-pool=$POOL_ID `
  --format="value(name)"
```

Save the last output as GitHub Environment secret `GCP_WORKLOAD_IDENTITY_PROVIDER`.

Bind each GitHub Environment to only its deploy service account:

```powershell
$STAGING_MEMBER = "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.environment/staging"
$PRODUCTION_MEMBER = "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.environment/production"

gcloud iam service-accounts add-iam-policy-binding `
  "lumina-api-deploy-staging@$PROJECT_ID.iam.gserviceaccount.com" `
  --role="roles/iam.workloadIdentityUser" `
  --member=$STAGING_MEMBER

gcloud iam service-accounts add-iam-policy-binding `
  "lumina-api-deploy@$PROJECT_ID.iam.gserviceaccount.com" `
  --role="roles/iam.workloadIdentityUser" `
  --member=$PRODUCTION_MEMBER
```

## 5. Grant deploy identity access

Give both deploy identities write access only to the Artifact Registry repository:

```powershell
foreach ($DEPLOY_SA in @("lumina-api-deploy-staging", "lumina-api-deploy")) {
  gcloud artifacts repositories add-iam-policy-binding $AR_REPO `
    --project=$PROJECT_ID `
    --location=$REGION `
    --member="serviceAccount:$DEPLOY_SA@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/artifactregistry.writer"
}
```

Allow each deploy identity to attach only its matching runtime service account:

```powershell
gcloud iam service-accounts add-iam-policy-binding `
  "lumina-api-runtime-staging@$PROJECT_ID.iam.gserviceaccount.com" `
  --member="serviceAccount:lumina-api-deploy-staging@$PROJECT_ID.iam.gserviceaccount.com" `
  --role="roles/iam.serviceAccountUser"

gcloud iam service-accounts add-iam-policy-binding `
  "lumina-api-runtime@$PROJECT_ID.iam.gserviceaccount.com" `
  --member="serviceAccount:lumina-api-deploy@$PROJECT_ID.iam.gserviceaccount.com" `
  --role="roles/iam.serviceAccountUser"
```

After the staging resources exist, grant the staging deploy identity access only to them:

```powershell
$DEPLOY_SA = "lumina-api-deploy-staging@$PROJECT_ID.iam.gserviceaccount.com"

gcloud run services add-iam-policy-binding lumina-api-staging `
  --project=$PROJECT_ID `
  --region=$REGION `
  --member="serviceAccount:$DEPLOY_SA" `
  --role="roles/run.admin"

gcloud run jobs add-iam-policy-binding lumina-api-migrator-staging `
  --project=$PROJECT_ID `
  --region=$REGION `
  --member="serviceAccount:$DEPLOY_SA" `
  --role="roles/run.developer"
```

`roles/run.admin` is intentionally scoped to the single staging service: the automated command
uses `--allow-unauthenticated`, which updates the service IAM policy. Do not grant it at project
scope.

The workflow also reads the known Scheduler job to verify its URI and OIDC settings. Create a
read-only custom role with the single required permission:

```powershell
gcloud iam roles create luminaSchedulerJobReader `
  --project=$PROJECT_ID `
  --title="Lumina Scheduler Job Reader" `
  --description="Read a known Cloud Scheduler job for deployment verification." `
  --permissions="cloudscheduler.jobs.get" `
  --stage="GA"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$DEPLOY_SA" `
  --role="projects/$PROJECT_ID/roles/luminaSchedulerJobReader"
```

## 6. Configure GitHub Environments

Create GitHub Environments `staging` and `production`. Require reviewers on `production`.

### Staging secrets

| Name | Value |
| --- | --- |
| `GCP_PROJECT_ID` | GCP project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full WIF provider resource name |
| `GCP_SERVICE_ACCOUNT` | `lumina-api-deploy-staging@PROJECT_ID.iam.gserviceaccount.com` |

### Staging variables

| Name | Value |
| --- | --- |
| `GCP_REGION` | `southamerica-east1` |
| `AR_REPO` | `lumina` |
| `SERVICE_NAME` | `lumina-api-staging` |
| `MIGRATOR_JOB_NAME` | `lumina-api-migrator-staging` |
| `RUNTIME_SERVICE_ACCOUNT` | `lumina-api-runtime-staging@PROJECT_ID.iam.gserviceaccount.com` |
| `SCHEDULER_JOB_NAME` | `lumina-internal-jobs-run-staging` |
| `SCHEDULER_SERVICE_ACCOUNT` | `lumina-scheduler-staging@PROJECT_ID.iam.gserviceaccount.com` |
| `INTERNAL_JOBS_OIDC_AUDIENCE` | `https://api-staging.lumina-events.com` |

Use the equivalent production names only after production secrets, domains, and approval controls
are ready. The OIDC audience must be the same exact HTTPS value in the GitHub variable, Cloud
Scheduler job, and the API runtime configuration.

## 7. Create and grant staging secrets

Create secret values through **Google Cloud Console → Secret Manager**. Do not copy populated
`.env` files into Git. Create these staging secret names:

```text
lumina-staging-database-url
lumina-staging-database-migration-url
lumina-staging-jwt-secret
lumina-staging-refresh-token-secret
lumina-staging-google-client-id
lumina-staging-google-client-secret
lumina-staging-aws-access-key-id
lumina-staging-aws-secret-access-key
lumina-staging-mercadopago-access-token
lumina-staging-mercadopago-webhook-secret
lumina-staging-r2-access-key-id
lumina-staging-r2-secret-access-key
lumina-staging-internal-jobs-oidc-audience
lumina-staging-internal-jobs-oidc-allowed-service-accounts
```

Generate separate JWT values; never reuse the access and refresh secrets:

```powershell
$bytes = [byte[]]::new(48)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Grant the runtime service account access to every staging secret:

```powershell
$RUNTIME_SA = "lumina-api-runtime-staging@$PROJECT_ID.iam.gserviceaccount.com"
$RUNTIME_SECRETS = @(
  "lumina-staging-database-url",
  "lumina-staging-database-migration-url",
  "lumina-staging-jwt-secret",
  "lumina-staging-refresh-token-secret",
  "lumina-staging-google-client-id",
  "lumina-staging-google-client-secret",
  "lumina-staging-aws-access-key-id",
  "lumina-staging-aws-secret-access-key",
  "lumina-staging-mercadopago-access-token",
  "lumina-staging-mercadopago-webhook-secret",
  "lumina-staging-r2-access-key-id",
  "lumina-staging-r2-secret-access-key",
  "lumina-staging-internal-jobs-oidc-audience",
  "lumina-staging-internal-jobs-oidc-allowed-service-accounts"
)

foreach ($SECRET_NAME in $RUNTIME_SECRETS) {
  gcloud secrets add-iam-policy-binding $SECRET_NAME `
    --project=$PROJECT_ID `
    --member="serviceAccount:$RUNTIME_SA" `
    --role="roles/secretmanager.secretAccessor"
}
```

The deploy identity must not receive `roles/secretmanager.secretAccessor`.

## 8. Configure external staging providers

Use distinct staging credentials; do not reuse production credentials.

- **Google OAuth:** create a web client for staging with exact redirect URI
  `https://api-staging.lumina-events.com/api/auth/google/callback`. Store its client id and client
  secret in the matching Secret Manager secrets.
- **AWS SES:** create a dedicated staging IAM user with `ses:SendEmail`; verify the `MAIL_FROM`
  identity in `sa-east-1`. Store its access key pair in Secret Manager.
- **Mercado Pago:** use test credentials and configure the test webhook URL as
  `https://api-staging.lumina-events.com/api/mercado-pago/webhook`. Store the access token and
  webhook secret in Secret Manager; set `MERCADOPAGO_TEST_MODE=true`.
- **Cloudflare R2:** create private bucket `lumina-staging`; create an `Object Read & Write` API
  token limited to that bucket. Attach public custom domain
  `assets-staging.lumina-events.com` only for public event/media objects. Store the R2 access key
  pair in Secret Manager. Use `R2_BUCKET=lumina-staging` and
  `R2_PUBLIC_BASE_URL=https://assets-staging.lumina-events.com` as ordinary runtime variables.

## 9. Build and push bootstrap images

Docker Desktop must be running with the Linux engine. Confirm it before building:

```powershell
docker info
```

```powershell
$PROJECT_ID = gcloud config get-value project
$REGION = "southamerica-east1"
$AR_REPO = "lumina"
$IMAGE_TAG = git rev-parse --short HEAD
$API_IMAGE = "$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO/api:$IMAGE_TAG"
$MIGRATOR_IMAGE = "$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO/migrator:$IMAGE_TAG"

gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

docker build -f apps/api/Dockerfile --target runtime -t $API_IMAGE .
docker build -f apps/api/Dockerfile --target migrator -t $MIGRATOR_IMAGE .

docker push $API_IMAGE
docker push $MIGRATOR_IMAGE
```

If Docker reports that `dockerDesktopLinuxEngine` cannot be found, start Docker Desktop and wait
until `docker info` shows a Server section before retrying the build and push commands.

## 10. Bootstrap migrator and API service

Deploy and execute the migrator before sending traffic to a new API revision:

```powershell
$MIGRATOR_JOB_NAME = "lumina-api-migrator-staging"
$RUNTIME_SA = "lumina-api-runtime-staging@$PROJECT_ID.iam.gserviceaccount.com"

gcloud run jobs deploy $MIGRATOR_JOB_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --image=$MIGRATOR_IMAGE `
  --service-account=$RUNTIME_SA `
  --max-retries=0 `
  --task-timeout=900s `
  --set-secrets="DATABASE_MIGRATION_URL=lumina-staging-database-migration-url:latest"

gcloud run jobs execute $MIGRATOR_JOB_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --wait
```

Deploy the public API. The prompt values are ordinary configuration, not credentials:

```powershell
$SERVICE_NAME = "lumina-api-staging"
$MAIL_FROM = Read-Host "MAIL_FROM (verified in SES)"
$MAIL_SMOKE_TO = Read-Host "MAIL_SMOKE_TO"
$R2_ACCOUNT_ID = Read-Host "R2_ACCOUNT_ID"

gcloud run deploy $SERVICE_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --image=$API_IMAGE `
  --service-account=$RUNTIME_SA `
  --allow-unauthenticated `
  --min-instances=0 `
  --max-instances=2 `
  --port=3000 `
  --cpu=1 `
  --memory=512Mi `
  --concurrency=40 `
  --timeout=180s `
  --set-env-vars="NODE_ENV=production,ENABLE_IN_PROCESS_SCHEDULERS=false,DATABASE_POOL_MAX=3,API_PUBLIC_URL=https://api-staging.lumina-events.com,WEB_URL=https://staging.lumina-events.com,DASHBOARD_URL=https://dashboard-staging.lumina-events.com,ADMIN_URL=https://admin-staging.lumina-events.com,TRUST_PROXY_HOPS=1,AWS_REGION=sa-east-1,MAIL_FROM=$MAIL_FROM,MAIL_SMOKE_TO=$MAIL_SMOKE_TO,MERCADOPAGO_TEST_MODE=true,R2_ACCOUNT_ID=$R2_ACCOUNT_ID,R2_BUCKET=lumina-staging,R2_PUBLIC_BASE_URL=https://assets-staging.lumina-events.com" `
  --set-secrets="DATABASE_URL=lumina-staging-database-url:latest,JWT_SECRET=lumina-staging-jwt-secret:latest,REFRESH_TOKEN_SECRET=lumina-staging-refresh-token-secret:latest,GOOGLE_CLIENT_ID=lumina-staging-google-client-id:latest,GOOGLE_CLIENT_SECRET=lumina-staging-google-client-secret:latest,AWS_ACCESS_KEY_ID=lumina-staging-aws-access-key-id:latest,AWS_SECRET_ACCESS_KEY=lumina-staging-aws-secret-access-key:latest,MERCADOPAGO_ACCESS_TOKEN=lumina-staging-mercadopago-access-token:latest,MERCADOPAGO_WEBHOOK_SECRET=lumina-staging-mercadopago-webhook-secret:latest,R2_ACCESS_KEY_ID=lumina-staging-r2-access-key-id:latest,R2_SECRET_ACCESS_KEY=lumina-staging-r2-secret-access-key:latest,INTERNAL_JOBS_OIDC_AUDIENCE=lumina-staging-internal-jobs-oidc-audience:latest,INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS=lumina-staging-internal-jobs-oidc-allowed-service-accounts:latest"
```

`--max-instances=2` intentionally matches `deploy/scripts/cloud-run/deploy-service.sh`. Change
the script and this document together if the limit becomes `3`.

## 11. Verify readiness and configure Scheduler

```powershell
$SERVICE_URL = gcloud run services describe lumina-api-staging `
  --project=$PROJECT_ID `
  --region=$REGION `
  --format="value(status.url)"

$SERVICE_URL

$response = Invoke-WebRequest `
  -Uri "$SERVICE_URL/api/health/ready" `
  -SkipHttpErrorCheck

$response.StatusCode
$response.Content
```

Expect HTTP `200`. Then create the one staging Scheduler job:

```powershell
$SCHEDULER_JOB_NAME = "lumina-internal-jobs-run-staging"
$SCHEDULER_SA = "lumina-scheduler-staging@$PROJECT_ID.iam.gserviceaccount.com"
$AUDIENCE = "https://api-staging.lumina-events.com"
$URI = "$SERVICE_URL/api/internal/jobs/run"

gcloud scheduler jobs create http $SCHEDULER_JOB_NAME `
  --project=$PROJECT_ID `
  --location=$REGION `
  --schedule="0 0 1,11,21 * *" `
  --time-zone="UTC" `
  --uri=$URI `
  --http-method=POST `
  --oidc-service-account-email=$SCHEDULER_SA `
  --oidc-token-audience=$AUDIENCE `
  --attempt-deadline="320s"
```

Force one execution and inspect it:

```powershell
gcloud scheduler jobs run lumina-internal-jobs-run-staging `
  --project=$PROJECT_ID `
  --location=$REGION

Start-Sleep -Seconds 15

gcloud logging read `
  'resource.type="cloud_scheduler_job" AND resource.labels.job_id="lumina-internal-jobs-run-staging"' `
  --project=$PROJECT_ID `
  --freshness=30m `
  --limit=10 `
  --format=json
```

An `httpRequest.status` of `200` confirms Scheduler → OIDC token → API successfully completed.

## 12. Trigger automated staging deployments

The deploy workflow uses `workflow_run`, so GitHub only recognizes it after the workflow file is
on the repository default branch (`main`). During the staging bootstrap, its branch filter is
intentionally limited to `staging`; production remains disabled until its independent setup is
complete.

After the workflow pull request is merged into `main`, merge or push the verified API changes to
`staging`. A successful `CI` workflow on `staging` triggers deployment of that exact CI SHA.

## 13. List and disable unused Google APIs

List enabled APIs in PowerShell:

```powershell
gcloud services list --enabled --project=$PROJECT_ID --format="value(config.name)" |
  Select-String -Pattern "run|artifactregistry|cloudscheduler|secretmanager|iam|sts|logging"
```

Keep these APIs enabled for this deployment:

```text
run.googleapis.com
artifactregistry.googleapis.com
cloudscheduler.googleapis.com
secretmanager.googleapis.com
iam.googleapis.com
iamcredentials.googleapis.com
sts.googleapis.com
cloudresourcemanager.googleapis.com
logging.googleapis.com
```

It is generally safe to disable unused analytics APIs if the project has no workloads depending on
them. Review the list first, then run the following as **one PowerShell command**:

```powershell
gcloud services disable analyticshub.googleapis.com bigquery.googleapis.com bigqueryconnection.googleapis.com bigquerydatapolicy.googleapis.com bigquerydatatransfer.googleapis.com bigquerymigration.googleapis.com bigqueryreservation.googleapis.com bigquerystorage.googleapis.com cloudtrace.googleapis.com dataform.googleapis.com dataplex.googleapis.com --project=$PROJECT_ID
```

Do not disable the Cloud Run deployment APIs above. Also keep these platform APIs unless you have
verified no other workload uses them:

```text
cloudapis.googleapis.com
logging.googleapis.com
monitoring.googleapis.com
servicemanagement.googleapis.com
serviceusage.googleapis.com
telemetry.googleapis.com
```

Treat the following as separate, deliberate decisions: `datastore.googleapis.com`,
`sql-component.googleapis.com`, `storage.googleapis.com`, `storage-api.googleapis.com`, and
`storage-component.googleapis.com`. Disabling an API does not delete data or automatically stop
resource billing; it can break existing workloads. Never use `--force` for API deactivation.
