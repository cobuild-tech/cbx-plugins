The migration is written but not validated. I didn't run `terraform validate`, `plan` or `apply`, and I haven't run the SQL or the app code. `infra/` is untouched, so GCP is still intact.

## What changed
- **`aws/main.tf`, `aws/variables.tf`:** Terraform for the AWS side.
  - **Storage and messaging:** S3 bucket, SNS FIFO topic, SQS FIFO queue with a DLQ, and a Lambda worker.
  - **Data and API:** RDS Postgres 15, Redshift Serverless, and ECS Fargate behind an ALB with autoscaling and IAM roles.
  - **Schedule:** the EventBridge nightly schedule.
- **`app/api.py`:** now uses boto3 (S3 presigned PUT, SNS publish).
- **`app/worker.py`:** reads the SQS record body and reports batch item failures.
- **`app/rollup.py` (new):** runs the rollup through the Redshift Data API.
- **`sql/rollup.sql`:** ported to Redshift.

## Behavior changes
| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| US multi-region bucket and BigQuery dataset | Single region, `us-east-2` | Changed | No multi-region equivalent. Add S3 cross-region replication if you need it. |
| 7-day signed upload URL | 1 hour (`UPLOAD_URL_EXPIRY_SECONDS`) | **Needs decision** | URLs signed with role credentials die when the credentials expire. Alternatives are a long-lived IAM user key or a redirect endpoint. |
| Pub/Sub ordering by `ordering_key` | FIFO with `MessageGroupId` = `customer_id` | Kept | A failed message blocks its group, as before. There is a random dedup ID per publish, so nothing is deduplicated, as before. |
| Retry delay on a failed message | About 54 minutes (visibility timeout 3240 s, 6× the worker timeout) | Changed | Lambda needs the visibility timeout ≥ the 540 s function timeout, and AWS recommends 6×. |
| DLQ after 5 attempts | `maxReceiveCount` of 5 | Kept | |
| Queue retention | 7 days (matches the Pub/Sub default) | Kept | |
| Worker batching | `batch_size = 1` | Kept | Matches one message at a time. |
| Lifecycle: Nearline at 30 days, delete at 365 | Standard-IA at 30 days, expire at 365 | Kept | The noncurrent-version rules are approximate, because S3 counts days from when a version became noncurrent. |
| Cloud Run: 2 CPU, 1Gi, concurrency 80, timeout 900 s, 1–20 instances | Fargate 2 vCPU / **4 GB**, ALB idle timeout 900 s, 1–20 tasks | Changed | 4 GB is the Fargate minimum for 2 vCPU. Scaling uses CPU at 60%, which is not per-instance concurrency. Tune it with a load test. |
| Service was not publicly invokable | Internal ALB (`alb_internal = true`), HTTP unless you set `acm_certificate_arn` | **Needs decision** | I chose the narrower option. Confirm who the callers are. |
| `api-sa` with `objectAdmin` | Task role with only `s3:PutObject`, `sns:Publish` and the Redshift Data API | Changed (narrowed) | These are the only calls the code makes. |
| Cloud Scheduler POST to `/jobs/rollup` | EventBridge Scheduler runs an ECS task with the same image, 02:00 `America/New_York` | Changed | API destinations time out at 5 s, so they can't host a long rollup. The `/jobs/rollup` route still exists. |
| Cloud SQL `db-custom-2-7680`, regional, IAM auth, PITR | RDS `db.m6g.large`, Multi-AZ, IAM auth, 7-day backups | Kept | The master password is managed by Secrets Manager. I added a 20 GB storage default and a final snapshot name. |
| BigQuery `rollup.sql` | Redshift version, details below | Changed | |
| Defaults I introduced | Health check `/` accepting 200–499; Redshift usage limit set to log only; log retention 30 days; new SGs | Choices | None of these had a GCP counterpart. |

**`sql/rollup.sql` details:**
- `CREATE OR REPLACE` becomes `DROP` + `CREATE` in one transaction.
- `ARRAY_AGG(... LIMIT 3)` becomes `ROW_NUMBER` + `LISTAGG` + `JSON_PARSE`.
- `SAFE_CAST` becomes a regex-guarded cast.
- `APPROX_COUNT_DISTINCT` becomes `APPROXIMATE COUNT(DISTINCT ...)`, so sessions may differ slightly.
- `_PARTITIONDATE` becomes an explicit `ingest_date` column.

## Before it works
- **Assumed `analytics.orders` schema:** the SQL assumes `created_at` is a UTC `TIMESTAMP`, `amount` is `VARCHAR`, `items` is `SUPER`, and `ingest_date` is a load-date column that the loader fills.
- **Dependent views:** the `DROP` will break any dependent view unless it is `WITH NO SCHEMA BINDING`.
- **Data move:** the BigQuery and GCS data still has to be moved, and the repo has no loader for it.
- **Redshift permissions:** the task's Redshift user needs schema grants on `analytics`.
- **Container image:** there is no Dockerfile in the repo. Build the image with boto3 and push it to ECR as `app/api`.
- **Network:** this needs an existing VPC and subnets, passed in as variables. The task subnets need NAT or VPC endpoints.
- **DB connection:** `DB_HOST` is passed to the container, but the app code never used the database, so nothing connects to it.
- **Bucket name:** S3 bucket names are global, so `${project}-uploads` may already be taken.