I've written the AWS Terraform, ported the job in place, and split the SQL into two Athena files. None of it has been run: I didn't run `terraform validate` or `plan`, and I haven't executed the job or any Athena query.

**Athena over Redshift.** The SQL depends on `FOR SYSTEM_TIME AS OF` and `MERGE`. Athena on Iceberg tables supports both, and it's serverless like BigQuery. Redshift has no time travel, so the end-of-month snapshot semantics would be lost.

**Terraform (`aws/main.tf`, region eu-west-1)**
- **Secrets:** Secrets Manager holds the partner API key, plus a generated Redis auth token.
- **Dedupe:** ElastiCache Redis 7 with a primary and a replica, failover, TLS and auth.
- **Exports bucket:** Object Lock in COMPLIANCE mode for 2555 days (7 years), public access blocked, and Intelligent-Tiering from day 0 in place of Autoclass.
- **Job:** an AWS Batch array job of size 16 on Fargate with 2 vCPU, 4 GB, 3 attempts and a 3-hour timeout. Concurrency is capped at 4 through the compute environment's max vCPUs (8).
- **Schedule:** an EventBridge Scheduler job at `0 3 1 * *` Europe/Berlin submits the array job.
- **Supporting resources:** an ECR repo, IAM roles, an Athena workgroup, a results bucket and the Glue `billing` database.

**Job code.** `job/export.py` now uses Athena and S3 (`IfNoneMatch="*"` in place of `if_generation_match=0`). It retries the MERGE on Iceberg commit conflicts, since all 16 tasks run it. It also casts Athena's string results back to typed values so the partner API still receives numeric `amount_cents`.

**SQL.** `invoices_merge.sql` and `invoices_select.sql` replace `invoices.sql`, which is now a stub comment. Athena has no `DECLARE` and no multi-statement queries, so the month boundary is computed inline in each file.

**Things to check**
- **Shard assignment changes.** `FARM_FINGERPRINT` has no Athena equivalent, so I used `xxhash64`. Accounts land in different shards than before, and the Redis dedupe keys start empty.
- **Locked bucket.** Object Lock is irreversible once objects are written, matching `is_locked = true`.
- **Existing tables.** `billing.invoices` and `billing.invoice_snapshots` must already exist as Iceberg tables in a bucket you pass as `var.lake_bucket`. Terraform doesn't create them, just as the original didn't create the BigQuery datasets. Time travel also needs Iceberg snapshots kept at least until the month rolls over.
- **Redis auth was missing.** The original code read `REDIS_AUTH`, but the GCP job never set it. I wired it to the secret on AWS.
- **Dedupe bug kept as-is.** The job records an invoice in Redis before posting it. If the post fails and the task retries, that invoice is skipped and never sent. I didn't change this.
- **Left alone.** `infra/` (the GCP Terraform) is untouched. The partner API key secret has no value yet, as before.