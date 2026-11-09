I've written the AWS Terraform in `aws/main.tf`, ported `job/export.py` in place, and split the SQL into two Athena files. None of it has been run: I didn't run `terraform validate`, Python or any Athena query.

**Athena vs Redshift:** I chose Athena. The original SQL depends on `FOR SYSTEM_TIME AS OF` (point-in-time reads) and `MERGE`. Athena does both on Iceberg tables with `FOR TIMESTAMP AS OF` and `MERGE INTO`. Redshift has no time travel. The job is also one small batch run a month, so serverless fits better than a cluster.

**Resource mapping**

| GCP | AWS |
|---|---|
| Service account | IAM task role, plus an execution role |
| Secret Manager | Secrets Manager |
| Memorystore Redis (HA) | ElastiCache Redis 7, multi-AZ, with auth and TLS |
| GCS bucket (locked 7-year retention) | S3 with Object Lock in compliance mode, 2555 days, public access blocked, Intelligent-Tiering |
| Cloud Run job (16 tasks, 4 at a time, 3h timeout, 2 retries) | ECS Fargate task run by a Step Functions Map state (max concurrency 4, same timeout and retries) |
| Cloud Scheduler (Berlin time) | EventBridge Scheduler (Berlin time) |
| VPC connector | Fargate in your VPC (`vpc_id` and `subnet_ids` variables) |
| BigQuery | Athena workgroup and results bucket, with Glue/S3/Athena permissions |

I added an ECR repo, a log group and an ECS cluster, which Cloud Run had implicitly. The Redis port is now 6379 instead of 6378.

**Behavior changes**
- **MERGE runs once.** I moved the `MERGE` into its own step before the 16 shards (`PHASE=snapshot`). Sixteen concurrent Iceberg `MERGE`s on one table would fail on commit.
- **Shard assignment changes.** `FARM_FINGERPRINT` is replaced by `crc32`, so accounts land in different shards than before. Assignment is still stable within AWS.
- **Two SQL files.** Athena has no `DECLARE` and no multi-statement queries, so `sql/invoices_snapshot.sql` holds the `MERGE` and `sql/invoices.sql` holds the per-shard `SELECT`. The month dates are computed in Python and substituted in.

**Assumptions to check**
- **Existing tables.** `billing.invoices` and `billing.invoice_snapshots` must already exist as Iceberg tables, with `issued_at` and `updated_at` as timestamp with time zone. Terraform doesn't create them, and neither did the GCP config. You need to supply the `lake_bucket` variable.
- **Region and image.** The region defaults to `eu-west-1`. You still need to build and push the container image, and the repo has no Dockerfile.

**Existing bugs I kept**
- **Skipped invoices after a retry.** The job marks an invoice in Redis before it posts to the partner. If the post fails, the retry skips that invoice, so it is never sent and is missing from the CSV.
- **Redis password.** The GCP Terraform never set `REDIS_AUTH`. AWS now generates a Redis auth token and passes it to the job.

I left `infra/` untouched so you can cut over before removing it.