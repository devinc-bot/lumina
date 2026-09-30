# Cloud Logging mini tutorial

Cloud Run writes service and Job output to Cloud Logging. Start with a narrow resource query, then
inspect the matching migration execution when diagnosing a deploy.

The names below are for staging. Replace the project, region, service, and Job names for production.

## Step 1: select the service

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$REGION = "us-east1"
$SERVICE_NAME = "lumina-api-staging"
```

## Step 2: read the latest API logs

```powershell

gcloud run services logs read $SERVICE_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --limit=50
```

## Step 3: read migrator Job logs

```powershell
$MIGRATOR_JOB_NAME = "lumina-api-migrator-staging"

gcloud run jobs logs read $MIGRATOR_JOB_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --limit=50
```

## Step 4: narrow the incident

Pair the log read with `gcloud run services describe` and the readiness probe documented in
[CLOUD_RUN.md](../../CLOUD_RUN.md). Do not copy logs containing sensitive runtime metadata into
issues or chat.
