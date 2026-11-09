I wrote the AWS Terraform in `aws/main.tf` and ported `app/api.py`, `app/worker.py` and `sql/rollup.sql` in place. I haven't run `terraform validate` or tested anything. The old `infra/main.tf` is untouched.

**Service mapping**
- **Storage:** GCS becomes S3, with versioning and the same lifecycle rules.
- **Messaging:** Pub/Sub becomes an SNS FIFO topic feeding an SQS FIFO queue. A second FIFO queue is the dead-letter queue, with 5 max receives.
- **Worker:** Cloud Functions becomes a Lambda triggered by the queue, with the same 540s timeout and 512 MB memory.
- **Database:** Cloud SQL becomes RDS Postgres 15, Multi-AZ, with IAM auth and backups.
- **API:** Cloud Run becomes ECS Fargate (2 vCPU, 1 GB) behind an HTTPS load balancer, scaling from 1 to 20 tasks. It adds an ECR repo, security groups and IAM roles.
- **Analytics:** BigQuery becomes a Glue database plus an Athena workgroup, with an S3 bucket for results and output.
- **Scheduler:** Cloud Scheduler becomes EventBridge Scheduler (02:00 America/New_York), which triggers an EventBridge rule, which calls an API destination that POSTs to `/jobs/rollup`.

**Inputs you need to supply**
- Two new Terraform variables: `domain_name` and `certificate_arn`. EventBridge only calls HTTPS endpoints, so the load balancer needs a certificate and a DNS name.
- The container image has to be pushed to the new ECR repo.
- `sql/rollup.sql` assumes `analytics.orders` already exists in Glue with a Hive partition column named `dt`. Nothing in the repo defined the BigQuery table, so I guessed that name.

**Behaviour differences between old and new**
1. **Signed upload URL expiry:** the 7-day signed upload URL will stop working when the task role's temporary credentials expire, usually within hours. GCS signed URLs lasted the full 7 days.
2. **Storage class:** the 30-day transition goes to S3 Standard-IA instead of Nearline.
3. **Ordering and duplicates:** FIFO queues drop identical message bodies sent within 5 minutes. Pub/Sub did not.
4. **Ordering key:** `customer_id` is now converted to a string for the message group ID.
5. **Message format:** the worker reads the plain SQS body. Pub/Sub's base64 envelope is gone, and the Lambda signature is now `handle(event, context)`.
6. **Retries:** the queue's visibility timeout is 540s, not the old 60s ack deadline, because SQS requires it to be at least the Lambda timeout. Redelivery after a failure is slower. I set batch size to 1 to match one message per invocation.
7. **API concurrency:** autoscaling targets 80 requests per task through the load balancer. Cloud Run's per-instance concurrency limit of 80 has no direct equivalent.
8. **API timeout:** the load balancer idle timeout is 900s, which approximates Cloud Run's request timeout.
9. **Cold starts:** the API is always at least 1 task, as before, but it now runs on Fargate with a public IP.
10. **Database connection:** there is no Cloud SQL socket volume. The database is private, and only the API's security group can reach it.
11. **Database instance size:** `db.m6g.large` (2 vCPU, 8 GiB) is the nearest match to `db-custom-2-7680`, with 100 GB storage and 7-day backup retention that I chose.
12. **Service permissions:** the GCP service account only had bucket access, so its Pub/Sub and BigQuery calls would have failed. The AWS role also has publish access to the topic and Athena/Glue/S3 access for the rollup, so the app can actually work.
13. **Rollup SQL dialect:**
    - It is now Trino, not BigQuery.
    - `CREATE OR REPLACE` is replaced by a drop followed by a create, so the table briefly doesn't exist and the swap isn't atomic.
    - Each run writes to a fresh S3 prefix, and old output is never deleted.
    - `QUALIFY` is replaced by a subquery.
    - `ARRAY_AGG ... LIMIT 3` is replaced by `slice(..., 1, 3)`.
    - The approximate distinct count uses a different algorithm, so values can differ slightly.
    - Ties in the top-100 ranking are broken arbitrarily, as before.
    - `NUMERIC` becomes `DECIMAL(38,9)`.
    - The `_PARTITIONDATE` filter becomes `dt`.
14. **Rollup request handling:** the API now polls Athena until the query finishes, then returns. EventBridge API destinations time out after 5 seconds, so the scheduled call may be reported as failed even though the rollup keeps running. Cloud Scheduler waited up to 180 seconds.
15. **Scheduler retries and auth:** Cloud Scheduler's retry behaviour is not replicated. The API destination uses a dummy API-key header, and the endpoint stays unauthenticated as before.
16. **Region:** it is now us-east-1 instead of us-central1, and the S3 bucket is regional rather than multi-region "US".
17. **Public access:** I added S3 public-access blocking and enforced bucket-owner ownership. That is stricter than the old config but matches uniform bucket-level access.