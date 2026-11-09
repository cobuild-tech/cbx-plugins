I ported the pipeline to AWS but haven't run `terraform validate`, deployed it, or tested any of it. The Terraform is in `aws/main.tf` and `infra/` is untouched. Both functions are ported in place. The Athena SQL is in `sql/weekly_report.athena.sql`, and the BigQuery original is untouched.

**How the pieces map**
- **Storage and trigger:** The GCS bucket becomes an S3 bucket with versioning on. The S3 object-created notification fires the ingest Lambda, with async retries set to 0 to match `DO_NOT_RETRY`.
- **Delayed dispatch:** Cloud Tasks becomes a one-time EventBridge Scheduler schedule that fires 2 hours out and invokes the transcode Lambda. Transcode concurrency is capped at 3.
- **Events and analytics:** Pub/Sub becomes an SNS topic, and the BigQuery dataset becomes a Glue database. Only the dataset is ported, because `media.uploads` was never defined in the old Terraform.
- **Naming:** The `project_id` variable is now `prefix`, and the region defaults to `us-east-2`. The Lambdas load their zips from `<prefix>-fn-src`, which must already exist.
- **Generation:** The S3 version ID takes the place of the GCS generation.

**Behaviour differences between old and new**
1. **Transcode timeout:** 1800s becomes 900s, the Lambda maximum. Longer jobs would need ECS/Batch or Step Functions.
2. **Task names:** The old name came from Python's `hash()`, which varies between processes. The new name is a SHA-256 of the object name and version ID, so it is stable across invocations.
3. **Rate limit:** `max_dispatches_per_second = 5` has no equivalent and is dropped. The concurrency cap of 3 is kept.
4. **Retries:** Cloud Tasks made 4 attempts with a 30s to 600s backoff. The Scheduler retry policy makes 3 retries (4 attempts) but has no backoff settings. The transcode Lambda's own async retries may also apply.
5. **Transcode invocation:** The old code was an HTTP endpoint called with an OIDC token. The new one is invoked directly by Scheduler, and its return value is ignored, so "stale" and "ok" only show up in the response body.
6. **Pub/Sub retention:** The 7-day `message_retention_duration` has no SNS equivalent and is dropped.
7. **Event message:** The empty message body becomes `"queued"`, because SNS rejects empty messages.
8. **Empty attributes:** Attributes with empty values are omitted, because SNS rejects them. Pub/Sub sent them as empty strings.
9. **`md5`:** It is now the S3 ETag in hex, where GCS gave a base64 MD5. It is not a true MD5 for multipart or KMS-encrypted uploads.
10. **`crc32c`:** It is empty unless the uploader set a CRC32C checksum. When present it is base64, as before.
11. **Metadata and size:** These now come from an extra `head_object` call, because S3 events don't carry them. User metadata keys are lowercased by S3.
12. **Duplicate uploads:** Ingest now raises if the same name and version ID is processed twice, since the schedule name already exists. Ingest also now loops over `Records` and URL-decodes keys.
13. **Concurrency reservation:** `reserved_concurrent_executions = 3` can fail to apply in new accounts with low Lambda concurrency quotas.
14. **SQL week start:** Trino weeks start on Monday, so I shifted the dates by one day to keep Sunday-based weeks. The weekend days are `day_of_week IN (6, 7)` instead of `DAYOFWEEK IN (1, 7)`.
15. **SQL division:** `SAFE_DIVIDE` becomes a cast to double and a division. Since `COUNT(*)` is never 0 in a group, results match.
16. **SQL assumption:** The query assumes `uploaded_at` is a UTC `timestamp` column.