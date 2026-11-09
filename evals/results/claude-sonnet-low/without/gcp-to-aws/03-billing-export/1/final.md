I wrote the AWS Terraform, ported the job and rewrote the SQL, but none of it has been run, planned or validated. I left `infra/main.tf` (the GCP version) in place.

**Athena, not Redshift.** The query uses `FOR SYSTEM_TIME AS OF` to read invoices as of month-end. Athena's Iceberg tables support the equivalent (`FOR TIMESTAMP AS OF`) and `MERGE`. Redshift has no time travel, so you'd need to build snapshotting yourself. Athena is also serverless, which suits a monthly job.

**`aws/main.tf`**
- **Secrets:** Secrets Manager holds the partner API key. A second secret holds the Redis auth token, which Terraform generates.
- **Redis:** ElastiCache Redis 7 with two nodes, failover, TLS and auth.
- **Export bucket:** an S3 bucket with Object Lock in COMPLIANCE mode for 2555 days (7 years), versioning, public access blocked, and an Intelligent-Tiering lifecycle rule in place of Autoclass.
- **Job:** AWS Batch on Fargate, as a 16-child array job with 3 attempts (2 retries), a 3-hour timeout, and 2 vCPU / 4 GB per task. Batch has no per-array concurrency cap, so `parallelism = 4` is enforced by capping the compute environment at 8 vCPUs.
- **Schedule:** EventBridge Scheduler at `cron(0 3 1 * ? *)` in Europe/Berlin. IAM roles replace the GCP service account.
- **Athena:** a workgroup, a results bucket and a Glue `billing` database. The Iceberg tables themselves aren't created, same as the GCP config.
- **Inputs:** it needs `name_prefix`, `vpc_id`, `private_subnet_ids`, `vpc_cidr` and `datalake_bucket_arn`. The default region is eu-west-1; use eu-central-1 if you prefer Frankfurt. The private subnets need a NAT route because the job calls the public partner API.

**`job/export.py`**
- Batch's array index and attempt variables replace the Cloud Run ones, and the job reads the task count from `TASK_COUNT`.
- boto3 runs the two Athena statements. The `MERGE` is retried because all 16 tasks run it and can hit Iceberg commit conflicts.
- The S3 write uses `IfNoneMatch="*"`, matching the GCS `if_generation_match=0`.

**`sql/invoices.sql`**
- The `DECLARE` is gone. The job computes the month start in Berlin time and fills it into the SQL.
- The `MERGE` lists its insert columns explicitly, because Athena has no `INSERT ROW`.
- `FARM_FINGERPRINT` has no Athena equivalent, so sharding now uses `crc32`. Accounts will land in different shards than before, so don't compare shard files across the cutover.

**Things to check**
- **Object Lock:** COMPLIANCE mode can't be undone once objects are written. That matches the GCP `is_locked = true`.
- **Timestamps:** I assumed the Iceberg `issued_at` and `updated_at` columns hold UTC.
- **Redis auth:** the GCP config never passed `REDIS_AUTH` to the job. I wired it up from the generated secret, since ElastiCache auth needs it.
- **Existing bug, left as-is:** the job writes the Redis dedupe key before the partner POST. If a POST fails and the task retries, that invoice is skipped and missing from the CSV. It looks worth fixing separately.