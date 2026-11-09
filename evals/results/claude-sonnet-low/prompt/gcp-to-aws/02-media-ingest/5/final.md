The pipeline is ported to AWS, but I haven't run `terraform validate` or tested anything, and three behaviours can't be matched exactly. These are the 15-minute transcode limit, the retry backoff and the dispatch rate limit (details below).

**What changed**
- **`aws/main.tf`** (new):
  - S3 bucket with versioning, an SNS topic and two Lambdas.
  - An S3 `ObjectCreated:*` trigger with Lambda retries set to 0.
  - EventBridge Scheduler for the 2-hour hold (the Cloud Tasks replacement), with IAM roles and a Glue `media` database.
  - `infra/` is left untouched.
- **`functions/ingest/main.py`**: now an S3-event Lambda using boto3. It creates a one-time schedule, with the S3 version id standing in for the GCS generation, and publishes to SNS.
- **`functions/transcode/main.py`**: now a Lambda that checks the object's current version id and returns "stale" if it was replaced or deleted.
- **`sql/weekly_report.sql`**: Athena/Trino syntax. It keeps Sunday-start weeks by shifting the date a day, uses ISO weekend days 6 and 7, and casts the average to double so it doesn't truncate.

**Behaviour differences between old and new**
1. **Transcode timeout:** Lambda caps at 900s, and the old function ran up to 1800s. Longer jobs need ECS or Batch.
2. **Retry backoff:** Cloud Tasks backed off from 30s to 600s with 3 doublings. Scheduler has no backoff setting, so I used `MaximumRetryAttempts` 3 (the same 4 attempts in total) and a 24-hour event age limit.
3. **Dispatch rate:** the 5 dispatches/second limit has no equivalent. The 3-concurrent limit is approximated with reserved concurrency of 3, and over-limit invocations are throttled and retried rather than queued.
4. **Transcode input:** it is invoked directly by Scheduler with a JSON payload instead of an HTTP POST with an OIDC token. The old `SA_EMAIL` variable was never set, so the old token was effectively empty.
5. **Task and schedule naming:** the old name used Python's `hash()`, which is randomised per process, so it wasn't deterministic. I use SHA-256 of the name and version instead. A duplicate still raises, as `AlreadyExists` did before.
6. **Generation:** the S3 version id is a string, where the GCS generation was numeric. A delete marker counts as a deleted file, so the result is the same "stale".
7. **Pub/Sub message format:** SNS allows only 10 message attributes and the old message had 12, so the fields now go in a JSON body. Only `event` stays an attribute. The empty body is replaced by that JSON.
8. **Retention:** SNS doesn't keep messages for 7 days the way Pub/Sub's `604800s` did.
9. **Checksums:** `md5` is now the S3 ETag, which only equals the MD5 for non-multipart uploads. `crc32c` is present only if the uploader sent a CRC32C checksum.
10. **Extra S3 call:** ingest now calls `head_object` to get the content type, user metadata and checksums, because S3 events don't carry them. S3 lowercases the metadata keys.
11. **Object names:** the S3 event URL-encodes them, so I decode them with `unquote_plus`.
12. **Function source:** the zips are built locally by the Terraform `archive_file` data sources, not read from a `-fn-src` bucket.
13. **Region and bucket name:** `us-central1` becomes a `region` variable defaulting to `us-east-1`. `project_id` is now only the bucket-name prefix.
14. **Return values:** the transcode "stale"/"ok" tuple is no longer an HTTP response and is ignored by Scheduler.
15. **Analytics:** the BigQuery dataset becomes a Glue database. The `media.uploads` table wasn't defined in the original Terraform and still isn't. The SQL assumes `uploaded_at` is a UTC timestamp.
16. **Timestamp clock:** the 56-day window and the 2-hour hold now use timezone-aware UTC, which gives the same instants as before.