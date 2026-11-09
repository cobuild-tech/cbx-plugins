I ported all three pieces, but none of it has been run, planned or applied. There was no Terraform, AWS or Athena access here, so it's untested. The old `infra/` is untouched.

**Athena over Redshift.** The SQL needs `MERGE` and point-in-time reads (`FOR SYSTEM_TIME AS OF`). Athena supports both on Iceberg tables (`FOR TIMESTAMP AS OF`). Redshift has no time travel, so it couldn't reproduce the "invoices as at month end" snapshot. Athena is also serverless, which suits a monthly job.

**What changed**
- **`aws/main.tf`**:
  - The Cloud Run job becomes an AWS Batch array job on Fargate: 16 tasks, 2 vCPU, 4 GiB, 3 attempts, 10800s timeout.
  - Cloud Scheduler becomes EventBridge Scheduler (`cron(0 3 1 * ? *)`, Europe/Berlin).
  - Secret Manager becomes Secrets Manager.
  - Memorystore becomes an ElastiCache Redis 7 pair with failover, TLS, auth and port 6378.
  - The GCS bucket becomes S3 with Object Lock in compliance mode for 2555 days (the same 7 years), public access blocked and Intelligent-Tiering.
  - It also adds IAM roles, security groups, an Athena workgroup and a results bucket.
- **`job/export.py`**:
  - It runs the Athena queries and converts the result types.
  - It does the sharding in Python.
  - It writes to S3 with `IfNoneMatch="*"`.
- **`sql/invoices.sql`**: now two Athena statements split by a `-- ;;` marker. `{month_start}` is filled in by the job.

**Assumptions to check**
- `billing.invoices` and `billing.invoice_snapshots` already exist as Iceberg tables in the Glue database `billing`. I didn't create them or migrate any data. `var.lake_bucket` must name the bucket that holds them.
- Iceberg timestamps are treated as UTC `timestamp` columns.
- The container image is in ECR at `jobs/billing-export:latest`. The Terraform doesn't create that repository.

## Behaviour differences
1. **Sharding:** BigQuery's `FARM_FINGERPRINT` doesn't exist in Athena, so each task now fetches all rows and filters in Python with pyfarmhash. The shard assignment should be identical (signed fingerprint, then `ABS`, then `MOD`) but needs checking against real data. NULL `account_id` still matches no shard. BigQuery would error on `ABS(INT64_MIN)`, and Python won't.
2. **Month computation:** `month_start` is now computed once in Python and passed to both statements. The old script computed it inside one BigQuery script.
3. **Two queries:** the MERGE and the SELECT run as separate Athena queries, not one script.
4. **Concurrent MERGE:** all 16 tasks still run the MERGE. Iceberg commits can conflict where BigQuery would serialise them, so I added a retry with backoff, up to 10 times.
5. **`INSERT ROW`:** replaced by an explicit column list, which assumes the snapshot table's columns are exactly those six.
6. **Time-travel limit:** BigQuery allows a fixed window. Athena needs the Iceberg snapshot at month end to still exist (no snapshot expiry or vacuum before then).
7. **Concurrency of 4:** Batch has no array parallelism setting. I capped the compute environment at 8 vCPU, which gives 4 concurrent tasks, but it is a capacity limit rather than a hard parallelism cap.
8. **Retries and timeout:** Batch retries a failed task and applies the timeout per attempt, as Cloud Run does. The task attempt number is now `AWS_BATCH_JOB_ATTEMPT - 1`, which keeps the value in Redis the same as before.
9. **Task count:** it is no longer provided by the platform. It is set as the `TASK_COUNT=16` environment variable and must match the array size.
10. **Redis auth:** the old code read `REDIS_AUTH`, but the Terraform never set it. The new Terraform generates an auth token (stored in Secrets Manager and in Terraform state) and injects it. Redis TLS now uses ElastiCache's publicly trusted certificates.
11. **Redis size:** `cache.t4g.small` is about 1.4 GiB, not exactly 1 GB. It runs as a primary plus one replica.
12. **VPC connector:** there is no equivalent. Tasks run in the default VPC subnets with public IPs, which approximates `PRIVATE_RANGES_ONLY` egress.
13. **IAM:** there are three roles (task, execution, scheduler) instead of one service account. The old Terraform granted that service account only secret access. The new task role also gets S3, Athena and Glue permissions, because the old Terraform didn't show where the BigQuery and GCS grants lived.
14. **S3 vs GCS locking:** Object Lock requires versioning, and the lock is set as a default retention on new objects. GCS applied a bucket-level retention policy. The overwrite protection comes from `IfNoneMatch`, as it did from `if_generation_match=0` before.
15. **Scheduler retries:** set to 0 to match Cloud Scheduler's default.
16. **Region and names:** the region is `eu-west-1` (Ireland), as AWS has no Belgium region. The bucket name uses `var.name_prefix` instead of the GCP project id.
17. **Data types:** Athena returns strings, so I convert integer, float and boolean columns by their Athena type. A column type I didn't anticipate would be posted and written as a string.