I've written the AWS Terraform in `aws/main.tf` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I haven't run `terraform validate`, the app or the SQL, so none of it is tested. The old `infra/` directory is untouched.

**Service mapping**
- **GCS → S3:** versioning, a 30-day move to Standard-IA (Nearline's equivalent), delete at 365 days, and public access blocked.
- **Pub/Sub → SNS FIFO, SQS FIFO and a DLQ:**
  - `customer_id` becomes the message group ID, which preserves ordering.
  - The DLQ takes a message after 5 receives.
  - The worker is now a Lambda on SQS with partial-batch failure handling. A failed message also holds back later messages from the same customer in that batch.
- **Cloud SQL → RDS Postgres 15:** Multi-AZ, IAM auth, point-in-time recovery, and a password managed by AWS.
- **Cloud Run → ECS Fargate behind an ALB:**
  - The service has 2 vCPU, 1 GB, 1–20 tasks, and a 900 s idle timeout.
  - The `api-sa` service account becomes a task role with equivalent permissions.
- **Cloud Scheduler → EventBridge Scheduler:** same cron (`0 2 * * *`) and `America/New_York` time zone, calling the API through an API destination.
- **BigQuery → Athena and Glue:** there is a Glue database, an Athena workgroup, and an S3 bucket for results and tables.

**Behavior differences to know about**
- **SQS visibility timeout:** it is 540 s because it must be at least the Lambda timeout. The GCP ack deadline was 60 s.
- **Autoscaling:** it uses requests per target as a rough stand-in for Cloud Run's concurrency of 80.
- **Presigned PUT URLs:** the 7-day expiry can't be honored with role credentials. URLs die when the task's temporary credentials expire, roughly 6 hours at most. Fixing that needs a dedicated IAM user.
- **Rollup SQL:**
  - Athena has no `QUALIFY`, so I used a subquery.
  - There is no aggregate `LIMIT`, so I used `slice(array_agg(... ORDER BY ...), 1, 3)`.
  - `SAFE_CAST` became `TRY_CAST`, and `APPROX_COUNT_DISTINCT` became `approx_distinct`.
  - `CREATE OR REPLACE TABLE` became `DROP` followed by a `CREATE TABLE AS` on Iceberg. This is not atomic, so readers can briefly see no table.
- **Assumed rollup schema:** `analytics.orders` already exists in Glue with a date partition column `dt` (replacing `_PARTITIONDATE`). I also assumed `items` is an array of rows with `sku` as `VARCHAR` and `qty` as `BIGINT`. Adjust if the real types differ.

**Things to do or decide**
- **Terraform inputs:** you need to supply `vpc_id`, `public_subnet_ids`, `db_subnet_ids` and `scheduler_api_key`.
- **Scheduler API key:** the app doesn't check the `x-api-key` header yet.
- **HTTP only:** the ALB listens on plain HTTP, so you'll want an ACM certificate and an HTTPS listener.
- **Healthcheck route:** I added `/healthz` for the ALB.
- **Container port:** the container must listen on 8080.
- **Cloud SQL socket volume:** Cloud Run mounted a Cloud SQL socket volume, and that has no AWS equivalent. The task gets `DB_HOST` and connects over the network instead. The API code doesn't use the database today.