I wrote the AWS Terraform and ported the app code and SQL in place. I haven't run `terraform validate` or `plan`, and nothing was applied or executed. I also skipped the skill's `.migration/` plan-and-approval flow because you asked for the changes directly. The old GCP Terraform in `infra/` is untouched.

**Resource mapping** (`aws/main.tf`, region us-east-2)
- **Storage:** the GCS bucket becomes an S3 bucket with versioning and a public-access block. Nearline becomes STANDARD_IA at 30 days, with deletion at 365 days.
- **Messaging:** Pub/Sub becomes an SNS FIFO topic, an SQS FIFO queue and a FIFO dead-letter queue (5 receives). The customer id is the message group id, which keeps the per-customer ordering.
- **Database:** Cloud SQL becomes a Multi-AZ RDS Postgres 15 `db.m6g.large` with IAM auth and 7-day backups with point-in-time recovery.
- **API:** Cloud Run becomes ECS Fargate behind an ALB, with min 1 and max 20 tasks, a 900s timeout and an ECR repo. App Runner was ruled out because its request timeout is fixed at 120s.
- **Worker:** the Cloud Function becomes a Lambda on the SQS queue (540s timeout, 512 MB, batch size 1).
- **Scheduler:** Cloud Scheduler becomes EventBridge Scheduler (`0 2 * * *`, America/New_York). It calls a small invoker Lambda, because EventBridge HTTP targets time out at 5s.
- **Analytics:** the BigQuery dataset becomes a Glue database, an Athena workgroup and an S3 bucket.
- **IAM:** the service account becomes an `api-sa` task role. I added SNS, Athena, Glue and analytics-bucket permissions the app needs, because the GCP Terraform never granted them.

**App and SQL**
- `api.py` now uses boto3. Signed upload URLs, order publishing and the rollup job all use AWS calls.
- The rollup drops the table and clears its S3 prefix before recreating it, because Athena has no `CREATE OR REPLACE`.
- `worker.py` is now an SQS Lambda handler. The message is no longer base64-wrapped, because raw message delivery is on.
- `rollup.sql` is converted to Athena syntax. That covers `TRY_CAST`, `approx_distinct`, `slice(array_agg …)`, `UNNEST`, and a subquery in place of `QUALIFY`.

**Differences and open items**
- **Upload URLs:** the 7-day presigned PUT URLs will stop working when the task role's temporary credentials expire, after hours rather than days. Fixing that needs long-lived credentials or a redesign, so I left it for you to decide.
- **Memory and scaling:** Fargate needs at least 4 GB for 2 vCPU, so memory is 4 GB instead of 1 GiB. Autoscaling tracks requests per target rather than concurrent requests.
- **Lifecycle:** AWS counts noncurrent-version age from when the version became noncurrent. GCS counts from creation.
- **Rollup gap:** the table is briefly missing during a rollup run, because the drop and recreate isn't atomic.
- **Inputs you must supply:**
  - VPC and subnet ids.
  - An ACM certificate and a hostname pointing at the ALB.
  - The container image pushed to ECR.
  - The `analytics.orders` Glue table, which isn't in the repo. I assumed `items` is `array<row(sku varchar, qty bigint)>` and that there is a `partition_date` partition column replacing `_PARTITIONDATE`. Please check both.
- **Postgres data:** nothing here moves it. You'd need DMS or a dump and restore.
- **Not covered:** the `orders` table data and the `gcloud`-side cutover.