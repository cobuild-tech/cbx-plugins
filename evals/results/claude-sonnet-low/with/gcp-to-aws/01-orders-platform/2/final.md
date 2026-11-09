I've written the AWS Terraform, ported the two app files and rewrote the SQL. None of it has been validated. I didn't run `terraform validate`, `terraform plan`, or the SQL on Redshift, and I applied nothing. `infra/` and GCP are untouched.

**What changed**
- **`aws/`** is split into `main.tf` (provider, variables, security groups), `storage.tf`, `messaging.tf`, `data.tf`, `api.tf`, plus `scheduler/handler.py`.
- **`app/api.py`** now uses boto3 for S3, SNS and the Redshift Data API instead of the Google clients.
- **`app/worker.py`** is now a Lambda SQS handler that reports partial batch failures.
- **`sql/rollup.sql`** is ported to Redshift.

**Resource mapping**

| GCP | AWS |
|---|---|
| GCS bucket | S3 bucket |
| Pub/Sub topic with ordering | SNS FIFO topic |
| `orders-worker` subscription and DLQ | SQS FIFO queue and DLQ, `maxReceiveCount` 5 |
| Cloud Function | Lambda |
| Cloud SQL | RDS Postgres 15, Multi-AZ, IAM auth |
| Cloud Run | ECS Fargate behind an ALB |
| BigQuery dataset | Redshift Serverless |
| Cloud Scheduler | EventBridge Scheduler (`America/New_York`) |

I added a small VPC Lambda, because the scheduler has to reach the internal ALB. The `api-sa` service account became an ECS task role.

**Behavior changes**

| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| Bucket in multi-region `US` | Single-region S3 bucket in us-east-2 | Needs decision | Add replication if you need multi-region durability. |
| Nearline after 30 days | Standard-IA after 30 days | Changed | S3 equivalent. |
| Noncurrent versions follow the 30-day and 365-day rules by object age | The same rules count from the moment a version becomes noncurrent | Changed | S3 counts differently. |
| Delete after 365 days | S3 adds a delete marker; a second rule cleans up the markers | Changed | S3 versioning behavior. |
| Signed PUT URLs valid 7 days | 1 hour by default (`UPLOAD_URL_TTL`) | Needs decision | Role credentials can't sign for 7 days. Keeping 7 days needs an IAM user key or a different mechanism. |
| Publishing waits for the Pub/Sub ack | `sns.publish` is synchronous; each message gets a unique dedup ID | Kept | Same effect, and duplicate order bodies are still delivered as before. |
| Ordering key | `MessageGroupId` is the customer ID | Kept | A failed message blocks its group until retry, as before. |
| Ack deadline 60 s | Visibility timeout 600 s | Changed | It must be at least the Lambda timeout of 540 s. A failed message is retried after 10 minutes. |
| One message per invocation | `batch_size = 1` | Kept | Matches Pub/Sub delivery. |
| Subscription retention 7 days | Queue retention 7 days; DLQ 14 days | Kept | Matches the Pub/Sub default. |
| Cloud Run: 2 vCPU, 1Gi, 80 concurrent requests | Fargate 2 vCPU with 4 GB | Changed | 4 GB is the Fargate minimum for 2 vCPU. |
| Concurrency-based scaling (1–20) | CPU target of 60%, 1–20 tasks | Needs decision | There's no per-instance concurrency metric. |
| 900 s request timeout | ALB idle timeout of 900 s | Changed | This is an idle timeout, not a total timeout. |
| Cloud Run service with no public invoker | Internal ALB on HTTP port 80 | Kept, needs decision | The source has no domain or certificate. |
| `storage.objectAdmin` | `s3:PutObject` only | Changed | I granted only what the code uses. The SNS publish and Redshift access are also grants the repo never showed. |
| Cloud SQL (`db-custom-2-7680`, PITR) | `db.m6i.large`, 7-day backups, managed master password, 20–100 GB gp3, final snapshot | Chosen | Defaults I introduced. |
| BigQuery with no cap | Redshift 8 RPU base, monthly usage limit that only logs | Chosen | Defaults I introduced. |
| Scheduler with no retries | No retries on the schedule or the Lambda | Kept | Matches the Cloud Scheduler job. |
| Health check | Matcher `200-499` on `/` | Chosen | The app has no health route. |

**SQL changes** (untested)
- `CREATE OR REPLACE TABLE` becomes drop and create, run as one transaction.
- `ARRAY_AGG(STRUCT … LIMIT 3)` becomes `LISTAGG` of JSON, wrapped in `JSON_PARSE`.
- `SAFE_CAST` becomes a regex guard.
- `APPROX_COUNT_DISTINCT` becomes `APPROXIMATE COUNT(DISTINCT …)`. Results may differ slightly.
- I added `NULLS LAST` to every `DESC` order, because Redshift sorts NULLs first.
- `SUM(amount)` still counts an order's amount once per item row, as the original did.

**Needs your input**
- **`_PARTITIONDATE`:** Redshift has no equivalent. The SQL assumes `analytics.orders` has an `ingest_date` column that you populate when loading data.
- **Source data:** the `analytics.orders` schema isn't in the repo, so I assumed `items` is a SUPER column. Table data needs exporting and loading separately.
- **Redshift permissions:** the rollup runs as the Redshift admin through its Secrets Manager secret. A dedicated, narrower user would be better.
- **Container image:** the repo has no Dockerfile or `requirements.txt`. The image needs `boto3` instead of the `google-cloud-*` packages and must be pushed to ECR (`app/api:latest`).
- **Network:** you must supply `vpc_id` and `private_subnet_ids` (three AZs for Redshift). The subnets need egress to ECR and CloudWatch.