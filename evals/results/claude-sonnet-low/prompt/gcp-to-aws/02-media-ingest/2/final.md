I've ported the Terraform, both functions and the SQL, but none of it has been run, planned or tested. The old `infra/` directory is untouched.

- **`aws/main.tf`**:
  - The incoming bucket becomes S3 (versioned, public access blocked).
  - The service account becomes IAM roles (one for the Lambdas, one for the scheduler).
  - The Pub/Sub topic becomes SNS plus a 7-day SQS queue.
  - The two Cloud Functions become Lambdas.
  - The Cloud Tasks queue becomes EventBridge Scheduler one-time schedules.
  - The BigQuery dataset becomes a Glue database.
- **`functions/ingest/main.py`**: it now handles S3 events. It creates a one-time schedule 2 hours out and publishes the "queued" event to SNS.
- **`functions/transcode/main.py`**: it is invoked by the scheduler and does the same stale check, using the S3 version id.
- **`sql/weekly_report.sql`**: it is rewritten for Athena. Weeks still start on Sunday, and the weekend check is Saturday and Sunday.

## Behaviour differences between old and new

1. **Transcode timeout:** it is 900s, not 1800s, because that is Lambda's hard limit. If renditions can take longer than 15 minutes, this needs Fargate or Batch.
2. **Generation id:** it is now the S3 version id, so versioning is enabled on the bucket. Old versions are kept, and I added no lifecycle rule.
3. **Task name:** the schedule name is a deterministic SHA-256 of key and version. The old `abs(hash(...))` changed on every Python process start, so it never deduplicated.
4. **Retries:** Cloud Tasks backoff (30s to 600s, 4 attempts) has no equivalent. The schedule retries a failed invoke 3 times, and Lambda async adds 2 retries of its own on function errors.
5. **Concurrency:** the 5 dispatches per second and 3 concurrent limits are not enforced. I did not set reserved concurrency, because that would reserve account concurrency and the account limit may not allow it.
6. **Authentication:** the OIDC token to the transcoder is replaced by IAM. The old `SA_EMAIL` variable, which was never set, is gone.
7. **Transcode call:** it is now a direct Lambda invoke, not an HTTP POST. The `("stale", 200)` and `("ok", 200)` return values are ignored by the async invoke. The ingest function no longer needs a `TRANSCODE_URL` and uses an ARN.
8. **Metadata source:** content type, md5, crc32c and user metadata now come from an extra `head_object` call, because S3 events don't carry them.
   - md5 is derived from the ETag and is empty for multipart or KMS uploads.
   - crc32c is empty unless the upload sent a CRC32C checksum.
   - Metadata keys are lowercased by S3.
9. **Event format:** the 12 Pub/Sub attributes and the empty body are now a JSON body on SNS, because SNS allows at most 10 attributes and no empty values.
10. **Retention:** the 7-day retention comes from an added SQS queue subscribed to the topic, because SNS keeps nothing.
11. **Event handling:** the S3 key is URL-decoded and every record in the event is processed.
12. **Hold time:** it uses a timezone-aware UTC time instead of the deprecated `utcnow()`. The schedule is only accurate to the second.
13. **Region:** `us-east-2` replaces `us-central1`, set by the `region` variable.
14. **Deleted objects:** a deleted file now counts as stale through the missing-object or 404 path, the same outcome as before.
15. **SQL:**
    - It assumes `uploaded_at` is a UTC timestamp and `transcode_seconds` is numeric.
    - The average is cast to double to avoid integer division.
    - `SAFE_DIVIDE` is a plain divide, which is safe because the count is never 0.
    - `GROUP BY` uses ordinals because Trino doesn't accept aliases there.
16. **Missing table:** `media.uploads` was never defined in the old Terraform, so I haven't defined it in the Glue database either.