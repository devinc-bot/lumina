# Cloud Run mini tutorial

Lumina runs the public Nest API as a Cloud Run service and database migrations as a Cloud Run Job.
Use this guide to inspect a deployment, run an approved migration, and recover a compatible revision.
Routine releases run through GitHub Actions.

The names below are for staging. Replace the project, region, service, and Job names for production.

## Step 1: select the staging service

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$REGION = "us-east1"
$SERVICE_NAME = "lumina-api-staging"
```

## Step 2: inspect the deployed API

```powershell

gcloud run services list --project=$PROJECT_ID --region=$REGION
gcloud run services describe $SERVICE_NAME --project=$PROJECT_ID --region=$REGION
gcloud run services describe $SERVICE_NAME --project=$PROJECT_ID --region=$REGION `
  --format="value(status.url)"
```

The last command returns the native service URL. Use it for diagnostic requests and the Scheduler
OIDC audience.

## Step 3: inspect the migrator Job

```powershell
$MIGRATOR_JOB_NAME = "lumina-api-migrator-staging"

gcloud run jobs describe $MIGRATOR_JOB_NAME --project=$PROJECT_ID --region=$REGION
gcloud run jobs executions list --job=$MIGRATOR_JOB_NAME --project=$PROJECT_ID --region=$REGION
```

## Step 4: run a migration only when approved

Only execute the migrator after confirming the target environment, migration image, and database.
It changes the target database schema.

```powershell
gcloud run jobs execute $MIGRATOR_JOB_NAME --project=$PROJECT_ID --region=$REGION --wait
```

Wait for a successful execution before deploying an API revision that needs the new schema.

## Step 5: deploy an image for approved recovery

Prefer `.github/workflows/deploy-api-cloud-run.yml`, which builds, migrates, deploys, checks
readiness, and verifies Scheduler configuration in order. A manual image update is only appropriate
for an approved recovery after confirming that the revision is compatible with the current schema or
that its migration completed successfully:

```powershell
gcloud run deploy $SERVICE_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --image=REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/api:TAG
```

Do not add `--set-secrets` or `--clear-secrets` to an image-only update: those flags replace the
whole secret-binding set. Use [secret-manager.md](./secret-manager.md) to add a single binding.

## Step 6: verify the recovered service and Scheduler

```powershell
$SERVICE_URL = gcloud run services describe $SERVICE_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --format="value(status.url)"
$SCHEDULER_JOB_NAME = "lumina-internal-jobs-run-staging"
$SCHEDULER_SERVICE_ACCOUNT = "lumina-scheduler-staging@$PROJECT_ID.iam.gserviceaccount.com"
$SCHEDULER_URI = gcloud scheduler jobs describe $SCHEDULER_JOB_NAME `
  --project=$PROJECT_ID `
  --location=$REGION `
  --format="value(httpTarget.uri)"
$SCHEDULER_AUDIENCE = gcloud scheduler jobs describe $SCHEDULER_JOB_NAME `
  --project=$PROJECT_ID `
  --location=$REGION `
  --format="value(httpTarget.oidcToken.audience)"
$SCHEDULER_SERVICE_ACCOUNT_ACTUAL = gcloud scheduler jobs describe $SCHEDULER_JOB_NAME `
  --project=$PROJECT_ID `
  --location=$REGION `
  --format="value(httpTarget.oidcToken.serviceAccountEmail)"

Invoke-WebRequest "$($SERVICE_URL.TrimEnd('/'))/api/health/ready" -UseBasicParsing
if ($SCHEDULER_URI -ne "$($SERVICE_URL.TrimEnd('/'))/api/internal/jobs/run" -or `
  $SCHEDULER_AUDIENCE -ne $SERVICE_URL -or `
  $SCHEDULER_SERVICE_ACCOUNT_ACTUAL -ne $SCHEDULER_SERVICE_ACCOUNT) {
  throw "Cloud Scheduler does not match the recovered Cloud Run service."
}
```

## Step 7: rollback traffic to a compatible revision

```powershell
gcloud run revisions list --service=$SERVICE_NAME --project=$PROJECT_ID --region=$REGION
gcloud run services update-traffic $SERVICE_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --to-revisions=REVISION_NAME=100
```

Rollback changes traffic only; it does not reverse database migrations. Confirm schema compatibility
and review [CLOUD_RUN.md](../../CLOUD_RUN.md) before switching traffic.
