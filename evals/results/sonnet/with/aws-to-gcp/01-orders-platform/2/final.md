I migrated the repo in Direct mode: the Terraform is in `gcp/main.tf`, and `app/api.py`, `app/worker.py` and `sql/rollup.sql` are ported in place. I haven't run `terraform validate` or `plan`, tested the app code, or run the SQL in BigQuery, and I ran nothing against either cloud. `infra/` is untouched, so AWS stays as the rollback path.

**Mapping**
- **Storage:** S3 becomes a Cloud Storage bucket with versioning, public access prevention and the same lifecycle rules.
- **Queue:** SQS FIFO becomes a Pub/Sub topic and push subscription with a dead-letter topic.
- **Database:** RDS becomes Cloud SQL Postgres 15 (regional, IAM auth, 7-day backups). The password is a random value kept in Secret Manager.
- **Compute:** The `api` Lambda becomes a Cloud Run service, and the worker Lambda becomes a Cloud Run function.
- **Schedule:** EventBridge Scheduler becomes Cloud Scheduler at `0 2 * * *` in `America/New_York`.
- **Analytics:** Athena becomes BigQuery.
- **Identity:** The IAM roles become service accounts, and the `api` account gets only the bucket, topic, Cloud SQL and BigQuery access the old role had.
- **Region:** `us-east1` → `us-east4` (Northern Virginia).

**Behavior changes**

| AWS behavior | GCP now | Status | Why |
|---|---|---|---|
| FIFO dedup (`content_based_deduplication`) | None; the worker must be idempotent | Changed | Exactly-once delivery isn't available on push subscriptions |
| SQS batch of 10 with `ReportBatchItemFailures` | One message per request; a non-2xx response retries it | Changed | Pub/Sub acks per message |
| Visibility timeout 360 s | `ack_deadline` 360 s, retry backoff 360–600 s | Kept | Backoff is my addition to mimic redelivery timing |
| Lambda one request per instance | Concurrency 1 on both Cloud Run services | Kept | The `CACHE` global isn't thread-safe |
| Reserved 20 / provisioned 1 | `max_instance_count` 20 / `min_instance_count` 1 | Kept | They aren't the same limit, but the closest match |
| `AWS_IAM` function URL | Authenticated Cloud Run | Kept | Only the scheduler account is granted `run.invoker`; **your other callers need grants** |
| Presigned S3 PUT | V4 signed URL | Kept | The `api` account is granted token-creator on itself, which keyless signing needs |
| Athena `OutputLocation` in S3 | Dropped | Changed | BigQuery has no equivalent |
| S3 expiry leaves old versions | Delete rule limited to live objects | Kept | Matches S3 on a versioned bucket |
| Athena `timestamp` / string `dt` | Assumes `created_at` is `DATETIME` and `dt` is a `STRING` | **Needs decision** | I couldn't see the schema; `TIMESTAMP_TRUNC` is needed if it's `TIMESTAMP` |
| `array_agg` | `ARRAY_AGG … IGNORE NULLS` | Changed | BigQuery errors on NULL array elements |
| Athena policy had no data access | Added `dataEditor` on the `analytics` dataset | Changed | The query can't run without it |
| RDS had no deletion protection | `deletion_protection = false` | **Needs decision** | I kept parity, but `true` is probably safer |

**Choices and gaps**
- **Added resources with no AWS counterpart:** an Artifact Registry repo, a function source bucket, a DLQ pull subscription, scheduler and Pub/Sub push service accounts, the `analytics` dataset, and the project APIs.
- **Unresolved dependencies:**
  - **API image:** no Dockerfile was in the repo, so the `api` image must be built to serve Flask with gunicorn on `$PORT` and pushed to the new repo.
  - **Worker zip:** `worker.zip` needs a `requirements.txt` with `functions-framework`.
  - **Bucket names:** these are global, so `${env}-uploads` may already be taken.
  - **Existing data:** `analytics.orders` and the Cloud SQL data still need to be moved.
- **Defaults I picked:** the Cloud SQL instance has a public IP with no authorized networks. GCS soft delete (7-day default) is new behavior I left on.