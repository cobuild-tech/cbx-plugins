I've ported the Terraform, both functions and the SQL, but none of it has been run, planned or tested. `infra/` and the original BigQuery `sql/weekly_report.sql` are still in the repo.

**What changed**
- **`aws/main.tf`:**
  - S3 (versioned) replaces the GCS bucket, and Lambda replaces the Cloud Functions.
  - SNS replaces Pub/Sub.
  - EventBridge Scheduler plus SQS replaces Cloud Tasks. The scheduler holds each job for 2h, then drops it on the SQS queue, which triggers the transcode Lambda with max concurrency 3.
  - A Glue database `media` replaces the BigQuery dataset. As in the original, the `uploads` table isn't defined in Terraform.
  - S3 notifications call ingest on every create or overwrite, with Lambda retries set to 0.
- **`functions/ingest` and `functions/transcode`:** rewritten in place with boto3. The S3 version id stands in for the GCS generation.
- **`sql/weekly_report.athena.sql`:**
  - The week now starts on Sunday, using a Monday-based `date_trunc` shifted by one day.
  - The weekend days are now `day_of_week` 6 and 7.
  - The average divides as a double, so integer division can't truncate it.
  - It uses `COUNT_IF`, and `GROUP BY 1, 2` replaces the alias.

**Behaviour differences (old → new)**
1. **Transcode timeout:** the transcode function's timeout drops from 1800s to 900s, the Lambda maximum. Dispatch deadline 1800s no longer applies. Long jobs will need a different compute target, such as Fargate.
2. **Retry timing:** retries are no longer 30s–600s exponential backoff. SQS redelivers about every 900s (the visibility timeout), up to 4 receives.
3. **Failed jobs:** after those retries a job goes to a new dead-letter queue (`transcode-dlq`), which is an extra resource. Cloud Tasks just dropped it.
4. **Dispatch rate:** the 5 dispatches per second limit is gone. Only the concurrency cap of 3 remains.
5. **Event retention:** the 7-day retention on the events topic is gone, because SNS doesn't retain messages. Add an SQS subscriber if you need it.
6. **Event format:** the event fields now go in a JSON message body instead of 12 message attributes. SNS allows only 10 attributes and no empty values, and the body was previously empty. Subscribers must change.
7. **Event contents from S3:**
   - `content_type`, `uploader`, `show`, `season` and `episode` now come from a `head_object` call. S3 user metadata keys are lowercased.
   - `md5` is the ETag, and it's empty for multipart uploads. It's also hex, where GCS gave base64.
   - `crc32c` is only filled if the uploader sent an S3 checksum.
8. **Replaced-file detection:** this depends on bucket versioning instead of GCS generations. The `generation` field now holds an S3 version id, which is a string rather than a number.
9. **Auth:** there is no OIDC token to the transcoder. Scheduler and SQS use IAM roles. The old `SA_EMAIL` env var was never set in Terraform, so it was always empty.
10. **Env vars:** `TRANSCODE_URL` is removed. `TASKS_QUEUE` is now a queue ARN, and `SCHEDULER_ROLE_ARN` is new.
11. **Records per invocation:** ingest now loops over all records in an S3 event, where the original handled one event.
12. **Task names:** the old code used Python's `hash()` for task names, and that value is randomized per process. I kept it for the schedule names, so de-duplication still isn't reliable. A duplicate name raises `ConflictException` instead of Cloud Tasks' already-exists error.
13. **Transcode trigger and return:** transcode is no longer an HTTP endpoint. It's triggered by SQS, and the `"stale"`/`"ok"` return values aren't surfaced to any caller.
14. **Region and naming:** region is `us-east-2` (variable `region`) instead of `us-central1`, and `project_id` is now only a name prefix.
15. **Timestamp comparison in SQL:** `uploaded_at` is compared as UTC, assuming it's stored as a naive UTC timestamp. The 56-day window is otherwise unchanged. Week and day calculations match the BigQuery results.