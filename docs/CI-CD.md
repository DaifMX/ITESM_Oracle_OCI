# Automated Deploy / Undeploy (GitHub Actions + Terraform)

This replaces the interactive `source setup.sh` / `source destroy.sh` flow with
two CI workflows so you stop getting charged for OCI compute when you're not
using the app.

- **Deploy** (`.github/workflows/deploy.yml`) — runs on every push to `main`
  (or manually). Provisions infra with Terraform **if it isn't already up**,
  re-bootstraps the DB + secrets, builds/pushes the image, and rolls out the
  app. Safe to run repeatedly (idempotent).
- **Undeploy** (`.github/workflows/undeploy.yml`) — **manual only**. Targets
  only the billed compute (OKE cluster + node pool) and sweeps the leftover
  Load Balancer. The Always-Free ATP **database, its bucket and the VCN are
  preserved**, so your data survives and redeploys are faster.

> Why the old `undeploy.sh` didn't stop billing: it only deleted the Kubernetes
> Deployment/Service. The compute you pay for is the **OKE node pool** (3 ×
> `VM.Standard.E3.Flex`, see `terraform/containerengine.tf`), which Terraform
> owns and which keeps running until `terraform destroy`.

## One-time setup

### 1. Create an OCI API signing key (for the CI user)

In the OCI Console: **Profile → User settings → API keys → Add API key →
Generate API key pair**. Download the **private key**, and click **Add**. OCI
shows a **Configuration file preview** — copy these values:

- `user`  → secret `OCI_USER_OCID`
- `fingerprint` → secret `OCI_FINGERPRINT`
- `tenancy` → secret `OCI_TENANCY_OCID`
- `region` → secret `OCI_REGION` (e.g. `mx-queretaro-1`)
- the downloaded private key file contents → secret `OCI_PRIVATE_KEY`

> `OCI_PRIVATE_KEY` may be the raw PEM (`-----BEGIN PRIVATE KEY----- …`) or a
> base64 blob of it — `setup-oci-auth.sh` accepts either.

### 2. Create the Terraform state bucket + S3 keys

Terraform state must persist between runs (so "deploy if not deployed" and
undeploy both know what exists). We store it in an OCI Object Storage bucket via
its S3-compatible API.

1. **Create a bucket** (Console → Object Storage) e.g. `mtdr-tf-state` in the
   same compartment/region → secret `TF_STATE_BUCKET`.
2. Get your **Object Storage namespace** (Console → Object Storage shows it, or
   `oci os ns get`) → secret `OCI_NAMESPACE`.
3. **Profile → User settings → Customer Secret Keys → Generate Secret Key.**
   This gives an **Access Key** and a **Secret Key** (S3 credentials):
   - Access Key → secret `OCI_S3_ACCESS_KEY`
   - Secret Key → secret `OCI_S3_SECRET_KEY`

### 3. Compartment + naming

- `OCI_COMPARTMENT_OCID` — the compartment to deploy into. The old script
  created one automatically; in CI we use an existing one (more reversible).
  Create/pick a compartment and copy its OCID.
- `RUN_NAME` — short stable name (1–13 chars, letter first), e.g. `mtdrworkshop`.
- `MTDR_KEY` — short stable unique suffix, e.g. `mtdr01`. **Pick once and never
  change it** — resource names (bucket, repo, VCN) derive from it.
- `TODO_PDB_NAME` — the ATP database name, e.g. `mtdrdb01`.

> If you already have infrastructure running from the old flow and want CI to
> adopt it instead of creating a parallel copy, set `RUN_NAME` / `MTDR_KEY` /
> `TODO_PDB_NAME` to the existing values and `terraform import` the resources
> into the remote state first. Otherwise just let the first deploy create a
> fresh set (and destroy the old one from the Console to stop its billing).

### 4. App + registry secrets (some already exist from the current pipeline)

| Secret | Used for |
| --- | --- |
| `OCI_USERNAME` | OCIR docker login + image-pull secret |
| `OCI_AUTH_TOKEN` | OCIR docker login (Auth Token, not the API key) |
| `UI_USERNAME` | UI login username injected into the manifest |
| `UI_PASSWORD` | UI login password (`frontendadmin` secret) |
| `DB_ADMIN_PASSWORD` | ATP ADMIN + `TODOUSER` password (`dbuser` secret) |

`DB_ADMIN_PASSWORD` rules: 12–30 chars, ≥1 upper, ≥1 lower, ≥1 digit, no `"` and
not containing `admin`.

### Full secret checklist

```
OCI_TENANCY_OCID      OCI_USER_OCID        OCI_FINGERPRINT     OCI_PRIVATE_KEY
OCI_REGION            OCI_NAMESPACE        OCI_COMPARTMENT_OCID
TF_STATE_BUCKET       OCI_S3_ACCESS_KEY    OCI_S3_SECRET_KEY
RUN_NAME              MTDR_KEY             TODO_PDB_NAME
OCI_USERNAME          OCI_AUTH_TOKEN
UI_USERNAME           UI_PASSWORD          DB_ADMIN_PASSWORD
```

Add them under **Settings → Environments → `prod`** (the workflows use
`environment: prod`) or as repo secrets.

`KUBECONFIG_B64` is no longer needed — the deploy job now generates the
kubeconfig from the freshly-provisioned cluster.

## Usage

- **Deploy:** push to `main`, or **Actions → Deploy → Run workflow**.
- **Undeploy (stop billing):** **Actions → Undeploy → Run workflow**, type
  `destroy` in the confirm box.

After an undeploy, the next deploy rebuilds the OKE cluster and re-creates the
Kubernetes-side resources (wallet secret, `dbuser`/`frontendadmin`/etc.). Because
the **ATP database is preserved**, the schema bootstrap is a no-op against your
existing `TODOUSER` schema and **your data is kept**.

> The ATP DB here is `is_free_tier = true`, so leaving it up costs nothing. If
> you ever want a true zero-footprint teardown that also drops the DB, run
> `terraform destroy` without the `-target` flags (or destroy the DB from the
> Console) — but you'll lose all data.

## Notes / first run

- The first deploy after enabling this takes ~15–25 min (OKE + ATP provisioning).
- The DB schema bootstrap uses Oracle Instant Client (`sqlplus`) installed in the
  deploy job. If Oracle changes the Instant Client download URL, update the
  version in `deploy.yml` → *Install Oracle Instant Client*.
- Terraform's S3 backend for OCI needs `skip_s3_checksum = true` (already set in
  `utils/ci/terraform-apply.sh`); without it uploads fail against OCI.
- Local `source setup.sh` / `source destroy.sh` still work and still use **local**
  state — the remote backend file is generated only inside CI and is never
  committed.
