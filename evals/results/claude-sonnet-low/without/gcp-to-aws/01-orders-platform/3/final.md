I wrote the AWS Terraform in `aws/` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I haven't run `terraform validate`, run the app, or run the SQL in Athena, so none of it is tested. I left the original `infra/main.tf` untouched.

**Resource mapping**
- **Storage:** GCS becomes S3 with versioning. Objects move to STANDARD_IA after 30 days and expire after 365, and I added the same 365-day expiry for old versions.
- **Messaging:** Pub/Sub becomes a FIFO SNS topic feeding a FIFO SQS queue, with a FIFO dead-letter queue after 5 receives. Ordering is kept through `MessageGroupId=customer_id`.
- **Database:** Cloud SQL becomes RDS Postgres 15 on `db.m5.large`, Multi-AZ, with IAM auth and 7-day backups (which gives point-in-time recovery).
- **API:** Cloud Run becomes ECS Fargate behind an ALB (900s idle timeout), autoscaling from 1 to 20 tasks at about 80 requests per target. I used Fargate rather than App Runner because App Runner can't do 900s requests.
- **Worker:** Cloud Functions becomes a Lambda triggered by SQS, one message per invocation.
- **Analytics:** BigQuery becomes Athena with a Glue database and an S3 bucket.
- **Nightly job:** Cloud Scheduler becomes EventBridge Scheduler (02:00 America/New_York). It invokes a small Lambda, `aws/scheduler_lambda.py`, that POSTs to `/jobs/rollup`, because Scheduler can't call arbitrary HTTP endpoints.

**Code changes**
- **`api.py`:** It now uses boto3 for S3 presigned PUT URLs, SNS publishing and Athena queries. I added a `/healthz` endpoint for the ALB health check.
- **`worker.py`:** It now reads SQS events instead of Pub/Sub ones.

**SQL changes**
- **Syntax ported to Athena:**
  - `QUALIFY` became a subquery.
  - `ARRAY_AGG … LIMIT` became `slice(array_agg(...), 1, 3)`.
  - `SAFE_CAST` became `TRY_CAST`.
  - `APPROX_COUNT_DISTINCT` became `approx_distinct`.
  - `UNNEST` became `CROSS JOIN UNNEST`.
- **Non-atomic refresh:** Athena has no `CREATE OR REPLACE TABLE`, so the app runs `DROP TABLE` and then `CREATE TABLE AS` at a fresh S3 prefix on each run. The table is briefly missing during a refresh.
- **Old output:** Old output prefixes are deleted after 14 days.

**Things to check or decide**
- **Existing data:** I didn't migrate the BigQuery `analytics.orders` table, the Cloud SQL data or the GCS objects.
- **Schema assumptions in the SQL:** I assumed `orders` is partitioned by a date column named `dt` (replacing `_PARTITIONDATE`). I also assumed `sku` is a string and `qty` is a bigint. Adjust these if your schema differs.
- **Presigned URLs:** They are capped at 7 days, but with role credentials they stop working when the credentials expire, which is usually much sooner.
- **Memory:** Fargate's minimum for 2 vCPU is 4 GB, so the API gets 4 GB instead of 1 GiB.
- **Queue timeout:** The SQS visibility timeout is 540s rather than 60s, because it can't be shorter than the Lambda timeout.
- **TLS:** The ALB listens on HTTP only. You'll need an ACM certificate and an HTTPS listener.
- **Network:** Everything runs in the default VPC with public IPs on the tasks. You'll probably want a proper VPC with NAT.
- **Image:** You need to push the API image to the new ECR repo (`app/api:latest`).