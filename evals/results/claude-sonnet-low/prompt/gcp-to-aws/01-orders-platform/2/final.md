I've ported the Terraform, the app code and the SQL. I haven't run `terraform validate`, the Python, or any Athena query. The old `infra/` directory is untouched, and I didn't commit anything.

**What changed**
- **`aws/main.tf`:**
  - GCS is now S3, with versioning and a public-access block.
  - Pub/Sub is now an SNS FIFO topic feeding an SQS FIFO queue and DLQ.
  - Cloud SQL is now RDS Postgres 15.
  - Cloud Run is now App Runner.
  - Cloud Functions is now Lambda.
  - BigQuery is now Athena and Glue.
  - Cloud Scheduler is now EventBridge Scheduler, using an API destination.
  - The API's IAM role covers S3, SNS, Athena/Glue and RDS IAM auth.
- **`app/api.py`:** it now uses boto3 for the presigned PUT URL, the SNS publish, and the Athena rollup. The rollup runs each statement in the SQL file and polls until it finishes.
- **`app/worker.py`:** it is now an SQS-triggered Lambda handler. On a failure it retries that record and everything after it in the batch, so FIFO order is kept.
- **`sql/rollup.sql`:** it is now Athena/Trino SQL. The table is dropped and recreated, and `QUALIFY` became a subquery.

**Behaviour differences between old and new**
1. **Presigned upload URL expiry:** the URL won't last 7 days. It is capped by the lifetime of the App Runner role's temporary credentials, which is hours, not 7 days.
2. **Rollup is not atomic:** `CREATE OR REPLACE TABLE` became `DROP` then `CREATE`. Readers see no table during the rebuild, and a failed rebuild leaves it missing.
3. **Rollup SQL assumptions:**
   - `_PARTITIONDATE` is replaced by an assumed partition column `dt`.
   - The `analytics.orders` table has to exist in Glue with `items` as an array of rows with `sku` and `qty`. It wasn't in the original Terraform either.
   - `NUMERIC` became `DECIMAL(38,9)`.
   - `APPROX_COUNT_DISTINCT` became `approx_distinct`, so estimates can differ slightly.
   - The `top_items` order of ties may differ.
4. **Rollup output location:** the new table's data goes under the Athena results bucket instead of a managed dataset.
5. **Rollup timing:** the API call now blocks until Athena finishes, and App Runner's request timeout is fixed at 120s. GCP allowed 900s.
6. **Cloud Run settings with no App Runner equivalent:**
   - Memory is 4 GiB, not 1 GiB, because App Runner has no 2 vCPU / 1 GiB option.
   - The request timeout can't be set to 900s.
   - There is no Cloud SQL socket mount. The app would have to reach RDS over the network, and I haven't added a VPC connector or security groups.
7. **Storage lifecycle:**
   - Nearline became STANDARD_IA.
   - Old object versions also expire after 365 days, which GCS didn't do explicitly.
8. **Message ordering and dedup:**
   - `customer_id` becomes the SNS group ID.
   - FIFO adds a 5-minute duplicate-suppression window.
   - Identical bodies sent within 5 minutes are dropped.
   - Message-ordering key was required on publish, and it still is.
9. **Ack deadline:** it went from 60s to 540s, because SQS visibility must be at least the Lambda timeout. A crashed message therefore waits longer before retrying.
10. **Worker batching:** Lambda receives up to 10 messages per invocation, where Cloud Functions got one event each. The DLQ moves a message after 5 receives, as before.
11. **Worker runtime:** the Lambda is deployed from a zip of `worker.py`, and `functions_framework` is gone.
12. **RDS differences:**
    - The instance is db.m5.large, which is 8 GiB against 7.5 GiB.
    - The master user and password are set explicitly.
    - Backups are kept for 7 days.
    - It skips the final snapshot on deletion.
    - Storage is a fixed 20 GB.
    - The password and subnet IDs are new Terraform variables.
13. **Scheduler auth:** the schedule uses a static API-key header, and the API doesn't check it. GCP had no auth set up in the Terraform either. EventBridge may also retry failed calls by default.
14. **Region and network:** the region is us-east-1 instead of us-central1, and `location = "US"` has no equivalent. The images must be pushed to ECR (`app/api`).
15. **API permissions:** the API role grants broad `s3:*` and `glue:*` on all resources, so Athena can write results and the new table. This is wider than the old role, which only had object admin on the uploads bucket.