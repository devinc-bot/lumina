# Secret Manager mini tutorial

Use Secret Manager for API and migrator credentials. This tutorial creates a secret, grants the
Cloud Run runtime identity access, rotates a value, and binds it to the API.

The names below are for staging. Replace the project, secret, and resource names for production.

## Step 1: select the project and name the secret

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$SECRET_ID = "lumina-staging-example-secret"
```

Secret IDs are environment-specific. Never reuse a staging secret for production.

## Step 2: create the secret and its first version

```powershell
gcloud secrets create $SECRET_ID --replication-policy=automatic --project=$PROJECT_ID
gcloud secrets versions add $SECRET_ID --data-file=VALUE_FILE --project=$PROJECT_ID
```

Create `VALUE_FILE` outside the repository with restrictive local permissions, then delete it after
the command succeeds. Do not put its value in a command argument, shell history, issue, or commit.

## Step 3: verify the secret without printing its value

```powershell
gcloud secrets describe $SECRET_ID --project=$PROJECT_ID
gcloud secrets versions list $SECRET_ID --project=$PROJECT_ID
```

The secret must have at least one enabled version before Cloud Run can use it.

## Step 4: grant the runtime account access

```powershell
$RUNTIME_SERVICE_ACCOUNT = "lumina-api-runtime-staging@$PROJECT_ID.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding $SECRET_ID `
  --project=$PROJECT_ID `
  --member="serviceAccount:$RUNTIME_SERVICE_ACCOUNT" `
  --role="roles/secretmanager.secretAccessor"
```

Get the runtime email from [iam-workload-identity.md](./iam-workload-identity.md) rather than
guessing it.

## Step 5: bind the secret to Cloud Run

This additive command preserves other secret bindings:

```powershell
$SERVICE_NAME = "lumina-api-staging"
$REGION = "us-east1"
$ENVIRONMENT_VARIABLE = "EXAMPLE_SECRET"
$SECRET_VERSION = "1"

gcloud run services update $SERVICE_NAME `
  --project=$PROJECT_ID `
  --region=$REGION `
  --update-secrets="${ENVIRONMENT_VARIABLE}=${SECRET_ID}:${SECRET_VERSION}"
```

Use a numbered version for a controlled rotation. Secret environment variables are resolved when an
instance starts, so a `latest` binding is not an atomic rollout: existing instances keep their
current value while new instances can receive the newer version. Use `latest` only when that
behavior is intentional; otherwise pin the new version, deploy a controlled revision, and verify
readiness.

## Step 6: rotate or remove a secret

Add a new version to rotate, then repeat step 5 with its numbered version:

```powershell
gcloud secrets versions add $SECRET_ID --data-file=VALUE_FILE --project=$PROJECT_ID
gcloud secrets versions list $SECRET_ID --project=$PROJECT_ID
```

To inspect a value during an incident, use a controlled terminal only; this prints it to stdout:

```powershell
gcloud secrets versions access latest --secret=$SECRET_ID --project=$PROJECT_ID
```

This permanently deletes every version. Remove or redirect Cloud Run bindings first:

```powershell
gcloud secrets delete $SECRET_ID --project=$PROJECT_ID --quiet
```
