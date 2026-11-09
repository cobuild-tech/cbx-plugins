I've written the AWS Terraform in `aws/` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I couldn't run anything, since there is no shell in this session. Nothing has been through `terraform validate`, tested, or run against AWS or Athena. `infra/main.tf` (the GCP version) is still there.

**Resource mapping**
- **Storage:** GCS becomes S3 with versioning and public access blocked. Objects move to STANDARD_IA at 30 days and expire at 365 days, and I added noncurrent-version expiry at 365 days.
- **Messaging:** the Pub/Sub topic becomes an SNS FIFO topic feeding an SQS FIFO queue. Ordering uses `MessageGroupId=customer_id`, and the dead-letter queue is a FIFO queue after 5 receives.
- **Database:** Cloud SQL becomes RDS Postgres 15 with Multi-AZ, IAM auth, 7-day backups (which enable point-in-time recovery), and a managed master password. The instance class is `db.m6g.large`.
- **API:** Cloud Run becomes ECS Fargate behind an ALB, with an ECR repo, a task role standing in for the service account, 1–20 tasks, and a 900s idle timeout.
- **Worker:** the Cloud Function becomes a Lambda on an SQS trigger, with the same 540s timeout and 512 MB memory. It returns partial batch failures and stops at the first failure so order within a customer is kept.
- **Analytics:** BigQuery becomes a Glue database and an Athena workgroup, with an S3 bucket for results and the rollup table.
- **Scheduler:** Cloud Scheduler becomes an EventBridge Scheduler schedule at 2am America/New_York. It calls a small Lambda, `aws/scheduler_invoker.py`, that POSTs to `/jobs/rollup`, because EventBridge Scheduler can't call HTTP endpoints directly.

**SQL port:** Athena runs one statement per query, so `rollup.sql` is now a `DROP TABLE IF EXISTS` followed by an Iceberg `CREATE TABLE ... AS`, and `rollup()` splits on `;`. The `QUALIFY` becomes a subquery, and `SAFE_CAST`, `APPROX_COUNT_DISTINCT`, the typed struct array and `UNNEST` use Athena equivalents.

**Things to check**
- **Presigned URL lifetime:** the 7-day signed upload URL won't last 7 days. Role credentials expire after hours, and the URL dies with them. You'd need an IAM user's keys to get the full 7 days.
- **Assumed table schema:** the SQL assumes `analytics.orders` has a date partition column `dt` (replacing `_PARTITIONDATE`) and that `items` is `array<row(sku varchar, qty bigint)>`. Adjust if yours differ. That table isn't defined in either Terraform.
- **Fargate sizing:** 2 vCPU requires at least 4 GB of memory, so the task gets 4 GB instead of Cloud Run's 1Gi.
- **Autoscaling:** it scales on ALB requests per target, which only approximates Cloud Run's concurrency of 80.
- **ALB is HTTP only:** the ALB listens on port 80 with no TLS certificate yet.
- **Unauthenticated rollup endpoint:** `/jobs/rollup` has no authentication, same as the GCP setup.
- **Required variables:** you need to supply `vpc_id`, `public_subnet_ids` and `private_subnet_ids`. The region defaults to `us-east-2`.
- **Visibility timeout:** the queue's visibility timeout is 3240s (6× the Lambda timeout, per AWS guidance), not the old 60s ack deadline.