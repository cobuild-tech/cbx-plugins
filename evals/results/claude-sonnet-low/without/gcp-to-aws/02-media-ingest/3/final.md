I ported the pipeline to AWS, but I haven't run `terraform validate` or tested any of it. Not everything maps one-to-one, and the differences are listed below.

**What I changed**
- **`aws/main.tf`** (new) replaces `infra/main.tf`, which I left in place.
  - It has the versioned S3 bucket, a Lambda IAM role, an SNS topic, and the two Lambdas.
  - The S3 `ObjectCreated` trigger fires on new objects and on overwrites, and has no retries, as before.
  - The Cloud Tasks queue becomes EventBridge Scheduler, which fires once after the hold, feeding an SQS queue with a dead-letter queue. The Lambda reads from that queue with max concurrency 3 and 4 attempts.
  - The BigQuery dataset becomes a Glue database plus an Athena workgroup and results bucket.
- **`functions/ingest/main.py`** now handles S3 events.
  - It reads the object's metadata with `head_object` and uses the S3 version ID in place of the GCS generation.
  - It creates the 2-hour one-time schedule and publishes to SNS.
  - The schedule name is now a sha256 hash. The original used Python's `hash()`, which changes between processes, so the same file could never get the same task name twice.
- **`functions/transcode/main.py`** is now an SQS-triggered handler. It skips the job as stale if the object was deleted or its current version ID differs from the job's.
- **`sql/weekly_report.sql`** is rewritten for Athena. Trino's weeks start on Monday and its day-of-week numbering is ISO, so I shifted the week start by a day and changed the weekend days to 6 and 7. The average is cast to double.

**Differences you should know about**
- **Timeout:** Lambda is capped at 900s, but the GCP transcode function allowed 1800s. If real transcodes run longer than 15 minutes, move that step to Fargate or AWS Batch.
- **Retry backoff:** the 30s–600s exponential backoff has no direct equivalent. Retries now follow the SQS visibility timeout of 960s. The 5/s dispatch rate limit is also dropped, since concurrency 3 effectively caps it.
- **SNS attributes:** SNS allows only 10 message attributes and the original sent 12, so the details now go in a JSON body. Only `event` stays as an attribute. Subscribers need updating.
- **SNS retention:** SNS keeps no messages, so the 7-day retention is gone. Add an SQS subscription per consumer if you need buffering.
- **Dropped fields:** S3 has no crc32c or md5 field, so the SNS payload sends `etag` instead. This only matches the md5 for non-multipart uploads.
- **Athena table:** `media.uploads` wasn't defined in the original Terraform, and I didn't invent a schema. You'll need to create that table in Glue.
- **Unchanged:** the BigQuery dataset's location was set to `us-central1`. The AWS region is a variable defaulting to `us-east-2`.