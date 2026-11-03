I've written the AWS Terraform in `aws/` and ported the app code and SQL in place. Nothing has been validated or run. I did not run `terraform validate` or `plan`, did not test the Python, and did not run the SQL against Athena. I did not run `terraform apply` either. `infra/` is untouched, so GCP stays as it was. I skipped the plan-and-approve workflow the migration skill normally uses, because you asked for the code directly.

**Terraform (`aws/main.tf`, plus `aws/lambda/rollup_trigger.py`)**

| GCP | AWS |
|---|---|
| Cloud Storage `uploads` | S3 with versioning, public access blocked, and the same lifecycle (30 days to Standard-IA, expire at 365 days) |
| Pub/Sub `orders` | SNS FIFO topic |
| Pub/Sub `orders-worker` subscription and DLQ | SQS FIFO queue with a FIFO DLQ after 5 receives |
| Cloud Function `orders-worker` | Lambda (Python 3.12, 512 MB, 540 s) fed by its own SQS FIFO queue, `orders-worker-trigger.fifo` |
| Cloud SQL Postgres 15 | RDS Postgres 15, `db.m5.large`, Multi-AZ, IAM auth, 7-day backups with point-in-time recovery |
| `api-sa` service account | IAM role |
| Cloud Run `api` | ECS Fargate behind an internet-facing ALB, autoscaling from 1 to 20 tasks, 900 s idle timeout |
| BigQuery `analytics` | Glue database, Athena workgroup, S3 bucket |
| Cloud Scheduler `nightly-rollup` | EventBridge Scheduler at `0 2` New York time, calling a small Lambda that POSTs to `/jobs/rollup` |

**App code and SQL**
- `app/api.py` now uses boto3 for the S3 pre-signed URL, SNS publish with `MessageGroupId` set to the customer, and Athena for the rollup. Athena can't `CREATE OR REPLACE`, so it drops `analytics.daily` and then runs a `CREATE TABLE ... AS` into an Iceberg table.
- `app/worker.py` is now an SQS Lambda handler that reports partial batch failures and keeps order within a batch.
- `sql/rollup.sql` is rewritten for Athena. Function swaps:
  - `TRY_CAST` instead of `SAFE_CAST`
  - `approx_distinct` instead of `APPROX_COUNT_DISTINCT`
  - `CROSS JOIN UNNEST` instead of the comma join
  - A CTE with `ROW_NUMBER` instead of `QUALIFY`

**Things to check before using this**
- **Signed URLs:** the 7-day upload URL can't be kept. A URL signed with role credentials stops working when those credentials expire, after hours. A 7-day URL needs a long-lived IAM user or a different design, so please decide how you want this handled.
- **`analytics.orders` schema is assumed.** The SQL expects a `partition_date DATE` column in place of `_PARTITIONDATE`, and `items` as `ARRAY(ROW(sku VARCHAR, qty BIGINT))`. The table itself and its data still need to be moved over.
- **Approximate distinct counts** will differ slightly, because the algorithm is different.
- **Subscriptions:** the Terraform defined the `orders-worker` subscription separately from the Cloud Function's implicit trigger subscription, so there are two SQS queues. Drop one if the explicit subscription has no consumer.
- **Permissions the GCP Terraform didn't grant:** `api-sa` only had storage access there, yet the app publishes to Pub/Sub and queries BigQuery, so those grants must have been made outside the code. I added SNS, Athena, Glue, S3 analytics and `rds-db:connect` to the AWS role.
- **Fargate memory:** it is 4 GB because Fargate's minimum for 2 vCPU is 4 GB, against Cloud Run's 1 GiB.
- **Autoscaling:** it scales on ALB requests per target, which only approximates Cloud Run's concurrency of 80.
- **Lifecycle:** noncurrent-version expiry counts from when a version becomes noncurrent, not from creation as in GCS, so it isn't an exact match.
- **ALB is HTTP only:** add an ACM certificate and an HTTPS listener before production. The `api` image also has to be pushed to the new ECR repo `app/api`.
- **Inputs:** `vpc_id`, `public_subnet_ids` and `private_subnet_ids` are required. The region defaults to `us-east-2`.