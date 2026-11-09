I wrote the AWS Terraform in `aws/main.tf` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I did not run `terraform validate` or `terraform plan`, and nothing has been applied or tested. `infra/` is untouched, so GCP stays as the rollback.

**Resource mapping**
- **Storage:** the GCS bucket becomes S3 with versioning and public access blocked. Nearline after 30 days becomes Standard-IA, and delete at 365 days is kept.
- **Messaging:** Pub/Sub becomes an SNS FIFO topic feeding an SQS FIFO queue, with a FIFO dead-letter queue after 5 receives. The `customer_id` is the message group, which keeps per-customer ordering.
- **Worker:** the Cloud Function becomes a Python 3.12 Lambda reading from SQS, one message per invocation.
- **Database:** Cloud SQL becomes RDS Postgres 15 on `db.m6g.large`, Multi-AZ, with IAM auth and automated backups. The master password is managed by AWS.
- **API:** Cloud Run becomes ECS Fargate behind an ALB, scaling from 1 to 20 tasks, plus an ECR repo. The ALB idle timeout is 900s to match Cloud Run's request timeout.
- **Analytics:** the BigQuery dataset becomes a Glue database and an Athena workgroup, with a results bucket.
- **Nightly job:** Cloud Scheduler becomes EventBridge Scheduler at 02:00 America/New_York, calling the API through an EventBridge API destination.
- **SQL:** `rollup.sql` is now Athena SQL. The `QUALIFY` is rewritten as a subquery, `ARRAY_AGG ... LIMIT` as `SLICE`, and `SAFE_CAST` as `TRY_CAST`. `CREATE OR REPLACE` is now `DROP` plus `CREATE`, so it is no longer atomic. The API runs the statements one at a time.
- **App code:** `api.py` now uses boto3 for S3 presigned URLs, SNS publish and Athena. The Athena calls start a query and poll until it finishes. `worker.py` reads the SQS record body.

**Differences and things to check**
1. **Signed URLs:** the S3 presigned URLs are requested for 7 days, but with task-role credentials they will expire within hours. Keeping 7 days needs long-lived IAM-user keys, which I did not create.
2. **SQS visibility timeout:** it is 540s, not the 60s ack deadline, because it has to be at least the Lambda timeout. A failed message is retried later than it was on GCP.
3. **Task memory:** Fargate needs at least 4 GB for 2 vCPU, so memory is 4 GB instead of 1 GiB.
4. **IAM permissions mirror GCP exactly.** The API role only has S3 access, as `api-sa` only had `objectAdmin`. As written it cannot publish to SNS or run Athena, and GCP likely had the same gap. I did not fix it, so tell me if you want those permissions added.
5. **API exposure:** the ALB is internet-facing and unauthenticated over HTTP, with the CIDR set by `api_ingress_cidrs` (default open). Cloud Run had no public invoker binding. The API destination needs a placeholder key, `rollup_api_key`, which the app does not check.
6. **SQL assumptions to verify against `analytics.orders`:**
   - The partition column is named `partition_date`, replacing `_PARTITIONDATE`.
   - `items` has only `sku` and `qty` fields, which are now unnamed in `top_items`.
   - `APPROX_DISTINCT` is not numerically identical to BigQuery's `APPROX_COUNT_DISTINCT`.
7. **Not migrated:** there is no data migration or table definition, and no `requirements.txt` or Dockerfile existed, so `boto3` needs adding to the image. The API gets `DB_HOST` but doesn't use it, and the Cloud SQL socket volume has no AWS equivalent.
8. **Placeholder choices:** region `us-east-2`, default VPC with public task IPs, and RDS storage of 20 GB autoscaling to 500 GB.

I skipped the `.migration/` plan and parity-review steps from the skill, since you asked for a direct port.