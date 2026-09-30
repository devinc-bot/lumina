# Service Usage mini tutorial

The API deployment needs specific Google APIs enabled before it can create resources. Enable this
small set during bootstrap, then verify each API is active.

Run these steps separately for the staging and production projects.

## Step 1: select the project and inspect enabled APIs

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"

gcloud services list --enabled --project=$PROJECT_ID --format="value(config.name)"
```

## Step 2: enable the required APIs

```powershell
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudscheduler.googleapis.com `
  secretmanager.googleapis.com `
  iam.googleapis.com `
  iamcredentials.googleapis.com `
  sts.googleapis.com `
  cloudresourcemanager.googleapis.com `
  logging.googleapis.com `
  --project=$PROJECT_ID
```

## Step 3: verify the bootstrap result

```powershell
gcloud services list --enabled --project=$PROJECT_ID --format="value(config.name)" `
  | Select-String "run.googleapis.com|artifactregistry.googleapis.com|cloudscheduler.googleapis.com|secretmanager.googleapis.com"
```

Disabling an API is an operational decision outside routine deployment. Review the safeguards in
[CLOUD_RUN_BOOTSTRAP.md](../../CLOUD_RUN_BOOTSTRAP.md) before doing so.
