I've written the AWS Terraform in `aws/main.tf`, ported the job in place in `job/export.py`, and rewritten `sql/invoices.sql` for Athena. Nothing has been run. I had no shell, so there was no `terraform validate`, no Athena run, and no check of the FarmHash port.

**Why Athena over Redshift:** the query uses `FOR SYSTEM_TIME AS OF` to read invoices as they were at month-end. Athena has an equivalent for Iceberg tables (`FOR TIMESTAMP AS OF`). Redshift has no time travel. It also supports `MERGE`, and for one monthly batch a serverless engine avoids paying for an idle cluster.

**Mapping:**

| GCP | AWS |
|---|---|
| Cloud Run job (16 tasks, parallelism 4, 2 vCPU / 4 GiB, 10800 s timeout, 2 retries) | Batch array job on Fargate: size 16, 3 attempts, 10800 s per attempt, compute environment capped at 8 vCPU |
| Cloud Scheduler | EventBridge Scheduler: `cron(0 3 1 * ? *)`, Europe/Berlin |
| Secret Manager plus accessor binding | Secrets Manager plus an execution-role policy |
| Memorystore Redis (HA, 1 GB, TLS, auth) | ElastiCache Redis 7 replication group: 2 nodes, Multi-AZ, TLS, auth token, port 6378 |
| VPC connector | Default VPC and subnets, security groups, public IP so the partner API stays reachable |
| GCS bucket (7-year locked retention, public access prevention, uniform access, autoclass) | S3 bucket: Object Lock in COMPLIANCE mode for 2555 days, public access block, BucketOwnerEnforced, Intelligent-Tiering lifecycle |
| BigQuery | Athena workgroup, Glue database and results bucket |

**Things to know before applying:**
- The Object Lock retention is irreversible, as the GCS lock was.
- The Terraform assumes `billing.invoices` and `billing.invoice_snapshots` already exist as Iceberg v2 tables with UTC `timestamp` columns. The GCP Terraform didn't create them either. It takes a new `data_lake_bucket` variable for where they live.
- The Terraform renames `project_id` to `name_prefix`, which only keeps bucket names unique.

**Behaviour differences, old vs. new:**
1. **Region:** `europe-west1` becomes `eu-west-1`.
2. **Parallelism:** Batch has no per-job concurrency setting. The 4-at-a-time limit comes from the 8 vCPU cap, so it only holds if nothing else uses that compute environment.
3. **Redis auth bug fixed:** the old Terraform enabled Redis auth but never passed `REDIS_AUTH`, so the job would have failed to authenticate. The AWS version generates a token and injects it.
4. **Sharding:** Athena has no `FARM_FINGERPRINT`, so the job now fetches all of last month's rows and filters by shard in Python with `pyfarmhash`. That library should give the same assignment, but I couldn't confirm it. Compare a few known `account_id` values against BigQuery before relying on it. Each task also now reads every row instead of its own shard.
5. **Single statement per query:** `DECLARE` and multi-statement scripts don't exist in Athena. The job computes `month_start` in Python (Berlin time) and runs the `MERGE` and `SELECT` as two queries. The date logic is equivalent.
6. **Date filters:** `DATE(ts, "Europe/Berlin")` comparisons became instant comparisons against Berlin midnight, which is equivalent.
7. **`MERGE` insert:** `INSERT ROW` became an explicit column list.
8. **Concurrent `MERGE`:** all 16 tasks run the same `MERGE` on the snapshot table. BigQuery queues concurrent DML. Iceberg uses optimistic commits, so tasks can hit commit conflicts, and the retries would then absorb them.
9. **Row types:** rows come back from Athena as strings and are converted by column type. Types for columns I couldn't see may differ slightly in the JSON posted to the partner.
10. **Attempt number:** Batch attempts start at 1, so I subtract 1 to keep `ATTEMPT` zero-based.
11. **Env var names:** the job reads `AWS_BATCH_JOB_ARRAY_INDEX`, `AWS_BATCH_JOB_ATTEMPT` and `TASK_COUNT` instead of the `CLOUD_RUN_*` ones.
12. **Upload:** `if_generation_match=0` became S3 `IfNoneMatch="*"`. It still fails if the object already exists, but it needs a recent boto3.
13. **Autoclass:** Intelligent-Tiering from day 0 is the closest equivalent, not an identical policy.
14. **Redis node size:** `cache.t4g.small` has about 1.4 GiB, against 1 GB before.
15. **Secrets:** the AWS secrets have no replication setting, and the partner key's value must still be set by hand, as before.
16. **Scheduler retries:** set to 0, matching GCP's default.
17. **Old code kept:** `infra/main.tf` is left untouched.

I kept two existing problems as they were. The job writes the Redis dedupe key before the partner POST, so a retry after a failed POST or crash skips that invoice. It then leaves the invoice out of both the partner push and the CSV.