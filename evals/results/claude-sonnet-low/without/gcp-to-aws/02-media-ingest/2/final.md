I've ported the pipeline to AWS, but none of it has been run, so `terraform validate`/`plan`, the Lambdas and the Athena query are all untested. The new Terraform is in `aws/main.tf`, both functions are rewritten in place, and `sql/weekly_report.sql` is now the Athena version. I left `infra/` untouched.

**Resource mapping**
- **Bucket:** GCS becomes S3 with versioning on, so each upload gets a version ID in place of the GCS generation. An S3 `ObjectCreated` event on the bucket triggers the ingest Lambda. The Lambda is set to not retry, matching `RETRY_POLICY_DO_NOT_RETRY`.
- **Task queue:** Cloud Tasks becomes EventBridge Scheduler plus SQS.
  - Scheduler holds each job for the 2 hours, because SQS can only delay 15 minutes.
  - SQS then gives 4 attempts (redrive to a dead-letter queue) and a maximum concurrency of 3 on the event source mapping.
- **Events and analytics:** Pub/Sub becomes SNS, and the BigQuery dataset becomes a Glue database.
- **Functions and IAM:** The functions are Lambdas, and the service account is now an IAM role with scheduler and SQS roles alongside it.

**Behavior differences**
- **Transcode timeout:** Lambda's limit is 900s, not 1800s. If real ffmpeg jobs run longer than 15 minutes, that step needs Fargate or Batch instead.
- **Retry backoff:** The 30s–600s backoff can't be set on SQS. Retries are spaced by the 1800s visibility timeout instead.
- **SNS attributes:** SNS allows only 10 message attributes and the old message had 12, so the fields now travel as a JSON body. S3 has no `md5Hash`, so that field is now `etag`. `crc32c` is only filled in if the object was uploaded with that checksum.
- **Retention:** SNS doesn't keep messages, whereas the Pub/Sub topic kept them for 7 days.
- **Object metadata:** S3 events don't carry content type or custom metadata, so ingest now calls `head_object` to get them.
- **Task naming:** The old code named tasks with Python's `hash()`, which differs between processes, so duplicate events wouldn't have been de-duplicated. Schedule names are now a SHA-256 of the bucket, key and version.
- **Config:** `project_id` is replaced by `name_prefix`, which keeps the bucket name globally unique. The region defaults to `us-east-2`, and the function zips are built with `archive_file`.

**SQL**
- **Week start:** Trino's weeks start on Monday, so the query shifts the date by a day around `date_trunc` to keep Sunday starts.
- **Weekend days:** The weekend check is now `day_of_week IN (6, 7)`, since Trino numbers Monday as 1 and BigQuery numbered Sunday as 1.
- **Other changes:** `SAFE_DIVIDE` becomes a cast-to-double division by `NULLIF`, `COUNTIF` becomes `COUNT_IF`, and `GROUP BY`/`ORDER BY` use column positions.
- **Missing table:** The `media.uploads` table isn't defined in the original Terraform, and I didn't add one for Athena. You'll need to create it, for example over the S3 data.