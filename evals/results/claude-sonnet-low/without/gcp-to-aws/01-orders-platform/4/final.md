I've written the AWS Terraform in `aws/main.tf` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I haven't run `terraform validate`, the app, or the SQL, so none of it is tested. I left `infra/main.tf` (the GCP version) untouched.

**Service mapping**

| GCP | AWS |
|---|---|
| GCS bucket (versioning, 30-day Nearline, 365-day delete) | S3 with versioning, 30-day Standard-IA, 365-day expiry (also applied to old versions), public access blocked |
| Pub/Sub topic, ordered subscription, DLQ after 5 attempts | SNS FIFO topic → SQS FIFO queue (redrive after 5 receives) → FIFO DLQ |
| Cloud SQL Postgres 15 (regional, IAM auth, point-in-time recovery) | RDS Postgres 15, Multi-AZ, `db.m5.large`, IAM auth, 7-day backups |
| Cloud Run (min 1, max 20, 900s timeout) | ECS Fargate behind an ALB with a 900s idle timeout, autoscaling 1–20 |
| `api-sa` service account | `api-sa` task role with the same bucket permissions, plus SNS publish, RDS connect and Athena/Glue/S3 access |
| Cloud Function worker | Lambda (python3.12, 540s, 512MB) triggered by SQS |
| BigQuery dataset `analytics` | Glue database, Athena workgroup, and an analytics S3 bucket |
| Cloud Scheduler (02:00 America/New_York, POST `/jobs/rollup`) | EventBridge Scheduler → event bus → rule → API destination, same time zone |

**App and SQL changes**
- `api.py` now uses boto3: a presigned PUT URL, an SNS publish with `MessageGroupId` set to `customer_id`, and the rollup run through Athena. I added a `/healthz` endpoint for the ALB health check.
- `worker.py` reads SQS records. It reports partial batch failures, and after the first failure it also fails the rest of the batch so per-customer ordering holds.
- `rollup.sql` is rewritten for Athena/Trino, which has no `QUALIFY`, `SAFE_CAST` or `ARRAY_AGG … LIMIT`, so it uses `TRY_CAST`, `slice` and a nested `ROW_NUMBER` instead. Athena also has no `CREATE OR REPLACE TABLE`, so `/jobs/rollup` now drops the table and clears its S3 prefix before the CTAS.

**Differences from the GCP behavior, and assumptions to check**
- **Memory:** Fargate needs at least 4GB for 2 vCPU, so the API gets 4GB instead of 1Gi.
- **Queue timeout:** the SQS visibility timeout is 540s rather than the original 60s ack deadline, because Lambda requires it to be at least the function timeout.
- **Presigned URLs:** they request 7 days, but they will actually expire when the task role's temporary credentials do, which is hours.
- **Analytics table:** I assumed `analytics.orders` is a Glue table with a date partition column `dt` and an `items` array of structs. You'll need to create that table.
- **Scheduler endpoint:** the ALB listener is HTTP on port 80 because no certificate was given. The scheduler call carries a placeholder API-key header, because EventBridge connections require one. The endpoint was unauthenticated on GCP too.
- **Variables:** you must supply `vpc_id`, `public_subnet_ids` and `private_subnet_ids`. The region defaults to us-east-2.
- **Image:** I created an ECR repo (`app/api`), but the repo has no Dockerfile. The task definition expects an image tagged `:latest` listening on port 8080.