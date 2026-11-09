I've written the AWS Terraform, ported both Python files in place, and rewrote the SQL for Athena. I haven't run `terraform validate`, tested the app code, or run the SQL in Athena. `infra/` (the GCP Terraform) is untouched, so you can delete it after cutover.

**What each GCP piece became**
- **Storage:** the GCS bucket became S3 with versioning and the same lifecycle rules. The 30-day class change goes to `STANDARD_IA` and the 365-day delete is kept.
- **Messaging:** the ordered Pub/Sub topic and subscription became an SNS FIFO topic feeding an SQS FIFO queue. The dead-letter queue is also FIFO, with 5 max receives.
- **Database:** Cloud SQL became multi-AZ RDS Postgres 15 (`db.m6g.large`) with IAM auth, 7-day backups and point-in-time recovery, and a managed master password.
- **API:** Cloud Run became ECS Fargate behind an HTTPS ALB, with an ECR repo and autoscaling from 1 to 20 tasks. The ALB timeout is 900s, and scaling targets 80 requests per task.
- **Worker:** the Cloud Function became a Python 3.12 Lambda triggered by the SQS queue.
- **Analytics:** BigQuery became Athena, with a Glue database, a workgroup and an S3 bucket.
- **Schedule:** Cloud Scheduler became EventBridge Scheduler (02:00 America/New_York). It publishes an event that an API destination turns into the POST to `/jobs/rollup`.

**Code changes**
- **`app/api.py`:** now uses boto3 for S3 presigned URLs, SNS publishing and the Athena rollup. It reads `ORDERS_TOPIC_ARN` instead of `GOOGLE_CLOUD_PROJECT`.
- **`app/worker.py`:** now reads SQS records and reports partial batch failures.
- **`sql/rollup.sql`:** rewritten in Trino syntax. `QUALIFY` became a subquery, `SAFE_CAST` became `TRY_CAST`, and `APPROX_COUNT_DISTINCT` became `approx_distinct`. Athena has no `CREATE OR REPLACE TABLE`, so the app now drops the table and then recreates it as an Iceberg table.

**Differences and assumptions to check**
- **`analytics.orders`:** it wasn't in the Terraform, so I assumed it exists in Athena with a `dt` date partition column and `items` typed as `array(row(sku varchar, qty bigint))`. Fix the SQL if the schema differs.
- **Fargate sizing:** Fargate needs at least 4 GiB of memory for 2 vCPU, so the task has 4 GiB instead of Cloud Run's 1 GiB.
- **SQS visibility timeout:** it's 600s instead of 60s, because it has to be at least the Lambda timeout of 540s.
- **Presigned URLs:** the 7-day expiry is capped by the task role's credential lifetime, which is usually hours. Real 7-day URLs would need an IAM user's long-lived keys.
- **New inputs and IAM:** you need to supply `vpc_id`, subnet IDs and an ACM `certificate_arn`. The task role now has SNS, Athena and Glue permissions, because the GCP version only declared storage access.
- **Duplicate orders:** each order gets a UUID deduplication ID, so identical orders aren't dropped.
- **Region:** I used `us-east-2` (variable `region`) in place of `us-central1`.
- **Scheduler auth:** the scheduler's API-key header is a dummy value the API ignores, because EventBridge requires some auth setting.