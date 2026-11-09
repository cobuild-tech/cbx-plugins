I wrote the AWS Terraform, ported the two Python files and rewrote the SQL. I haven't run `terraform validate`, `terraform plan` or anything else, and I haven't tested the Python or the SQL. The old `infra/` Terraform is untouched, so GCP stays as it is until you cut over.

**What changed**
- **`aws/main.tf`** has every GCP resource's AWS counterpart:
  - **Uploads bucket:** an S3 bucket with versioning, an equivalent lifecycle config and public access blocked.
  - **Orders messaging:** an SNS FIFO topic feeding an SQS FIFO queue with a DLQ and `maxReceiveCount = 5`.
  - **Worker:** a Lambda function reading from that queue.
  - **Database:** an RDS Postgres 15 instance, Multi-AZ, with IAM auth and 7-day backups.
  - **API:** an ECR repo, ECS Fargate service, ALB (idle timeout 900 s) and autoscaling from 1 to 20 tasks.
  - **Analytics:** a Glue database, Athena workgroup and S3 buckets.
  - **Nightly rollup:** an EventBridge Scheduler schedule at 02:00 America/New_York that triggers a small Lambda in `aws/lambda/trigger_rollup.py`, which POSTs to the API.
- **`app/api.py`** uses boto3 for S3 presigned URLs, SNS publishing and the Athena rollup.
- **`app/worker.py`** is now an SQS Lambda handler with partial-batch failure handling that respects FIFO group order.
- **`sql/rollup.sql`** is now Athena SQL.

**Behavior changes**

| GCP | AWS now | Status | Why |
|---|---|---|---|
| Multi-region `US` bucket and dataset | Single region, `us-east-2` | Needs decision | S3 and Athena are regional. Add replication if you need the old durability. |
| 7-day signed upload URL | 1 hour (`UPLOAD_URL_TTL`) | Needs decision | URLs signed with role credentials die when the session does. Keeping 7 days would need an IAM user key. |
| Cloud Run was IAM-protected | ALB open to `0.0.0.0/0` on HTTP port 80 | Needs decision | There's no invoker binding in the repo. Restrict `api_ingress_cidrs` or add ALB auth and an ACM cert. |
| Retry forever on the function trigger | DLQ after 5 receives | Changed | One queue serves both the consumer and the DLQ policy. |
| Unconsumed DLQ topic | SQS FIFO DLQ, 14-day retention | Changed | It's a queue now. |
| Cloud Run concurrency of 80 | Autoscale on 60% CPU | Changed | ECS has no per-instance concurrency. |
| 1 GiB memory | 4 GB | Changed | Fargate requires at least 4 GB with 2 vCPU. |
| `CREATE OR REPLACE TABLE` was atomic | `DROP` then CTAS | Changed | Readers can briefly see no table. Check that Iceberg `DROP` clears the S3 location. |
| `_PARTITIONDATE` | `partition_date` column | Needs decision | The loader must populate it. |
| Rollup over a BigQuery table | Assumes `analytics.orders` and its `items` row type | Needs decision | The table isn't in Terraform, so its schema and loading are unknown. |
| Lifecycle on archived and live objects | 365-day noncurrent expiry, STANDARD_IA at 30 days | Changed | S3 can't age noncurrent versions from their creation. Deleted data lingers about 365 days longer. Objects under 128 KB aren't transitioned. |
| `api-sa` had only storage access | Also `sns:Publish` and Athena/Glue access | Needs decision | The code calls these, but the Terraform never granted them. Confirm they were granted outside `infra/`. |
| Cloud Scheduler needed no auth setup | Lambda with 190 s timeout and no retries | Kept | It matches the 180 s default deadline. |
| Cloud SQL public IP default | Private RDS in the default VPC | Changed | Only the API's security group can reach the database. |
| Added by me | `db.m6i.large`, managed master password, encrypted storage, final snapshot, 30-day log retention, health check accepting 200–499 | New choices | GCP had no counterpart for these. |

**Before you apply**
- There's no Dockerfile or `requirements.txt` in the repo. The container needs to listen on 8080 and install `boto3` and `flask`. Push the image to ECR as `api:latest`.
- Pick a free `project` prefix for the S3 bucket names, and run `terraform plan` before anything else.
- Moving the data (BigQuery to S3, GCS to S3, Cloud SQL to RDS) isn't covered yet.