I wrote the AWS port, but I haven't run or tested any of it. I didn't run `terraform validate` or the job, and I haven't confirmed that the farmhash sharding matches BigQuery.

## What changed
- **`aws/main.tf`** (new) has the same resources as `infra/main.tf`, which I left in place:
  - Cloud Run job → AWS Batch Fargate array job, 16 children, 2 vCPU / 4 GiB, 3-hour timeout, 3 attempts. Concurrency of 4 comes from capping the compute environment at 8 vCPU.
  - Cloud Scheduler → EventBridge Scheduler, `cron(0 3 1 * ? *)` in Europe/Berlin.
  - Memorystore → ElastiCache Redis 7, Multi-AZ, TLS, auth token.
  - GCS bucket → S3 with Object Lock in COMPLIANCE mode for 2555 days, public access blocked, and Intelligent-Tiering.
  - Secret Manager → Secrets Manager.
  - Service account → IAM roles. I also added an ECR repo, an Athena workgroup with a results bucket, and a log group.
- **`job/export.py`** is ported in place to boto3, Athena and S3.
- **`sql/invoices.sql`** is ported in place to Athena.

**Athena over Redshift:** the query depends on `FOR SYSTEM_TIME AS OF` (a point-in-time read) plus `MERGE`. Athena handles both on Iceberg tables, and Redshift has no time travel. Athena is also serverless, which suits one monthly job.

## Things you need to do
- `billing.invoices` and `billing.invoice_snapshots` must be Iceberg tables in Glue, with timestamps stored in UTC. Terraform doesn't create them, and `data_bucket_name` must point at the bucket that holds them.
- Add a `requirements.txt` or Dockerfile with `boto3` and `pyfarmhash`, and push the image to ECR.
- Set the `partner-api-key` secret value by hand, as before.
- Think before applying: the locked 7-year retention can't be undone once it's applied.

## Behaviour differences
1. **Sharding is done in Python, not SQL.** Athena has no `FARM_FINGERPRINT`, so I use `pyfarmhash` `fingerprint64` and replicate `MOD(ABS(...))`. It should give the same shard assignments, but I haven't checked that against real data. Every task now reads all snapshot rows and filters them itself.
2. **Statements run separately.** Athena can't run `DECLARE` or multi-statement scripts, so the Berlin month boundaries are computed in Python and substituted into the SQL, and the MERGE and SELECT run one after the other.
3. **Concurrent MERGEs.** All 16 tasks run the same MERGE at once. BigQuery serialised these, but Iceberg commits can conflict, so I added a retry loop (5 attempts) on `ICEBERG_COMMIT_ERROR`.
4. **Time travel limits differ.** BigQuery allows at most 7 days back. Iceberg depends on how long you keep snapshots.
5. **Value handling.** Athena returns everything as strings. I cast integer columns back to `int` so the JSON still has numeric `amount_cents`. NULL and empty-string values can't be told apart in Athena results.
6. **Attempt number.** Batch attempts start at 1, so I subtract 1 to keep the old 0-based value stored in Redis.
7. **Redis auth.** The old code read `REDIS_AUTH`, but the Terraform never set it, so auth would have failed. The new setup generates an auth token and injects it as `REDIS_AUTH`. The Redis port changes from 6378 to 6379.
8. **Region and sizing.** europe-west1 becomes eu-west-1. Redis is `cache.t4g.small` (about 1.4 GB, versus 1 GB).
9. **Networking.** Tasks run in the default VPC with a public IP to reach the partner API. This is similar to `PRIVATE_RANGES_ONLY` egress, but it isn't the same network path.
10. **Object Lock needs versioning.** The export bucket is versioned, which GCS wasn't. The `if_generation_match=0` check becomes `IfNoneMatch="*"`, which also fails if the key already exists. Bucket names now use the AWS account ID instead of `project_id`.
11. **Autoclass.** Intelligent-Tiering is similar to GCS Autoclass but not identical.
12. **Scheduler.** EventBridge Scheduler submits the Batch job directly, so there's no HTTP call to a run endpoint. Retry behaviour on failed schedule invocations may differ.
13. **Task count.** Tasks read `TASK_COUNT` from an environment variable I set to 16, because Batch doesn't expose the array size.
14. **Image tag.** The image comes from the new ECR repo `jobs/billing-export`, still tagged `latest`.