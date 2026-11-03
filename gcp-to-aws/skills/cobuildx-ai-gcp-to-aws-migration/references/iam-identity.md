# Identity, secrets, and keys

Most "access denied" errors in the first weeks come from identity. GCP
attaches a service account to a workload. AWS attaches an IAM role. Every
attachment must be re-made, with no broader permissions than before.

## Map

| GCP | AWS |
|---|---|
| Service account attached to a VM | IAM role via instance profile |
| GKE Workload Identity (KSA → GSA annotation) | EKS Pod Identity association (or IRSA) |
| Cloud Run / Functions service account | Lambda execution role / ECS task role |
| Composer service account | MWAA execution role |
| Dataproc service account | EMR service role + EC2 instance profile |
| Service account key file (JSON) | Nothing; delete it after cutover |
| Workload Identity Federation (external CI, e.g. GitHub) | IAM OIDC identity provider + role trust policy |
| Predefined / custom roles on resources | IAM policies on the role + resource policies (bucket, queue, key) |
| `roles/run.invoker`, `roles/cloudfunctions.invoker` | Lambda resource policy, or `AWS_IAM` function URL auth |
| `roles/iam.serviceAccountUser` (act as) | `iam:PassRole` on the specific role |
| Org policies | Service control policies (AWS Organizations) |
| Folders / projects | Organizational units / accounts |
| Cloud KMS key + IAM | AWS KMS key + key policy |
| Secret Manager (`projects/<p>/secrets/<n>/versions/latest`) | Secrets Manager (`<name>`) or SSM Parameter Store (`/path/name`) |
| Identity-Aware Proxy | ALB authentication (Cognito or OIDC) / Verified Access |
| Cloud Identity / Google Workspace SSO | IAM Identity Center with the same IdP |

## Rules

- **One role per workload.** Don't reuse a shared role because a GCP
  service account was shared; split it and record the split.
- **Translate permissions, don't widen them.** List what the GCP account
  could do (its role bindings), list what the code actually calls, and
  grant the intersection. `roles/editor` on GCP is not a reason for
  `AdministratorAccess` on AWS: grant what the code uses and log the
  narrowing in `decisions.md`.
- **Resource policies matter.** On AWS, an S3 bucket, SQS queue, SNS
  topic, KMS key, or Lambda function can deny or allow on its own. Check
  both sides for cross-account access.
- **Pass roles explicitly.** Anything that launches compute (ECS, Lambda,
  EMR, Glue, Step Functions) needs `iam:PassRole` scoped to the roles it
  passes.
- **Projects become accounts.** A GCP project usually maps to an AWS
  account (per environment). Cross-project access becomes cross-account
  role assumption.

## Finding what needs to change

Search for:

- Key files: `GOOGLE_APPLICATION_CREDENTIALS`, `*.json` with
  `"type": "service_account"`, `private_key_id`, CI secrets named like
  `GCP_SA_KEY`. Name the file; never print its contents.
- Explicit service account emails: `*@*.iam.gserviceaccount.com`.
- Secret paths: `projects/*/secrets/*`, `secretmanager.googleapis.com`,
  `google.cloud.secretmanager`.
- Workload Identity annotations: `iam.gke.io/gcp-service-account`.
- Terraform: `google_*_iam_member`, `google_*_iam_binding`,
  `google_*_iam_policy`, `google_service_account*`.

## After cutover

Delete GCP service account keys used by migrated workloads, then the
service accounts, once the unit has passed validation and the rollback
window is over. Keep a record of what was deleted in the unit file.
