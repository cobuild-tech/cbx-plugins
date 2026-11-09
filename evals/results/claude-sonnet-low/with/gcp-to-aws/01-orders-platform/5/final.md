I wrote the AWS Terraform in `aws/`, ported the app code in place and ported the SQL. I haven't run `terraform validate` or `plan`, and nothing has been applied. The old GCP `infra/main.tf` is untouched.

## What changed
- **Terraform (`aws/`):**
  - S3 bucket with versioning, lifecycle rules and public access blocked.
  - SNS FIFO topic feeding an SQS FIFO queue with a DLQ, consumed by a Lambda.
  - RDS Postgres 15, Multi-AZ, with IAM auth and automated backups.
  - The API on ECS Fargate behind an ALB, with an ECR repo and a task role.
  - Redshift Serverless in place of the BigQuery dataset.
  - EventBridge Scheduler plus a small trigger Lambda in `aws/lambda/rollup_trigger.py`.
- **`app/worker.py`:** now an SQS handler that stops processing a customer's later messages once one fails, and reports partial batch failures.
- **`app/api.py`:** now uses boto3 for S3 presigned PUT URLs, SNS FIFO publishing, and the Redshift Data API.
- **`sql/rollup.sql`:** converted to Redshift. `ARRAY_AGG … LIMIT 3` becomes `LISTAGG` plus `JSON_PARSE`, and `CREATE OR REPLACE` becomes `DROP` plus `CREATE` in one transaction. I added `NULLS LAST` to keep BigQuery's null ordering.
- **`sql/setup.sql`** (new): creates the `analytics` schema and grants the API role access.
- **Assumed inputs:** `aws/main.tf` takes the VPC, subnets, ACM certificate and domain as variables. I assumed the base network is a separate unit.
- **Not included:** there's no Dockerfile or `requirements.txt` in the repo, so you'll need to build and push the image to ECR.

## Behavior changes

| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| Signed PUT URLs valid 7 days | Presigned URLs default to 1 hour (`UPLOAD_URL_TTL_SECONDS`) and die with the task role's credentials | Needs decision | Role-signed URLs can't last 7 days. A long-lived IAM user key would, but it's a security trade-off. |
| GCS and BigQuery in multi-region `US` | Single-region S3 and Redshift in us-east-2 | Changed | Add S3 replication if you need the multi-region durability. |
| Nearline after 30 days, delete after 365 | `STANDARD_IA` after 30 days, expire after 365 | Changed | S3 ignores objects under 128 KB for transitions. Noncurrent versions are counted from when they became noncurrent, not from creation, so they last longer. |
| Pub/Sub ordering by key | SNS and SQS FIFO with the customer ID as the group, and a random dedup ID per message | Kept | A failed message blocks its group, and I handle that in the worker. |
| Retry and DLQ | Five attempts, then the DLQ, with a 54-minute visibility timeout (6× the Lambda timeout) and 7-day retention | Changed | The GCP function's own trigger subscription had no DLQ, and the `orders-worker` subscription had no visible consumer. I mapped them to one queue, so confirm that's right. |
| Cloud Run concurrency of 80 | ECS scales on 60% CPU, 1 to 20 tasks | Needs decision | ECS has no per-instance concurrency metric. |
| Cloud Run 2 CPU, 1 GiB | Fargate 2 vCPU, 4 GiB | Changed | 4 GiB is the Fargate minimum for 2 vCPU. |
| 900-second request timeout | ALB idle timeout of 900 seconds | Kept | |
| Cloud SQL socket volume | Direct connection through `DB_HOST` | Changed | |
| Cloud SQL service account access | I did not add `rds-db:connect` to the task role | Needs decision | The original never granted it explicitly. |
| Service account `api-sa` | Task role | Changed | I added the SNS publish and Redshift Data API permissions the code needs. They weren't in the GCP Terraform. |
| `_PARTITIONDATE` filter | Needs a `partition_date` column on `analytics.orders`, filled with the UTC load date | Needs decision | Redshift has no ingestion-time pseudo column. |
| `SAFE_CAST(... AS NUMERIC)` | Regex guard before the cast | Changed | Scientific notation and padded strings now become NULL. |
| `APPROX_COUNT_DISTINCT` | `APPROXIMATE COUNT(DISTINCT …)` | Changed | Both are approximate but use different algorithms, so the numbers can differ slightly. |
| Cloud Scheduler job at 2am New York time, no retries | EventBridge Scheduler at 2am New York time, retries set to 0, calling a Lambda that POSTs to the API | Kept | The Lambda is new glue. |
| Cloud Scheduler calls the API URL | Needs `api_domain_name` pointing at the ALB, which is public | Needs decision | The GCP service's public or private status wasn't in the Terraform. |
| Defaults I introduced | `db.m6g.large`, 20 GB gp3, RDS-managed password in Secrets Manager, final snapshot, ALB health check on `/` accepting 200–404, Redshift at 8 RPU with a monthly usage limit that only logs, 14-day DLQ retention | Choices | None of these have a GCP counterpart. |

## Data and rollout
No data has moved yet. The BigQuery `analytics.orders` data needs the export, DataSync and load steps from the migration reference. Run `sql/setup.sql` on Redshift once.