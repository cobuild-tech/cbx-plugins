The GCP version is written in `gcp/main.tf`, and `app/api.py`, `app/worker.py` and `sql/rollup.sql` are ported in place. I haven't run `terraform validate`, `plan` or `apply`, and none of the app code or SQL has been run. The AWS code in `infra/` is untouched, so AWS stays as the fallback until you've validated GCP.

I added `app/main.py` as a one-line import of `handle` from `worker.py`, because Cloud Run functions load `main.py`.

**Resource mapping**
- **S3 → Cloud Storage:** same versioning, public access blocked, and lifecycle (Nearline at 30 days, delete at 365). The lifecycle rules apply to current versions only, which matches S3.
- **SQS FIFO → Pub/Sub:** an ordered subscription keyed on `customer_id`, with a dead-letter topic after 5 attempts and a 360 s ack deadline.
- **RDS → Cloud SQL:** Postgres 15, high availability, 50 GB, 7-day backups, IAM authentication on.
- **API Lambda → Cloud Run:** 1 CPU, 1 GiB, 300 s timeout, max 20 instances, min 1 instance, one request per instance.
- **Worker Lambda → Cloud Run function:** triggered by a Pub/Sub push subscription instead of an event source mapping.
- **Scheduler → Cloud Scheduler:** `0 2 * * *` in America/New_York.
- **Athena → BigQuery:** the query job is submitted without waiting, as before.
- **IAM:** one service account per workload, with no key files.

**Behavior changes**

| AWS | GCP | Status | Why |
|---|---|---|---|
| Region `us-east-1` | `us-east4` | Changed | The Virginia equivalent. |
| SQS content-based deduplication | None | Needs decision | Exactly-once delivery is pull-only and the worker is push. The worker has to handle duplicates itself. |
| Lambda batches of 10, partial-failure reporting | One message per request; a non-2xx response retries that message | Changed | This is how Pub/Sub delivers. |
| `maxReceiveCount` 5 | `max_delivery_attempts` 5 | Changed | AWS moved a message to the dead-letter queue on the 6th receive, GCP does it after the 5th failure. |
| Function URL with IAM auth | Cloud Run with no public access | Kept | Only the scheduler account and any principals in `api_invokers` can call it. |
| Presigned URL | V4 signed URL via IAM `signBlob` | Kept | The API's service account signs for itself. |
| `s3:Get/Put` | `objectViewer` + `objectCreator` | Changed | `objectViewer` also allows listing objects. |
| RDS managed master password (auto-rotated) | Random password in Secret Manager | Changed | No automatic rotation. |
| `rds-db:connect` on `*` | IAM database user for the API account only | Changed | Added the `api-sa` user and the Cloud SQL roles. |
| Graviton `db.m6g.large` | `db-custom-2-8192` | Changed | Same 2 vCPU and 8 GB, but x86. |
| Queue names `orders.fifo` and `orders-dlq.fifo` | `orders` and `orders-dlq` | Changed | The `.fifo` suffix is AWS-specific. |
| Env var `QUEUE_URL` | `TOPIC_PATH`, plus `PUBSUB_REGION` | Changed | The new Pub/Sub client needs both. |
| Athena S3 output location | None | Changed | BigQuery writes the result straight to `analytics.daily`. |
| `deletion_protection` off | Off | Kept | AWS default; set it to true if you want it. |

**SQL**
- **Differences in the query:**
  - `ARRAY_AGG` uses `IGNORE NULLS`, because BigQuery errors on a null `sku`.
  - `approx_distinct` becomes `APPROX_COUNT_DISTINCT`, so counts may differ slightly.
  - `DATETIME_TRUNC` assumes `created_at` is a `DATETIME`.
  - The `dt` filter stays a string comparison.
- **Carried over from AWS:** `CREATE TABLE` fails on the second run because the table already exists, same as before. I left that alone.

**Added with no AWS counterpart**
- The Cloud APIs.
- The `analytics` dataset.
- A bucket for the worker zip.
- Service accounts for the Pub/Sub push, the scheduler and the API's IAM database user.
- The `api_invokers` variable.

**Before you can deploy**
- **API image:** `app/` has no Dockerfile or `requirements.txt`, so I couldn't check how the image serves HTTP. The image must listen on `$PORT` (for example gunicorn) and include `google-cloud-storage`, `google-cloud-pubsub` and `google-cloud-bigquery`.
- **Worker zip:** `worker.zip` needs `main.py`, `worker.py` and a `requirements.txt` with `functions-framework`.
- **Artifact Registry image:** the repo and image must exist first, and you set the path through `api_image`.
- **Bucket names:** they are global, so `${env}-uploads` may already be taken.
- **Data:** `analytics.orders` and the existing S3, RDS and Athena data still have to be moved. I haven't touched any data.