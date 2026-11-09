I wrote the AWS version, but I haven't run `terraform validate` or `plan`, or deployed anything.

The new files are `aws/main.tf` and `sql/weekly_report.athena.sql`. The two functions in `functions/` are rewritten in place. `infra/main.tf` and `sql/weekly_report.sql` are untouched, so GCP stays runnable.

**What it builds**
- **Upload bucket:** an S3 bucket with versioning on, public access blocked, and S3 notifications that invoke the ingest Lambda. Its trigger has retries off, matching `DO_NOT_RETRY`.
- **Transcode queue:** the Cloud Tasks queue becomes an SQS queue with a dead-letter queue and a Lambda consumer.
- **Two-hour hold:** the ingest Lambda creates a one-time EventBridge Scheduler entry that fires into SQS, because SQS can't delay 2 hours. The schedule name is a hash of the file name and version ID, so a re-upload creates a new one and the old one goes stale.
- **Events topic:** the Pub/Sub topic becomes an SNS topic.
- **Analytics:** the BigQuery dataset becomes a Glue database `media` plus an Athena workgroup and a bucket for results.
- **IAM:** the one service account becomes one role per function.

**Behavior changes**

| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| Transcode timeout 1800 s | Lambda caps at 900 s | **Needs your decision** | If real ffmpeg work runs past 15 minutes, move it to Fargate or Batch. Today it's only a stub. |
| `generation` | S3 `versionId` | Changed | Versioning is on, with a 1-day expiry on old versions so replaced files don't pile up. |
| Event carried content type, md5, crc32c, metadata | Ingest now calls `head_object` | Changed | md5 only appears when the ETag is a plain md5, and crc32c only if the upload set that checksum. Custom metadata must be copied over with the data as `x-amz-meta-*`. |
| 12 Pub/Sub attributes, empty body | 10 SNS attributes, JSON body with all 12 fields | Changed | SNS allows 10 attributes, rejects empty values (I omit empty ones), and needs a non-empty body. md5 and crc32c are in the body only. |
| 7-day topic retention | SNS keeps nothing | **Needs decision** | I don't know the subscribers. A subscriber needs an SQS queue, or switch to Kinesis. |
| Retry backoff of 30–600 s, 5 dispatches per second | Retry delay is a flat 960 s visibility timeout, no rate cap | Changed | SQS has no backoff or dispatch rate. Concurrency is capped at 3 as before, and the 4 attempts map to `maxReceiveCount`. |
| Dropped tasks after 4 attempts | They go to a dead-letter queue | Added | Required for `maxReceiveCount`. |
| `hash()` task name | SHA-256 | Changed | Python's `hash()` differs per process, so the old dedup didn't work. |
| Duplicate task name raises | `ConflictException` is swallowed | Changed | S3 can deliver the same event twice. |
| Function source from a `-fn-src` bucket | `archive_file` zips `functions/` | Changed | The old bucket wasn't defined in Terraform. |
| `us-central1` | `us-east-2` | Changed | Nearest region. It's a variable. |
| `project_id` | `name_prefix` | Changed | It's only used for bucket names. |

**SQL:** the Athena version steps weeks back to Sunday, since Trino weeks start Monday. The weekend filter `IN (1, 7)` becomes `IN (6, 7)`. `SAFE_DIVIDE` becomes a cast to double divided by `NULLIF`.

**Gaps**
- **No `media.uploads` table:** I didn't create it, because the repo doesn't define its schema. It needs creating, and a data copy (BigQuery to Parquet to S3), before the query works.
- **Timestamp assumption:** the query assumes `uploaded_at` is a UTC `timestamp`.