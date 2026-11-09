I've finished the edits. Nothing has been run: I haven't run `terraform validate` or the job, and the Athena SQL hasn't been tested. `infra/` is untouched, so you can compare and cut over.

**Terraform (`aws/main.tf`)**
- **Job:** the Cloud Run job becomes an AWS Batch array job on Fargate with 16 children, 2 vCPU and 4 GiB each, a 3 h timeout, and 3 attempts (1 try plus 2 retries). Batch has no parallelism setting, so I capped `max_vcpus` at 8, which allows 4 children at a time.
- **Schedule:** EventBridge Scheduler submits the job at `0 3 1 * *` in Europe/Berlin.
- **Redis:** ElastiCache, HA across 2 nodes, with TLS and an auth token. The GCP config set `auth_enabled` but never gave the job the password. I fixed that by storing a generated token in Secrets Manager and injecting it as `REDIS_AUTH`.
- **Bucket:** S3 with Object Lock in COMPLIANCE mode for 2555 days, versioning, a public-access block, and Intelligent-Tiering as the Autoclass equivalent.
- **Other resources:** the partner API key secret, IAM roles, an ECR repo, and an Athena workgroup with a results bucket.
- **Variables:** you need to supply `name_prefix`, `vpc_id`, `subnet_ids` and `data_bucket_arn`.

**Job (`job/export.py`)**
- **Batch env vars:** it reads `AWS_BATCH_JOB_ARRAY_INDEX`, and `AWS_BATCH_JOB_ATTEMPT` minus 1, since Batch counts attempts from 1.
- **Query and write:** it runs the Athena queries and writes to S3 with `IfNoneMatch="*"`, which replaces GCS `if_generation_match=0`.

**SQL: Athena, not Redshift**
- **Why Athena:** this is a once-a-month batch, so serverless fits and there's no cluster to keep running. Iceberg tables in Athena support both `MERGE` and `FOR TIMESTAMP AS OF`, which the BigQuery time-travel query needs. Redshift has no time travel.
- **Two files:** Athena can't `DECLARE` variables or run multi-statement scripts, so the MERGE moved to `sql/merge_snapshots.sql` and `sql/invoices.sql` is now just the shard SELECT.
- **Sharding hash:** `FARM_FINGERPRINT` doesn't exist in Athena, so I used `xxhash64`. Accounts will land in different shards than before, which is fine as long as a single run is consistent.
- **Concurrent MERGEs:** all 16 children run the MERGE, and concurrent Iceberg commits can conflict. The job retries it up to 5 times, and the MERGE is idempotent.

**Things to check**
- **Object Lock:** the lock is irreversible, like `is_locked = true` on GCS. Apply it deliberately.
- **Data migration:** I didn't migrate the data. `billing.invoices` and `billing.invoice_snapshots` must already exist as Iceberg tables in Glue, and the invoices table's snapshot history must reach back to the start of the month.
- **Existing retry bug, preserved:** a retried child skips invoices that Redis already marked as pushed. If an earlier attempt failed before the upload, those invoices are missing from the shard CSV.
- **Partner API allowlist:** if the partner allowlists source IPs, your NAT egress IPs need adding.
- **Dependencies:** there's no `requirements.txt` in the repo, so the image needs `boto3`, `redis` and `requests`.