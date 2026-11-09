I've written the AWS Terraform, ported both Python files and ported the SQL. I haven't run `terraform validate`, deployed anything or run the SQL in Athena. The old `infra/` GCP code is left in place.

## What changed
- **`aws/main.tf`** maps each GCP resource to an AWS one:
  - Cloud Storage becomes S3.
  - Pub/Sub becomes an SNS FIFO topic feeding an SQS FIFO queue, with a FIFO dead-letter queue.
  - Cloud SQL becomes RDS Postgres 15.
  - Cloud Run becomes App Runner.
  - Cloud Functions becomes Lambda.
  - BigQuery becomes Glue plus Athena.
  - Cloud Scheduler becomes EventBridge Scheduler, which puts an event on the default bus. A rule forwards it to an API destination that POSTs to the API.
- **`app/api.py`** now uses boto3 for presigned PUT URLs, SNS publish (the customer id is the message group) and Athena. The rollup waits for each query and raises if one fails.
- **`app/worker.py`** is now an SQS-triggered Lambda handler.
- **`sql/rollup.sql`** is translated to Athena (Trino) SQL.

## Behaviour differences
**Infrastructure**
1. The region is `us-east-2` instead of `us-central1`/`US`, and the bucket is private-by-default with public access blocked.
2. The 30-day lifecycle rule moves objects to `STANDARD_IA` instead of Nearline. On the versioned bucket, the 365-day expiry adds a delete marker rather than removing the data, as with GCS archived versions.
3. The queue's visibility timeout is 540s instead of the 60s ack deadline. Lambda requires it to be at least the function timeout.
4. The dead-letter queue triggers after 5 receives, which is close to 5 delivery attempts but not identical.
5. Ordering is per customer via the FIFO message group. SQS FIFO is limited to 300 messages/s per API action (3,000 with batching) and 3,000/s per queue with high-throughput mode. I set a unique deduplication id on each publish to avoid the 5-minute dedup window.
6. The database is `db.m5.large` (2 vCPU, 8 GiB) instead of `db-custom-2-7680`.
7. The database has 7-day backups, which enables point-in-time recovery, and the master password is managed by AWS (Secrets Manager).
8. The database is reachable only from the API's security group. There is no Cloud SQL socket volume, so the app would connect over TCP through a VPC connector, which forces all API egress through the default VPC.
9. The API gets 4 GiB of memory instead of 1 GiB, because that is the App Runner minimum for 2 vCPU.
10. App Runner caps requests at about 120s, versus 900s on Cloud Run.
11. App Runner concurrency is 80, with 1 to 20 instances, but it is enforced differently from Cloud Run.
12. The image is read from a private ECR repository, `app/api:latest`. That repository is not created by this Terraform, so you must create it and push the image.
13. App Runner services are public by default, whereas the Cloud Run service had no invoker grant. The scheduler's API destination sends only a static header (`x-scheduler`), not a signed identity token, so the endpoint is not really authenticated.
14. Cron timing is the same (02:00 America/New_York), but it goes through an extra EventBridge hop.
15. The API's IAM role gets extra permissions for SNS publish, Athena, Glue and the Athena results bucket. The GCP service account only had object admin, so those calls would have failed there.
16. There is a new Athena results bucket (`<project>-athena`).

**Application**
17. Presigned URLs last up to 7 days, but they stop working when the App Runner role's temporary credentials expire, which is usually within hours. GCS signed URLs lasted the full 7 days.
18. The worker receives SQS events instead of Pub/Sub CloudEvents. Batch size is 1, and a failed invocation is retried by SQS.

**SQL**
19. The rollup is no longer atomic. Athena has no `CREATE OR REPLACE TABLE AS`, so it runs `DROP TABLE` and then `CREATE TABLE ... AS` (Iceberg). The table is briefly missing, and a failure between the two statements leaves it dropped.
20. `_PARTITIONDATE` doesn't exist in Athena. I assumed `analytics.orders` has a `partition_date` column and filtered on that. Please confirm the real column name.
21. `SAFE_CAST` is now `TRY_CAST ... AS DECIMAL(38,9)`. BigQuery's `NUMERIC` has a different precision and scale.
22. `ARRAY_AGG(... LIMIT 3)` is now `slice(array_agg(...), 1, 3)`, with the `sku` and `qty` types assumed to be `varchar` and `bigint`.
23. `APPROX_COUNT_DISTINCT` is now `approx_distinct`, and the estimates won't match exactly.
24. `QUALIFY` is replaced with a wrapping subquery.
25. The `analytics.orders` table and its data are not migrated, and `analytics` is now a Glue database.