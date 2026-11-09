The migration is written, but I haven't run any of it. I didn't run `terraform validate`, execute the job, or run the SQL in Athena. The old `infra/` directory is still in place.

## What changed
- **`aws/main.tf`** is new. Each GCP resource maps to an AWS one:

  | GCP | AWS |
  |---|---|
  | Cloud Run job (16 tasks, 4 at a time, 2 retries, 3h timeout) | Batch array job on Fargate (2 vCPU, 4 GiB, 3 attempts, 3h timeout) |
  | Parallelism of 4 | Compute environment capped at 8 vCPU |
  | Cloud Scheduler (`0 3 1 * *`, Europe/Berlin) | EventBridge Scheduler with the same time zone |
  | Secret Manager | Secrets Manager |
  | Memorystore Redis (HA, auth, TLS) | ElastiCache replication group (2 nodes, multi-AZ, auth, TLS, port 6378) |
  | GCS bucket (locked 7-year retention, public access prevention, Autoclass) | S3 bucket (Object Lock in COMPLIANCE mode for 2555 days, public access block, Intelligent-Tiering) |
  | Service account | Job role plus an execution role |

- **`job/export.py`** now uses the Batch environment variables, boto3 for Athena and S3, and the same Redis dedupe and partner POST logic.
- **`sql/invoices.sql`** is ported to Athena. The job splits the file into a MERGE statement and a SELECT statement.

## Athena or Redshift
I chose **Athena with Iceberg tables**. The query depends on `MERGE` and on reading a table as of a past timestamp (`FOR SYSTEM_TIME AS OF`). Iceberg on Athena supports both. Redshift has no time travel, so it would have needed a redesign. Athena is also serverless, which suits a monthly job.

## Assumptions to check
- The Glue `billing` database and its two Iceberg tables must already exist. Like the BigQuery dataset, they weren't in the original Terraform.
- The `billing-lake` bucket name in the job's IAM policy is a placeholder.
- The ECR repository `jobs/billing-export` must already exist.
- Timestamps are assumed to be stored as UTC in the Iceberg tables.
- I'm unsure Athena accepts an expression after `FOR TIMESTAMP AS OF`. Test this first.

## Behaviour differences
1. **Shard assignment changes.** `FARM_FINGERPRINT` doesn't exist in Athena, so I used `xxhash64`. Accounts land in different shards and CSVs than before, and there is no way to keep the old assignment.
2. **Region.** The default is `eu-west-1` instead of `europe-west1` (Belgium), so the data lives in a different region. You can change it with the `region` variable.
3. **Redis auth is now actually wired up.** The GCP job read `REDIS_AUTH`, but Terraform never set it, even though `auth_enabled = true`. I added a generated token stored in Secrets Manager and injected it.
4. **IAM is explicit.** The GCP Terraform only granted secret access. The BigQuery and GCS permissions lived elsewhere, and the AWS version grants S3, Athena and Glue access itself.
5. **MERGE is serialised with a Redis lock.** BigQuery serialised the DML across the 16 tasks. Iceberg commits are optimistic, so unserialised concurrent MERGEs could conflict or insert duplicates. All tasks still run the MERGE, but one at a time.
6. **Multi-statement script.** BigQuery ran one script with a `DECLARE`. Athena runs two queries and recomputes `month_start` inline each time. If a run crosses midnight at the end of a month, the two queries could use different months. At 03:00 on the 1st that is very unlikely.
7. **Time-travel limits differ.** BigQuery allows 7 days of history. Here it depends on how long Iceberg snapshots are kept.
8. **Row types are re-derived.** Athena returns every value as a string, so I convert them using the result's column types. The JSON sent to the partner should be identical, but check that the field order and null handling match.
9. **Task numbering.** Batch attempts start at 1, so I subtract 1. Redis values and shard indexes match the old ones. The array size now comes from a `TASK_COUNT` variable set in Terraform.
10. **Compute environment.** The 4-at-a-time cap only holds if the Batch compute environment is used for this job alone.
11. **Networking.** The VPC connector (`PRIVATE_RANGES_ONLY`) becomes Fargate with a public IP. Redis traffic stays private and other traffic goes straight out. You supply `vpc_id` and `subnet_ids`.
12. **Redis sizing.** `cache.t4g.small` is about 1.4 GiB against 1 GB before.
13. **Autoclass versus Intelligent-Tiering.** They are similar but not identical in how objects move between tiers and what it costs. S3 versioning is also on, because Object Lock requires it.
14. **Bucket names.** S3 names are global, so `name_prefix` replaces `project_id` in them.
15. **S3 write precondition.** `IfNoneMatch="*"` replaces `if_generation_match=0`. It fails the same way if the file already exists, but with an S3 error type.
16. **Logging.** I added a CloudWatch log group, which Cloud Run provided implicitly.
17. **Existing flaws kept as-is.** If the partner POST fails after the Redis key is set, a retry skips that invoice. It is never pushed or written to the CSV. A retry after a successful upload also fails the write precondition, as before.