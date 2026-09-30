# Artifact Registry mini tutorial

Artifact Registry stores immutable API and migrator images. Follow these steps to prepare the
repository, authenticate Docker, and verify published tags.

The names below are for staging. Replace the project, region, and repository for production.

## Step 1: set the target repository

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$REGION = "us-east1"
$AR_REPO = "lumina"
```

## Step 2: check whether the repository exists

```powershell
gcloud artifacts repositories describe $AR_REPO `
  --project=$PROJECT_ID `
  --location=$REGION
```

If the command succeeds, continue to step 4. The staging repository is in `us-east1`.

## Step 3: create the repository once

```powershell
gcloud artifacts repositories create $AR_REPO `
  --project=$PROJECT_ID `
  --location=$REGION `
  --repository-format=docker
```

Do not run this for a repository that already exists.

## Step 4: authenticate Docker

```powershell

gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
```

## Step 5: list images and tags

```powershell
$REPOSITORY_PATH = "$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO"

gcloud artifacts docker images list $REPOSITORY_PATH --include-tags
gcloud artifacts docker tags list "$REPOSITORY_PATH/api"
gcloud artifacts docker tags list "$REPOSITORY_PATH/migrator"
```

## Step 6: verify an image before recovery

```powershell
$API_IMAGE = "$REPOSITORY_PATH/api:TAG"
docker pull $API_IMAGE
docker image inspect $API_IMAGE
```

Use an immutable commit-based tag from the GitHub Actions workflow. Do not replace or delete an
image that is still referenced by a Cloud Run revision.

Do not delete an image until no Cloud Run revision or rollback path references it.
