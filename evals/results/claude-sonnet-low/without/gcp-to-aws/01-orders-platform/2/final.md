I've written the AWS Terraform in `aws/main.tf` and ported the Python and SQL in place. I haven't run `terraform validate`, run the app, or run the SQL, so none of it has been tested. I left `infra/` (the old GCP Terraform) in place.

**Service mapping**
- **GCS → S3:** versioning stays on. Objects move to `STANDARD_IA` after 30 days and expire after 365 days. I also applied those rules to noncurrent versions.
- **Pub/Sub → SNS FIFO + SQS FIFO:** the topic feeds an SQS queue with a DLQ that takes messages after 5 receives. The ordering key becomes the `MessageGroupId`.
- **Cloud SQL → RDS Postgres 15:** Multi-AZ, IAM auth, 7-day backups (which give point-in-time recovery), on `db.m5.large`.
- **Cloud Run → ECS Fargate + ALB:** scales from 1 to 20 tasks, targeting 80 requests per task. The ALB idle timeout is 900s.
- **Cloud Functions → Lambda:** Python 3.12, 540s timeout, 512 MB, triggered from the queue.
- **BigQuery → Athena + Glue:** the Glue database and an Athena workgroup replace the dataset.
- **Cloud Scheduler → EventBridge Scheduler:** the schedule is `0 2 * * *` in America/New_York. It reaches the API through an event rule and API destination, because Scheduler can't call HTTP directly.
- **Code:**
  - `api.py` now uses boto3 for S3 presigned PUT URLs, SNS publishing, and running the rollup through Athena.
  - `worker.py` reads SQS batches. On a failure it reports that message and all later ones in the batch, so FIFO order holds on retry.
  - `sql/rollup.sql` is Athena SQL.

**Behavior differences**
- Athena has no `CREATE OR REPLACE TABLE` or `QUALIFY`. The rollup endpoint now drops the table, clears its S3 prefix, and recreates it. The `QUALIFY` became a subquery. The dedicated analytics bucket holds the output.
- Fargate needs at least 4 GiB of memory at 2 vCPU, so the task has 4 GiB instead of 1 GiB.
- The SQS visibility timeout is 560s instead of the 60s ack deadline. AWS requires it to be at least the Lambda timeout, so a failing message blocks its customer's group for that long.
- A presigned URL signed with role credentials stops working when the session expires, which is usually hours, not 7 days.
- The ALB listens on plain HTTP only, with no certificate. The EventBridge connection uses a dummy API-key header, not real authentication, like the old Scheduler job.

**Assumptions to check**
- `analytics.orders` wasn't in the Terraform, so I assumed a Glue table with a `dt` DATE partition column (standing in for `_PARTITIONDATE`) and an `items` array of rows with `sku` and `qty`. Adjust the SQL if yours differs.
- The `sku` and `qty` types in the `top_items` cast (`VARCHAR`, `BIGINT`) are guesses too.
- The container needs to listen on port 8080, and `us-east-1` is a stand-in for `us-central1`.
- I didn't add a `requirements.txt`. The app needs `boto3` and `flask`.