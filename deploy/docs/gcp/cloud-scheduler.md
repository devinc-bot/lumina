# Cloud Scheduler mini tutorial

Each environment has one Scheduler HTTP job that calls the Nest internal-jobs endpoint with a Google
OIDC token. Its schedule is `0 0 1,11,21 * *` in UTC.

The names below are for staging. Replace the project, region, job, and service-account names for
production.

## Step 1: select the staging Scheduler job

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$REGION = "us-east1"
$SCHEDULER_JOB_NAME = "lumina-internal-jobs-run-staging"
```

## Step 2: inspect the current target

```powershell

gcloud scheduler jobs list --project=$PROJECT_ID --location=$REGION
gcloud scheduler jobs describe $SCHEDULER_JOB_NAME --project=$PROJECT_ID --location=$REGION
```

## Step 3: derive the native Cloud Run target

Use the native Cloud Run URL as both the target base and OIDC audience. The runtime
`INTERNAL_JOBS_OIDC_AUDIENCE` Secret Manager value must match it exactly.

```powershell
$SERVICE_URL = gcloud run services describe lumina-api-staging `
  --project=$PROJECT_ID `
  --region=$REGION `
  --format="value(status.url)"
$URI = "$($SERVICE_URL.TrimEnd('/'))/api/internal/jobs/run"
$SCHEDULER_SERVICE_ACCOUNT = "lumina-scheduler-staging@$PROJECT_ID.iam.gserviceaccount.com"
$SCHEDULE = "0 0 1,11,21 * *"
```

The API runtime `INTERNAL_JOBS_OIDC_AUDIENCE` secret must equal `$SERVICE_URL` exactly.

## Step 4: create the HTTP job once

Before creating or updating the job, the operator needs `roles/iam.serviceAccountUser` on the
Scheduler service account. The Cloud Scheduler service agent must retain
`roles/cloudscheduler.serviceAgent` at project level to mint the OIDC token:

```powershell
$OPERATOR_EMAIL = "operator@example.com"
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$CLOUD_SCHEDULER_SERVICE_AGENT = "service-$PROJECT_NUMBER@gcp-sa-cloudscheduler.iam.gserviceaccount.com"

gcloud iam service-accounts add-iam-policy-binding $SCHEDULER_SERVICE_ACCOUNT `
  --project=$PROJECT_ID `
  --member="user:$OPERATOR_EMAIL" `
  --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$CLOUD_SCHEDULER_SERVICE_AGENT" `
  --role="roles/cloudscheduler.serviceAgent"
```

```powershell
gcloud scheduler jobs create http $SCHEDULER_JOB_NAME `
  --project=$PROJECT_ID `
  --location=$REGION `
  --schedule=$SCHEDULE `
  --time-zone=UTC `
  --uri=$URI `
  --http-method=POST `
  --oidc-service-account-email=$SCHEDULER_SERVICE_ACCOUNT `
  --oidc-token-audience=$SERVICE_URL `
  --attempt-deadline=320s
```

Skip this step if `describe` succeeded in step 2.

## Step 5: update an existing HTTP job

```powershell

gcloud scheduler jobs update http $SCHEDULER_JOB_NAME `
  --project=$PROJECT_ID `
  --location=$REGION `
  --schedule=$SCHEDULE `
  --time-zone=UTC `
  --uri=$URI `
  --http-method=POST `
  --oidc-service-account-email=$SCHEDULER_SERVICE_ACCOUNT `
  --oidc-token-audience=$SERVICE_URL `
  --attempt-deadline=320s
```

The canonical create-or-update sequence is in [CLOUD_RUN.md](../../CLOUD_RUN.md).

## Step 6: run, pause, or resume

```powershell
gcloud scheduler jobs run $SCHEDULER_JOB_NAME --project=$PROJECT_ID --location=$REGION
gcloud scheduler jobs pause $SCHEDULER_JOB_NAME --project=$PROJECT_ID --location=$REGION
gcloud scheduler jobs resume $SCHEDULER_JOB_NAME --project=$PROJECT_ID --location=$REGION
```

`run` starts a real maintenance request and can expire reservations or run cleanup immediately.
Pause only during a planned incident response, and resume after verifying the API OIDC configuration.
