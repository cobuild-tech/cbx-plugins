I've written the AWS Terraform in `aws/main.tf` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I haven't run `terraform validate`, tested the app code, or run the SQL in Athena.

The old `infra/main.tf` is untouched.

**Resource mapping**
- GCS bucket → S3 with versioning and lifecycle rules.
- Pub/Sub topic, subscription and DLQ → SNS FIFO topic, SQS FIFO queue (5 receives, then DLQ) and a DLQ queue.
- Cloud SQL → RDS Postgres 15, Multi-AZ, IAM auth, backups with point-in-time recovery.
- Cloud Run → ECS Fargate behind an ALB (min 1, max 20 tasks).
- Cloud Function → Lambda triggered by SQS.
- BigQuery → Athena workgroup and Glue database.
- Cloud Scheduler → EventBridge Scheduler (02:00 America/New_York) plus a small Lambda that does the POST.
- Service account → IAM task role.

**Behaviour differences**
1. **Region:** `us-central1` becomes `us-east-2`. It's a variable, and the bucket location "US" has no equivalent.
2. **Storage class:** the 30-day Nearline transition becomes STANDARD_IA. Lifecycle rules also apply to noncurrent versions explicitly.
3. **Signed URL expiry:** `ExpiresIn` is 7 days, but with task-role (temporary) credentials the URL stops working when the credentials expire, which is typically within hours. GCS signed URLs lasted the full 7 days.
4. **Ordering and duplicates:** the ordering key becomes `MessageGroupId`, and the queue and topic are FIFO. FIFO deduplicates identical message bodies within 5 minutes, which Pub/Sub did not. `customer_id` is now cast to a string.
5. **Visibility timeout:** the 60s ack deadline becomes 540s, because it must be at least the Lambda timeout. Redelivery after a failure is slower.
6. **Retry batching:** Lambda batch size is 1 to mimic per-message retry. Retries now come from SQS visibility expiry rather than Pub/Sub retry policy.
7. **Message format:** the worker reads a raw SQS body rather than a base64 Pub/Sub envelope.
8. **Naming:** topic and queue names carry the required `.fifo` suffix.
9. **Database access:** there's no Cloud SQL proxy volume. The app connects directly via `DB_HOST` over the default VPC, and it still ignores the DB in the code. The instance is `db.m5.large` (about 2 vCPU and 8 GiB), a rough match for `db-custom-2-7680`.
10. **Memory:** the API container has 4 GiB instead of 1 GiB, because Fargate requires at least 4 GiB with 2 vCPU.
11. **Scaling and HTTPS:** autoscaling targets 80 requests per task rather than 80 concurrent requests per instance. The ALB listens on HTTP only, not Cloud Run's HTTPS. The Lambda that calls `/jobs/rollup` uses that plain HTTP URL.
12. **Request timeout:** the ALB idle timeout is 900s, and the rollup trigger Lambda times out at 900s. That is similar to Cloud Run's 900s request timeout.
13. **Cloud Function limits:** Lambda has a 540s timeout and 512 MB, as before. The Cloud Function had no service account defined, and the Lambda has only logging and SQS permissions.
14. **Scheduler:** there's an extra Lambda hop, and the job fails if the Lambda's POST doesn't return success.
15. **Rollup is not atomic:** `CREATE OR REPLACE TABLE` becomes `DROP TABLE` followed by `CREATE TABLE ... AS`. Readers can see the table missing in between, and old Parquet files stay in S3 after the drop.
16. **Rollup SQL:**
    - `SAFE_CAST` becomes `TRY_CAST` to `DECIMAL(38,9)`.
    - `APPROX_COUNT_DISTINCT` becomes `approx_distinct`, which has a different error margin.
    - `ARRAY_AGG(... LIMIT 3)` becomes `slice(...)`.
    - `QUALIFY` becomes a subquery.
    - `TIMESTAMP_TRUNC` becomes `date_trunc`. It assumes `created_at` is UTC.
    - `qty` is assumed to be BIGINT and `sku` VARCHAR.
17. **Partition column:** the BigQuery pseudo-column `_PARTITIONDATE` is assumed to become an `analytics.orders` partition column named `partition_date`. The orders table and its data (`analytics.orders`) aren't defined in the repo, so I didn't create them in Terraform. They need loading into Athena or Glue.
18. **Rollup execution:** the endpoint now runs two statements one after the other, polling Athena until each finishes. Results go to a new S3 bucket (`<project>-athena`) and an IAM policy grants Glue and Athena access.
19. **Environment variables:** `GOOGLE_CLOUD_PROJECT` is replaced by `ORDERS_TOPIC_ARN`, plus `ATHENA_*` and `DB_HOST`.
20. **Container image:** an ECR repo `app/api` holds the image, which must be pushed as `:latest`. There's no Dockerfile in the repo, and the container is assumed to listen on 8080.
21. **Deployment:** the Fargate task has a public IP in the default VPC, and `skip_final_snapshot` is true on RDS.