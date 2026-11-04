# Identity, secrets, and keys

Most "permission denied" errors in the first weeks come from identity. AWS
attaches an IAM role to a workload. GCP attaches a service account. Every
attachment must be re-made, with no broader permissions than before.

## Map

| AWS | GCP |
|---|---|
| IAM role via instance profile | Service account attached to the VM |
| EKS IRSA / Pod Identity | GKE Workload Identity Federation (KSA bound to a GSA, or principal IDs granted directly) |
| Lambda execution role / ECS task role | Cloud Run or Cloud Run functions service account |
| ECS task execution role (pull image, read secrets) | Service account with Artifact Registry reader + Secret Manager accessor (often the same SA) |
| MWAA execution role | Composer environment service account |
| EMR service role + instance profile | Dataproc VM service account |
| IAM user access keys | Nothing; delete them after cutover. If a key is truly unavoidable, a service account key with an expiry, recorded as a decision |
| IAM OIDC provider + role trust (GitHub, GitLab CI) | Workload Identity Federation pool + provider, `roles/iam.workloadIdentityUser` |
| Identity-based policies on roles | IAM role bindings on project, folder, or resource |
| Resource policies (bucket, queue, key, function) | IAM policy on that resource (`google_*_iam_member`) |
| `iam:PassRole` | `roles/iam.serviceAccountUser` on the specific service account |
| `sts:AssumeRole` across accounts | Grant the SA in the other project, or `roles/iam.serviceAccountTokenCreator` for impersonation |
| Service control policies | Organization policies and IAM deny policies |
| Accounts / OUs | Projects / folders |
| AWS KMS key + key policy | Cloud KMS key ring and key + IAM |
| Secrets Manager / SSM Parameter Store | Secret Manager (`projects/<p>/secrets/<n>/versions/latest`) |
| Non-secret SSM parameters | Environment variables, or a config file in GCS |
| IAM Identity Center | Cloud Identity / Google Workspace, or Workforce Identity Federation with the same IdP |
| Cognito user pools | Identity Platform |
| ALB authentication (Cognito/OIDC), Verified Access | Identity-Aware Proxy |

## Rules

- **One service account per workload.** Don't reuse the Compute Engine
  default service account; it has `roles/editor` in many projects. Create
  one per service and record the mapping from role to SA.
- **Translate permissions, don't widen them.** List the role's policy
  actions, list what the code actually calls, and grant the intersection
  as predefined roles on the narrowest resource. `"Action": "*"` is not a
  reason for `roles/owner`; log the narrowing in `decisions.md`.
- **Conditions and resource ARNs.** Policy statements scoped to one ARN
  or prefix become bindings on that resource, or IAM Conditions
  (`resource.name.startsWith(...)`). Some services can't be scoped below
  the project; flag those.
- **Deny statements.** Explicit `Deny` → IAM deny policies or org
  policies. Don't drop them silently.
- **Accounts become projects.** Cross-account role assumption becomes a
  binding for the caller's service account in the target project.

## Finding what needs to change

Search for:

- Keys: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `aws_access_key_id`
  in `~/.aws/credentials`-style files, `AKIA`, CI secrets named like
  `AWS_ACCESS_KEY`. Name the file; never print its contents.
- Role references: `arn:aws:iam::`, `role_arn`, `AssumeRole`,
  `eks.amazonaws.com/role-arn`, `aws_iam_instance_profile`.
- Secrets: `secretsmanager`, `get_secret_value`, `ssm`,
  `get_parameter`, `arn:aws:secretsmanager:`, `{{resolve:`.
- Metadata: `169.254.169.254`, IMDS token calls.
- Terraform: `aws_iam_role*`, `aws_iam_policy*`, `aws_*_policy`
  (bucket, queue, topic, key), `aws_kms_*`, `aws_secretsmanager_*`,
  `aws_ssm_parameter`.

## After cutover

Deactivate, then delete, IAM access keys used by migrated workloads, then
the roles, once the unit has passed validation and the rollback window is
over. Keep a record of what was deleted in the unit file.
