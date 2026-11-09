I've written the AWS Terraform in `aws/main.tf`, ported `job/export.py` in place, and split the SQL into two Athena files. None of it has been run, validated, or applied, so treat it as untested.

**Athena, not Redshift.** The query needs `MERGE` and point-in-time reads (`FOR SYSTEM_TIME AS OF`). Athena on Iceberg tables supports both, and it is serverless, which suits a monthly job. Redshift has no time travel, so it couldn't reproduce the "as they were at month end" snapshot. The `invoices` and `invoice_snapshots` tables must be Iceberg tables in a Glue `billing` database. The GCP Terraform never defined the tables, and I didn't either.

**What maps to what**
- **Cloud Run job:** an AWS Batch array job on Fargate. It has 16 children, 3 attempts (2 retries) and a 3-hour timeout.
- **Parallelism of 4:** Batch has no parallelism setting, so I capped the compute environment at 8 vCPU, which is 4 tasks of 2 vCPU each.
- **Scheduler:** EventBridge Scheduler at 03:00 Berlin time on the 1st, submitting the Batch job.
- **Redis:** ElastiCache with a 2-node HA group and TLS. The auth token is generated and stored in Secrets Manager.
- **Other pieces:** Secrets Manager, ECR, IAM roles, and an Athena workgroup with its own results bucket.
- **Autoclass:** an S3 Intelligent-Tiering lifecycle rule.
- **Job code:** it reads the Batch array index and attempt number (converted from 1-based to 0-based), and `TASK_COUNT` is now an env var. The S3 write uses `IfNoneMatch="*"`, matching the old `if_generation_match=0`.
- **SQL:** split into `sql/invoices_merge.sql` and `sql/invoices.sql`, because Athena runs one statement at a time. Shard selection now uses `crc32` in place of `FARM_FINGERPRINT`, so accounts land in different shards than on GCP.

**Things to check before applying**
1. **Irreversible bucket lock.** The exports bucket uses S3 Object Lock in COMPLIANCE mode for 2555 days (7 years), matching your locked GCS retention. Nobody can shorten or remove it, including root, so confirm the bucket name first.
2. **Redis auth was never passed in GCP.** The old Terraform enabled auth but never set `REDIS_AUTH` on the job. Here the token is injected, which is a behavior fix.
3. **Redis port.** The code now connects on 6379 instead of 6378.
4. **Possible merge conflicts.** Sixteen tasks run the Iceberg `MERGE` concurrently, which can fail with commit conflicts where BigQuery serialized them. I added up to 5 retries with backoff. A single pre-step that runs the merge once before the array would be more robust.
5. **Existing dedupe bug, kept as is.** The job sets the Redis key before the partner POST. If the POST fails, the retry skips that invoice and it is never sent.
6. **Networking.** Tasks run in default-VPC public subnets with public IPs, which stands in for `PRIVATE_RANGES_ONLY` egress. Use private subnets with a NAT gateway if you want tighter control.
7. **Region and variables.** The region defaults to `eu-west-1`. You need to set `name_prefix` (replacing `project_id`) and `billing_data_bucket` (where the Iceberg data lives).