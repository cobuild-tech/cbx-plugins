I've written the AWS Terraform in `aws/main.tf`, ported `job/export.py` in place, and ported the SQL. I haven't run any of it: no `terraform validate`, no Athena queries, no job run. The old GCP code in `infra/` is untouched.

**Athena over Redshift.** The SQL depends on `FOR SYSTEM_TIME AS OF` (point-in-time reads) and on `MERGE`. Athena supports both on Iceberg tables, with `FOR TIMESTAMP AS OF`. Redshift has no time travel, so it couldn't reproduce the month-end snapshot. Athena is also serverless, which suits a monthly job.

**What changed**
- **Terraform (`aws/main.tf`):**
  - Cloud Run job → AWS Batch array job (16 children, 3 attempts, 3-hour timeout, 2 vCPU / 4 GB on Fargate).
  - Cloud Scheduler → EventBridge Scheduler (`cron(0 3 1 * ? *)`, Europe/Berlin).
  - Secret Manager → Secrets Manager.
  - Memorystore → ElastiCache Redis 7, 2 nodes, multi-AZ, TLS and auth.
  - GCS bucket → S3 with Object Lock (compliance mode, 2555 days = 7 years), versioning, public access block, and Intelligent-Tiering in place of Autoclass.
  - Added a workgroup and results bucket for Athena, plus IAM roles for the job, the image/secret pull and the scheduler.
- **SQL:** The one script is now two, because Athena runs one statement per query. `sql/invoices_merge.sql` holds the MERGE and `sql/invoices.sql` holds the SELECT. `DECLARE` doesn't exist in Athena, so `month_start` is inlined.
- **Job:** Athena replaces BigQuery and S3 replaces GCS. The write still fails if the object already exists, using `IfNoneMatch="*"` in place of `if_generation_match=0`. Sharding now happens in Python with `pyfarmhash`, which should give the same shard assignment as `FARM_FINGERPRINT`.

**Before deploying:** the `billing.invoices` and `billing.invoice_snapshots` tables aren't defined in the repo. They must exist as Iceberg tables in Glue, with data migrated, and `data_bucket_arn` must point at their bucket. The `billing-export` image also needs pushing to ECR, and `pyfarmhash` and `boto3` (1.35 or later) need adding to it.

**Behaviour differences**
1. **Shard assignment is unverified.** I couldn't test that `pyfarmhash` matches BigQuery's `FARM_FINGERPRINT`. If it doesn't, accounts land in different shards than before. Check a few account IDs before the first real run.
2. **Each task now reads every row.** The shard filter moved from SQL to Python, so all 16 tasks read the full result set.
3. **`abs()` edge case.** BigQuery would error on `ABS(INT64_MIN)`. Python won't.
4. **MERGE/SELECT timing.** They now run as two separate queries, so a run straddling Berlin midnight on the 1st could compute different months. This is practically negligible.
5. **Concurrent MERGEs.** All 16 tasks still run the MERGE. Iceberg commits can conflict where BigQuery queued them, so the code retries on commit errors, which BigQuery never needed.
6. **Timestamps assumed UTC.** Athena Iceberg `timestamp` has no time zone. I assumed `issued_at` and `updated_at` are stored in UTC, as BigQuery `TIMESTAMP` is.
7. **Time travel window.** BigQuery keeps 7 days. Iceberg keeps snapshots according to your table's retention settings, so check they cover the 1st of the month.
8. **Redis port and auth.** The port is 6379, not 6378. The old Terraform enabled auth but never set `REDIS_AUTH`, which was a latent bug. The new Terraform generates a token and injects it.
9. **Retry numbering.** Batch attempts are 1-based, and I subtract 1 so the value stored in Redis stays 0-based.
10. **Parallelism of 4 is approximate.** It comes from capping the compute environment at 8 vCPUs. Cloud Run enforced it exactly.
11. **Network.** Tasks run in the default VPC with public IPs. GCP used a VPC connector with private-range-only egress. There is no CIDR equivalent of `10.8.0.0/28`.
12. **Redis sizing.** Memorystore 1 GB becomes `cache.m6g.large`, the smallest HA-suitable size, so it has more memory.
13. **Retention.** S3 Object Lock applies per object version and needs versioning, which the bucket didn't have before. Intelligent-Tiering from day 0 approximates Autoclass but isn't identical.
14. **Region and names.** The region is `eu-west-1`, the nearest to europe-west1. Bucket names are global, so I used a prefix variable. The scheduler has retries off (GCP's default is none).
15. **Types.** Athena returns strings, so I convert integer columns to `int`. Other columns, such as `amount_cents` if it isn't an integer type, stay strings.
16. **Failure behaviour.** A failed S3 write now raises a `ClientError` (`PreconditionFailed`) rather than the GCS precondition error.