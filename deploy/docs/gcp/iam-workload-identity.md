# IAM and Workload Identity Federation mini tutorial

Lumina uses separate runtime, Scheduler, and deploy service accounts per environment. GitHub Actions
uses Workload Identity Federation (WIF), never a stored service-account JSON key.

The names below are for staging. Create separate runtime, Scheduler, deploy, and WIF bindings for
production; never share a deploy identity across environments.

## Step 1: get the runtime service account

`RUNTIME_SERVICE_ACCOUNT` is the service-account email attached to the API service and migrator
Job. The deployment workflow assigns the same value to both. If the Cloud Run service already
exists, retrieve its current runtime identity directly:

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$REGION = "us-east1"
$SERVICE_NAME = "lumina-api-staging"

$RUNTIME_SERVICE_ACCOUNT = gcloud run services describe $SERVICE_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --format="value(spec.template.spec.serviceAccountName)"

$RUNTIME_SERVICE_ACCOUNT
```

For staging, the expected email is
`lumina-api-runtime-staging@$PROJECT_ID.iam.gserviceaccount.com`. List service accounts if the
service has not been bootstrapped yet. For a first bootstrap, set the expected email before
continuing:

```powershell
$RUNTIME_SERVICE_ACCOUNT = "lumina-api-runtime-staging@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts list `
  --project=$PROJECT_ID `
  --format="table(email,displayName)"
```

## Step 2: inspect the service-account inventory

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"

gcloud iam service-accounts list --project=$PROJECT_ID
gcloud iam service-accounts describe $RUNTIME_SERVICE_ACCOUNT --project=$PROJECT_ID
gcloud projects get-iam-policy $PROJECT_ID
```

## Step 3: create the runtime and Scheduler accounts when they do not exist

```powershell
gcloud iam service-accounts create lumina-api-runtime-staging `
  --project=$PROJECT_ID `
  --display-name="Lumina staging API runtime"

$RUNTIME_SERVICE_ACCOUNT = "lumina-api-runtime-staging@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts create lumina-scheduler-staging `
  --project=$PROJECT_ID `
  --display-name="Lumina staging Scheduler"

$SCHEDULER_SERVICE_ACCOUNT = "lumina-scheduler-staging@$PROJECT_ID.iam.gserviceaccount.com"
```

Use distinct accounts for `runtime`, `scheduler`, and `deploy` in both staging and production.
Grant roles at the narrowest resource scope: the runtime account receives Secret Manager access only
to its environment's secrets; the deploy account receives only the Artifact Registry, Cloud Run,
and Scheduler-read access required by its GitHub Environment.

## Step 4: grant a runtime secret permission

Grant the runtime account only the Secret Manager access it needs:

```powershell
gcloud secrets add-iam-policy-binding SECRET_ID `
  --project=$PROJECT_ID `
  --member="serviceAccount:$RUNTIME_SERVICE_ACCOUNT" `
  --role="roles/secretmanager.secretAccessor"
```

## Step 5: bind GitHub Actions through WIF

WIF authenticates GitHub Actions without a JSON key. Replace `GITHUB_ORGANIZATION` and
`GITHUB_REPOSITORY` before running these commands.

```powershell
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$POOL_ID = "lumina-github"
$PROVIDER_ID = "lumina-github-oidc"
$DEPLOY_SERVICE_ACCOUNT = "lumina-api-deploy-staging@$PROJECT_ID.iam.gserviceaccount.com"
$GITHUB_ORGANIZATION = "GITHUB_ORGANIZATION"
$GITHUB_REPOSITORY = "GITHUB_REPOSITORY"
```

### Step 5.1: create the deploy service account

```powershell
gcloud iam service-accounts create lumina-api-deploy-staging `
  --project=$PROJECT_ID `
  --display-name="Lumina staging API deploy"
```

### Step 5.2: create the workload identity pool

```powershell
gcloud iam workload-identity-pools create $POOL_ID `
  --project=$PROJECT_ID `
  --location=global `
  --display-name="Lumina GitHub Actions"
```

### Step 5.3: create the GitHub OIDC provider

```powershell
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID `
  --project=$PROJECT_ID `
  --location=global `
  --workload-identity-pool=$POOL_ID `
  --issuer-uri="https://token.actions.githubusercontent.com" `
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.environment=assertion.environment" `
  --attribute-condition="assertion.repository == '$GITHUB_ORGANIZATION/$GITHUB_REPOSITORY' && assertion.environment == 'staging'"
```

### Step 5.4: allow only the staging GitHub Environment to impersonate the deploy account

```powershell
$WIF_PRINCIPAL = "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.environment/staging"

gcloud iam service-accounts add-iam-policy-binding $DEPLOY_SERVICE_ACCOUNT `
  --project=$PROJECT_ID `
  --member=$WIF_PRINCIPAL `
  --role="roles/iam.workloadIdentityUser"
```

### Step 5.5: configure GitHub and verify

Set the GitHub Environment secret `GCP_WORKLOAD_IDENTITY_PROVIDER` to:

```text
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
```

Set `GCP_SERVICE_ACCOUNT` to `$DEPLOY_SERVICE_ACCOUNT`, then run the existing deployment workflow.
The deploy account must receive only the Artifact Registry, Cloud Run, and Scheduler-read
permissions described in [CLOUD_RUN.md](../../CLOUD_RUN.md#one-time-gcp--github-setup-operator).
Do not grant `roles/owner`, create downloadable service-account keys, or reuse the staging binding
for production.
