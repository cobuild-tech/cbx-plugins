I've written the AWS Terraform in `aws/` and ported the app and SQL in place. I haven't run `terraform validate`, run the app, or tried the SQL, so none of it has been tested. The old `infra/` is still there for you to delete once you're happy.

**Terraform (`aws/main.tf`, plus `aws/scheduler_trigger.py`)**

| GCP | AWS |
|---|---|
| Cloud Storage bucket | S3 bucket with versioning and public access blocked. Objects move to Standard-IA at 30 days and expire at 365. |
| Pub/Sub topic, subscription and DLQ | SNS FIFO topic feeding an SQS FIFO queue. The FIFO queue gives the ordering, and the DLQ redrives after 5 receives. |
| Cloud SQL Postgres 15 | RDS Postgres 15 with Multi-AZ, IAM auth and 7-day backups with point-in-time recovery. It uses `db.m6g.large`. |
| Service account | IAM task role covering S3, SNS publish, Athena/Glue and `rds-db:connect`. |
| Cloud Run | ECS Fargate behind an ALB, with 1–20 tasks and a 900s idle timeout. |
| Cloud Function | Lambda reading from the SQS queue, with a 540s timeout and 512 MB. |
| BigQuery dataset | Glue database, Athena workgroup, and a results bucket. |
| Cloud Scheduler | EventBridge Scheduler (02:00 America/New_York) calling a small Lambda, which makes the POST. |

**App and SQL**
- **`app/api.py`:** now uses boto3 for presigned S3 PUT URLs, SNS publish and Athena. SNS publish uses the customer id as the ordering key and a random deduplication id.
- **`app/worker.py`:** now an SQS batch handler. It reports partial failures and retries everything after a failed message so per-group ordering holds.
- **`sql/rollup.sql`:** rewritten for Athena. It has two statements, drop and recreate, because Athena can't `CREATE OR REPLACE`. It also swaps in `TRY_CAST`, `SLICE(ARRAY_AGG ... ORDER BY)`, a subquery for `QUALIFY`, and `APPROX_DISTINCT`.

**Differences and things to check**
- **Presigned URL expiry:** the 7-day URLs will actually expire when the task role's session credentials do, which is hours, not 7 days. A real 7-day lifetime needs a long-lived IAM user key.
- **Rollup downtime:** the nightly rollup is no longer atomic. The table briefly doesn't exist between the drop and the recreate.
- **Orders table assumptions:** I assumed `analytics.orders` already exists as a Glue table with a `partition_date` column in place of `_PARTITIONDATE`, and that `items` is an array of rows with `sku` and `qty`. I didn't create that table, and I haven't confirmed the real column names or types.
- **SQS visibility timeout:** it's 540s instead of the 60s ack deadline, because Lambda requires it to be at least the function timeout.
- **Fargate memory:** 4 GB instead of 1 GB, since that's the minimum for 2 vCPU.
- **Autoscaling:** it scales on requests per task, targeting 80, which only approximates Cloud Run's concurrency of 80.
- **No HTTPS or auth:** the ALB is HTTP-only, so the unauthenticated `/jobs/rollup` endpoint is now plain HTTP. Add an ACM certificate and a listener before real use.
- **Variables and image:** you need to supply `project`, `vpc_id`, and the public and private subnet ids. Private subnets need NAT or VPC endpoints. Push the API image to the new ECR repo `app/api`. The container must listen on port 8080.
- **Data lake access:** the task role has no access to wherever your `analytics.orders` data lives in S3. Add a grant for that bucket.