I've added `aws/main.tf` and ported both functions and the SQL in place. I haven't run `terraform validate`, deployed anything, or tested the Python or the Athena SQL. The old `infra/` is untouched.

**What changed**
- **Storage:** S3 bucket with versioning on, ACLs disabled, and public access blocked. Versioning is there so the S3 version ID can stand in for the GCS `generation`.
- **Events:** SNS topic plus an SQS queue that keeps messages for 7 days. SNS doesn't retain messages, so the queue covers the Pub/Sub retention.
- **Hold:** the 2-hour hold now uses EventBridge Scheduler one-time schedules, because SQS can only delay 15 minutes. The Cloud Tasks queue became Lambda settings: reserved concurrency of 3 and 2 async retries.
- **Functions:** `ingest` and `transcode` are Lambdas that share one IAM role, as they shared one service account. S3 `ObjectCreated:*` triggers `ingest` with no retries. The `ingest` Lambda is zipped from `functions/ingest` by Terraform's `archive_file`.
- **`ingest` code:** it reads the object key from the S3 event, does a `head_object` call for content type, checksum and user metadata, and publishes the queued event.
- **`transcode` code:** it checks that the object's current version still matches the job and returns "stale" if not.
- **SQL:** `weekly_report.sql` is now Athena SQL.
  - Weeks still start on Sunday. Trino's `date_trunc('week')` starts on Monday, so I shift by a day.
  - Weekend days are 6 and 7 instead of 1 and 7.
  - `GROUP BY` uses ordinals, and the division casts to double.
- **Glue database:** `media` is a Glue database. The `uploads` table isn't defined in the original Terraform either, so you'll need to create it.

**Differences from GCP**
- **Transcode timeout:** Lambda caps at 900s, and the GCP function ran up to 1800s. If real transcodes exceed 15 minutes, this step should move to Fargate or Batch.
- **Retries:** Lambda caps async retries at 2 (4 attempts total on GCP) and its backoff is fixed, not 30s to 600s. The 5 dispatches/second rate limit isn't reproduced.
- **Event attributes:** SNS allows 10 message attributes and the event has 12 fields, so they go in a JSON body.
- **md5:** `md5` is the S3 ETag, which isn't a true MD5 for multipart uploads.
- **Schedule names:** I replaced `hash()` with sha256, since Python's `hash()` changes between processes and would break the per-generation names.
- **Unset env var:** `SA_EMAIL` was never set in the old Terraform, so I dropped it. The scheduler now uses a dedicated IAM role instead.
- **Timestamp assumption:** the SQL assumes `uploaded_at` is a UTC timestamp.