I've written the AWS Terraform in `aws/main.tf`, ported both functions in place, and rewritten the SQL for Athena. I haven't run `terraform validate` or tested any of it.

**Mapping**
- **Storage:** GCS becomes an S3 bucket with versioning on. The S3 version ID replaces the GCS generation, so the transcoder can still tell when a file has been replaced.
- **Trigger:** the S3 `ObjectCreated:*` event runs the ingest Lambda on new objects and overwrites, with Lambda retries set to 0 to match `DO_NOT_RETRY`.
- **2-hour hold:** Cloud Tasks becomes one-time EventBridge Scheduler schedules, since SQS delay tops out at 15 minutes. The transcode Lambda has reserved concurrency of 3.
- **Events topic:** Pub/Sub becomes an SNS topic plus an SQS queue with 7-day retention, because SNS doesn't retain messages.
- **Analytics:** the BigQuery dataset becomes a Glue database. I didn't define `media.uploads` because the repo has no schema for it.
- **IAM:** the service account becomes IAM roles, one for the Lambdas and one for the scheduler.

**Bugs I fixed while porting**
- The old task name used Python's `hash()`, which is salted per process, so retries didn't dedupe. The schedule name is now a SHA-256 of bucket, key and version.
- S3 event keys are URL-encoded, so names like `Episode 01 – Pilot.mov` would have broken. The ingest function now decodes them.
- S3 events don't carry content type, checksums or user metadata, so ingest now calls `head_object` to get them.

**Behaviour that doesn't match exactly**
- **Transcode timeout:** Lambda's maximum is 900s and GCP allowed 1800s. If real ffmpeg jobs run longer than 15 minutes, this should move to ECS/Fargate. This is the biggest risk.
- **Retries:** Lambda async retries cap at 2, against Cloud Tasks' 4 attempts. Scheduler can't set custom backoff, and the 5-dispatches-per-second rate limit has no equivalent.
- **Event attributes:** SNS allows only 10 message attributes and Pub/Sub had 12. The event fields now travel as a JSON body.
- **Checksums:** `md5` is the S3 ETag, which only equals the MD5 for single-part, non-KMS uploads. `crc32c` is only populated if uploads include that checksum.
- **Bucket naming:** the `project_id` variable is now `name_prefix`, because S3 bucket names are global. The region is `us-east-1`.
- **Function source:** it's zipped from the repo with `archive_file` instead of read from a `-fn-src` bucket.
- **SQL:**
  - Trino weeks start on Monday, so I shifted the date by a day on each side.
  - Day-of-week numbering differs, so weekends are 6 and 7 instead of 1 and 7.
  - Averages are cast to double to avoid integer division.
  - The SQL assumes `uploaded_at` is a UTC timestamp.

I left `infra/` in place so you can compare the two. Delete it when you're ready to cut over.