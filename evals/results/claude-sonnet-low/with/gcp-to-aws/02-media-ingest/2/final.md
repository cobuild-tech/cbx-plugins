The AWS version is written but untested. I haven't run `terraform validate`, `plan` or `apply`, and nothing has touched either cloud.

**What changed**
- **`aws/main.tf`** holds the Terraform. The bucket becomes S3. The topic becomes SNS. The Cloud Tasks queue becomes an SQS queue with a DLQ, plus EventBridge Scheduler for the 2-hour hold. The BigQuery dataset becomes a Glue database, an Athena workgroup and a results bucket. It also adds IAM roles, the ingest Lambda, an S3 trigger and the ECS pieces for transcode.
- **`functions/ingest/main.py`** is now a Lambda that reads the S3 event and calls `head_object`. It creates a one-time Scheduler entry and publishes to SNS.
- **`functions/transcode/main.py`** is now an SQS-polling worker. I added a `Dockerfile` and `requirements.txt` next to it.
- **`sql/weekly_report.athena.sql`** is the Athena version of the report. It's a new file, so the BigQuery original is untouched.
- I left `infra/` alone, so GCP keeps running.

**Behavior changes**

| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| Transcode ran as a 30-minute HTTP function | Fargate worker polling SQS, 3 tasks | Changed | Lambda stops at 15 minutes. The tasks run all the time, so there is no scale to zero. |
| Cloud Tasks limits: 3 concurrent, 5 per second | 3 tasks at one message each. The 5/s limit is dropped. | Kept (concurrency) | Long jobs make the rate limit moot. |
| 4 attempts, 30–600 s backoff | `maxReceiveCount` 4, and the worker sets the visibility timeout itself to match the backoff | Kept | SQS has no native exponential backoff. |
| `dispatch_deadline` of 1800 s | Visibility timeout of 1800 s | Changed | It only redelivers the message. It doesn't kill a job that's still running. |
| `generation` | S3 `versionId`, with versioning turned on | Changed | Versioning is new, and consumers now see a version ID string instead of an integer. |
| Cloud Tasks name dedup | Scheduler name from a SHA-256 of the name and version. A duplicate event is skipped. | Kept | The old Python `hash()` varied per process, so this is deterministic. |
| Pub/Sub attributes (12) | SNS attributes (10). `md5` and `crc32c` are in the JSON body only, and empty values are omitted. | Changed | SNS allows 10 attributes and rejects empty values. |
| Empty Pub/Sub body | JSON body | Changed | SNS requires a non-empty message. |
| `md5Hash` and `crc32c` from GCS | `md5` comes from the ETag when the upload was single-part and not KMS-encrypted. `crc32c` only appears if the uploader sent that checksum. | Changed | S3 doesn't compute these automatically. |
| Topic retention of 7 days | None | Needs decision | SNS stores nothing. The repo shows no subscribers, so I added none. |
| `RETRY_POLICY_DO_NOT_RETRY` | `maximum_retry_attempts = 0` | Kept | |
| Object metadata (`uploader`, `show`, …) | Same keys, read from S3 user metadata | Kept | Keys are lowercased. |
| One service account | Separate IAM roles for ingest, transcode, the task execution role and the scheduler | Changed | Least privilege per workload. |
| Region `us-central1` | `us-east-2` (variable) | Changed | Nearest region. |
| Bucket names use `project_id` | Use `name_prefix` | Changed | S3 names are global. |
| `SA_EMAIL` OIDC token on the task | None | Changed | It wasn't set in the Terraform. Scheduler now uses an IAM role. |
| Function zips in a source bucket | Terraform zips `functions/ingest` for Lambda | Changed | |

**Left for you to decide or supply**
- **`media.uploads` schema:** it isn't in the repo, so no table is defined and the data isn't loaded. The SQL assumes `uploaded_at` is a UTC `timestamp`. Check that against the real column.
- **SQL port:** `GROUP BY` uses ordinals because Trino doesn't accept the alias. `SAFE_DIVIDE` became a double division with `NULLIF`. Week start is shifted to Sunday and the weekend filter is now `IN (6, 7)`.
- **Before the Fargate service can run:** you need to supply `vpc_id` and `subnet_ids`. The ECR image also has to be pushed.