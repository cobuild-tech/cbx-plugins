I wrote the AWS Terraform in `aws/main.tf` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I haven't run `terraform validate` or tested any of it. I left `infra/` (the GCP Terraform) untouched so you can delete it after cutover.

**Resource mapping**
- **GCS → S3:** versioning is on, public access is blocked, and objects move to STANDARD_IA at 30 days and expire at 365 days. The same rules apply to noncurrent versions.
- **Pub/Sub → SNS FIFO topic + SQS FIFO queue.** The `customer_id` becomes the message group ID, which keeps per-customer ordering. A second FIFO queue is the DLQ, with a max receive count of 5.
- **Cloud SQL → RDS Postgres 15.**
  - It is Multi-AZ with IAM auth and 7-day backups, which also enables point-in-time recovery.
  - The instance class is `db.m5.large`.
  - The master password is managed by Secrets Manager.
- **Cloud Run → ECS Fargate behind an ALB.** It has 2 vCPU, a 900s idle timeout, and 1–20 tasks with request-based autoscaling. The task role replaces `api-sa`.
- **Cloud Function → Lambda on an SQS trigger.** The worker (Python 3.12, 540s, 512MB) reports partial batch failures. On a failure it also fails the rest of that customer's messages in the batch, so ordering holds on redelivery.
- **BigQuery → Glue database + Athena workgroup,** plus an analytics S3 bucket.
- **Cloud Scheduler → EventBridge Scheduler** (`0 2 * * *`, America/New_York). It invokes a small Lambda that POSTs to `/jobs/rollup`, because Scheduler can't call an arbitrary HTTP URL.

**Behavior differences you should know about**
- **Memory:** Fargate requires at least 4GB for 2 vCPU, so memory is 4GB instead of 1Gi.
- **Queue visibility timeout:** it is 540s, not 60s, because Lambda requires it to be at least the function timeout.
- **Autoscaling:** the ALB has no concurrency metric, so scaling targets 80 requests per target per minute.
- **Presigned upload URLs:** S3 allows 7 days, but with ECS role credentials a URL dies when the credentials expire (hours). A true 7-day URL needs a long-lived IAM user key.
- **Rollup SQL:** Athena has no `CREATE OR REPLACE`, `QUALIFY` or `ARRAY_AGG ... LIMIT`. I rewrote it with a subquery, `slice(array_agg(... ORDER BY))`, `TRY_CAST` and `approx_distinct`. The endpoint now drops the table and clears its S3 prefix before re-creating it with a `CREATE TABLE ... AS SELECT`.
- **Orders table assumption:** the SQL assumes `analytics.orders` is a Glue table partitioned by a `dt` column. The old Terraform never defined that table, so check the name and shape.

**Still to do**
- **Inputs:** you need to supply `vpc_id` and the public and private subnets. The private subnets need NAT or VPC endpoints for outbound access.
- **Deployment:** push the API image to the new ECR repo, and note the ALB listener is HTTP only (no TLS).
- **Migration:** moving the data and the DB users for IAM auth is not covered.
- **Cleanup:** I also dropped the `functions_framework` dependency, so update any `requirements.txt` to use `boto3` instead.