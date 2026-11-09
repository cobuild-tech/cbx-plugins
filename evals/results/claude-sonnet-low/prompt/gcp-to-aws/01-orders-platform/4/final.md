I wrote the AWS Terraform in `aws/main.tf` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. None of it has been run, validated or tested. I left `infra/main.tf` (the GCP version) untouched.

**Service mapping**
- **Storage:** the GCS bucket becomes S3, with versioning and the same 30-day and 365-day lifecycle rules.
- **Messaging:** Pub/Sub becomes an SNS FIFO topic feeding an SQS FIFO queue, with a DLQ after 5 receives.
- **Database:** Cloud SQL becomes Multi-AZ RDS Postgres 15 with IAM auth and backups.
- **API:** Cloud Run becomes App Runner with a VPC connector.
- **Worker:** Cloud Functions becomes Lambda (python3.12, `worker.handle`, batch size 1) triggered from SQS.
- **Analytics:** BigQuery becomes Athena over a Glue database.
- **Schedule:** Cloud Scheduler becomes EventBridge Scheduler (`0 2 * * *`, America/New_York), calling the API through an API destination.

**Behaviour differences**
1. **Presigned upload URLs:** the 7-day expiry is requested, but URLs signed with the App Runner role's temporary credentials stop working when those credentials expire, which is much sooner than 7 days.
2. **Request timeout:** App Runner has a fixed request limit of about 120s, so the 900s timeout can't be kept.
3. **Instance size:** App Runner has no 2 vCPU / 1 GB option, so it is set to 2 vCPU / 4 GB.
4. **Ordering and deduplication:** ordering is per `customer_id`, as before. FIFO adds exactly-once delivery on top. I set a random deduplication ID per publish, so identical orders are not dropped.
5. **Worker retries:** retries now come from the SQS visibility timeout (600s), not Pub/Sub's retry policy. The DLQ after 5 receives is the same.
6. **Ack deadline:** the 60s ack deadline no longer exists. The 600s visibility timeout replaces it.
7. **Worker event shape:** the worker now reads `event["Records"][i]["body"]` as plain JSON instead of a base64 CloudEvent.
8. **Rollup atomicity:** Athena has no `CREATE OR REPLACE TABLE`. The rollup now drops the table and then recreates it, so `analytics.daily` briefly doesn't exist, and a failure between the two steps leaves it missing.
9. **Rollup calls:** `/jobs/rollup` polls Athena for completion. The API call can take a while, and it raises if the query fails.
10. **Rollup SQL:**
    - `APPROX_COUNT_DISTINCT` becomes `approx_distinct`, which uses a different algorithm and can give slightly different counts.
    - `NUMERIC` becomes `DECIMAL(38,9)`.
    - `QUALIFY` becomes a subquery.
    - `top_items` is cast to `ROW(sku VARCHAR, qty BIGINT)`, which assumes those types.
    - `_PARTITIONDATE` becomes a `partition_date` column that I assumed exists.
    - `date(created_at)` assumes `created_at` is a timestamp in UTC.
11. **Analytics source table:** the old code assumed `analytics.orders` already existed, and nothing in the repo creates it. I didn't create the Glue table either.
12. **Scheduler auth:** the scheduler call to `/jobs/rollup` goes through a dummy API-key connection, because the App Runner endpoint is public. The original had no auth either.
13. **Cloud SQL connector:** the Cloud SQL socket volume is replaced by a VPC connector and security group.
14. **Database instance type:** the database is `db.m5.large` (2 vCPU, 8 GB), which only approximates `db-custom-2-7680`. It uses 7 days of backup retention, 100 GB of storage and `skip_final_snapshot`.
15. **Terraform variables:** it now needs the new variables `db_password`, `vpc_id`, `subnet_ids` and `worker_package`. The container image must be in ECR at `app/api:latest`.
16. **IAM:** the API role also gets SNS, Athena, Glue and an S3 policy on the Athena results bucket. The old service account only had bucket access.
17. **Lifecycle:** S3 "Standard-IA" replaces Nearline, and I added matching rules for old object versions.
18. **Region and bucket access:** the region is us-east-1 instead of us-central1, and the S3 bucket blocks all public access.