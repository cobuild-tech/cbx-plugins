I've ported the pipeline to AWS in the repo, but none of it has been run, `terraform validate`d or tested. The old `infra/main.tf` and `sql/weekly_report.sql` are left in place.

**What changed**
- **`aws/main.tf`** has the AWS equivalents of the GCP resources:
  - GCS becomes S3 with versioning on. The S3 version ID replaces the GCS generation, which is how a replaced file gets detected.
  - The Cloud Tasks queue becomes an SQS queue with a dead-letter queue, plus an EventBridge Scheduler one-time schedule for the 2-hour hold.
  - Pub/Sub becomes SNS, the two Cloud Functions become Lambdas, and the service account becomes IAM roles.
  - The BigQuery dataset becomes a Glue database.
  - The queue keeps the original limits of 4 attempts and 3 concurrent runs, and the ingest Lambda has retries off to match `DO_NOT_RETRY`.
- **`functions/ingest/main.py`** is ported to boto3 and ingests on S3 events:
  - It decodes the S3 key.
  - It creates a schedule named from a hash of the key and version, so a re-upload gets a new schedule and the old one goes stale.
  - It reads content type, metadata and checksums with `head_object`, because S3 events don't carry them.
  - It publishes the event to SNS.
- **`functions/transcode/main.py`** is now triggered by SQS instead of HTTP. It skips the job if the object was deleted or its version no longer matches.
- **`sql/weekly_report.athena.sql`** fixes the two Athena differences:
  - Weeks now start on Sunday. Trino's `date_trunc('week')` starts on Monday, so I shift the date by a day.
  - Weekend is `day_of_week IN (6, 7)`, since Trino numbers days Monday=1 to Sunday=7.

**Behaviour that differs**
- **Transcode timeout:** Lambda caps at 900s, and the GCP function ran for 1800s. If ffmpeg jobs can take longer than that, the transcode step needs ECS or Batch instead.
- **Retry backoff:** SQS retries after a fixed visibility timeout (5400s). It can't do the 30s to 600s doubling backoff.
- **Event retention:** SNS doesn't keep messages, so the 7-day retention is gone. Add a subscriber queue if you need replay.
- **SNS attributes:** SNS allows 10 attributes and the original had 12. The full payload now goes in the JSON message body, and only `event`, `bucket`, `uploader`, `show`, `season` and `episode` stay as attributes.
- **MD5 field:** `md5` is filled from the S3 ETag, and left empty for multipart uploads.
- **Missing table:** `media.uploads` isn't defined in the original Terraform, so there's no Athena table for it. The Glue database exists, but you'll need to create the table.
- **Variables and region:** `project_id` is replaced by `name_prefix`, the region is set to us-east-1, and the function-zip bucket is a variable. Adjust these for your account.