# GCP mini tutorials

Step-by-step PowerShell guides for the Google Cloud services that run Lumina's API. Use them for
bootstrap, inspection, and incident response; routine releases continue through GitHub Actions.

## Start here

### Step 1: confirm the CLI and authenticate

Open PowerShell 7+ from the repository root, then run:

```powershell
gcloud --version
gcloud auth login
gcloud auth list
```

The active account must have permission to inspect the target project. Do not use a service-account
key file for local operator access.

### Step 2: select the environment

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$REGION = "us-east1" # staging; production currently uses southamerica-east1
gcloud config set project $PROJECT_ID
gcloud config get-value project
```

Use the staging project/region and resource names while learning. Production changes require the
protected GitHub Environment approval process.

### Step 3: choose a tutorial

## Services

| Service                              | Use in Lumina                             | Guide                                                  |
| ------------------------------------ | ----------------------------------------- | ------------------------------------------------------ |
| Secret Manager                       | Runtime API and migrator secrets          | [secret-manager.md](./secret-manager.md)               |
| Cloud Run                            | API service and migrator Job              | [cloud-run.md](./cloud-run.md)                         |
| Artifact Registry                    | API and migrator container images         | [artifact-registry.md](./artifact-registry.md)         |
| Cloud Scheduler                      | OIDC-triggered internal maintenance job   | [cloud-scheduler.md](./cloud-scheduler.md)             |
| IAM and Workload Identity Federation | Runtime, Scheduler, and deploy identities | [iam-workload-identity.md](./iam-workload-identity.md) |
| Cloud Logging                        | Service and Job diagnostics               | [cloud-logging.md](./cloud-logging.md)                 |
| Service Usage                        | Required Google APIs                      | [service-usage.md](./service-usage.md)                 |

## Safety rules

- Always pass `--project=$PROJECT_ID`; use the staging and production resource names from
  [CLOUD_RUN.md](../../CLOUD_RUN.md).
- Do not paste secret values into a terminal, history, issue, or committed file. Follow the
  protected-file workflow in [secret-manager.md](./secret-manager.md) for creation and rotation.
- Keep deployment mutations in GitHub Actions unless performing a documented bootstrap or incident
  recovery action.
- The frontend apps are hosted on Cloudflare, not GCP. See [CLOUDFLARE.md](../../CLOUDFLARE.md).

## Next step

- [CLOUD_RUN.md](../../CLOUD_RUN.md) — topology, bootstrap, release order, Scheduler contract, and rollback.
- [CLOUD_RUN_BOOTSTRAP.md](../../CLOUD_RUN_BOOTSTRAP.md) — first staging setup in PowerShell.
- [SERVICES.md](../../SERVICES.md) — provider inventory and ownership.
