I've written the AWS Terraform in `aws/main.tf`, ported both functions in place, and ported the SQL to Athena. I haven't run `terraform validate`, `plan` or `apply`, and nothing has been deployed or tested.

**Mapping**
- **Bucket:** the incoming GCS bucket becomes an S3 bucket. It is versioned, so the GCS generation becomes the S3 `versionId`. Public access is blocked.
- **Trigger:** an S3 `ObjectCreated:*` notification invokes the `ingest` Lambda with retries turned off, matching `DO_NOT_RETRY`.
- **Hold and queue:** Cloud Tasks becomes an EventBridge Scheduler one-time schedule (the 2-hour hold), then SQS, then the `transcode` Lambda.
- **Events topic:** Pub/Sub becomes a Kinesis stream with 7-day retention.
- **Identity:** the service account becomes one shared `media-pipeline` role. A separate role lets the Scheduler deliver to the queue.
- **Analytics:** the BigQuery dataset becomes a Glue database, an Athena workgroup and a results bucket.
- **Functions:**
  - `ingest` unquotes the S3 key and calls `head_object` for content type, checksum and user metadata, since the S3 event doesn't carry them.
  - `transcode` is now an SQS handler and checks staleness by `versionId`.
- **SQL:** the Athena version is in `sql/weekly_report.sql`, which overwrites the BigQuery version in place; the old one is in git. The weekly report now starts weeks on Sunday, uses a weekend filter of `IN (6, 7)`, and uses `count_if` and a guarded division.

**Behavior changes**

| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| `transcode` timeout 1800 s | Lambda max 900 s | **Needs decision** | Lambda caps at 15 min. If jobs really take 15–30 min, move `transcode` to ECS Fargate or Batch. |
| `us-central1` | `us-east-2`, single region | Changed | Closest region. Set by `var.region`. |
| Retry backoff 30–600 s doubling | Fixed SQS visibility timeout (1800 s), max 4 receives, then a new DLQ | Changed | SQS has no exponential backoff. |
| 5 dispatches/s limit | None | Changed | Not available. Concurrency 3 is kept via the event-source mapping's max concurrency. |
| Task dedup by `hash()` | SHA-256 schedule name | Changed | Python `hash()` is randomized per process, so the old dedup didn't work across instances. |
| OIDC token from `SA_EMAIL` | IAM role on the Scheduler | Changed | `SA_EMAIL` was never set in the Terraform. |
| Pub/Sub attributes (12) | JSON in the Kinesis record body | Changed | SNS and SQS allow at most 10 attributes. Consumers must read the body. |
| Pub/Sub topic | Kinesis (no push) | Needs decision | No subscribers are in the repo, so I couldn't see who consumes it. |
| `md5Hash` / `crc32c` | S3 `ETag` / `ChecksumCRC32C` | Changed | The ETag is not an MD5 for multipart or KMS uploads. The CRC32C is empty unless the uploader supplied it. |
| Overwrites replace the object | Versioning on, noncurrent versions expire after 7 days | New default | Needed for generation tracking. The 7-day expiry is my choice. |
| BigQuery `media` dataset | Glue database only | Needs decision | The `uploads` table isn't defined in the repo. The data and its schema still have to be moved. |
| `DATE(uploaded_at)` | `CAST(uploaded_at AS DATE)` | Assumption | Correct only if `uploaded_at` is stored as UTC. |

**Prerequisites**
- The `${name_prefix}-fn-src` bucket must already hold `ingest.zip` and `transcode.zip`, as on GCP.
- The `transcode` stub has no `ffmpeg` in it. Lambda also has only 512 MB of `/tmp` by default, so you'd need to raise that for real media files.