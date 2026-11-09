I've written the AWS port, but I haven't run any of it: no `terraform validate`, no Lambda tests and no Athena query. The original `infra/main.tf` is untouched.

## What changed
- **`aws/main.tf`**:
  - Storage: the GCS bucket becomes an S3 bucket with versioning on, because the S3 version ID stands in for the GCS generation. The BigQuery dataset becomes a Glue database.
  - Messaging: Pub/Sub becomes SNS. The Cloud Tasks queue becomes SQS plus an EventBridge Scheduler group, because SQS can't delay a message by 2 hours.
  - Functions: both Cloud Functions become Lambdas, with the S3 trigger and IAM roles.
  - Extra resources: I added an SQS dead-letter queue, an Athena workgroup and an Athena results bucket. Athena needs a results bucket and the retry count needs the dead-letter queue.
- **`functions/ingest/main.py`**: it now reads the S3 event and schedules a one-time transcode at now + 2 hours. It then publishes the `queued` event to SNS.
- **`functions/transcode/main.py`**: it is now triggered from SQS. It compares the object's current version ID with the one in the job and skips stale or deleted files.
- **`sql/weekly_report.sql`**: this is now Athena SQL, with Sunday-start weeks and the weekend check fixed for Trino's numbering.
- **Region**: I defaulted to `us-east-2`. GCP's `us-central1` has no AWS equivalent, so change it with `var.region` if you want.

## Behaviour differences
1. **Transcode timeout**: 900s instead of 1800s, which is Lambda's hard maximum. The 1800s dispatch deadline is gone with it.
2. **Retry backoff**: Cloud Tasks backed off from 30s to 600s with up to 3 doublings. SQS retries on a fixed 900s visibility timeout, so the delay is flat. The 4-attempt limit is kept through the dead-letter queue.
3. **Dispatch rate**: the 5 dispatches/second limit has no SQS or Lambda equivalent and is dropped. The limit of 3 concurrent runs is kept through the event source mapping's maximum concurrency.
4. **Event retention**: Pub/Sub kept messages for 7 days. SNS keeps none, so a subscriber has to exist before events are published.
5. **Event body**: the Pub/Sub body was empty. SNS rejects an empty message, so the body is now `"queued"`.
6. **Empty attributes**: SNS rejects empty attribute values, so empty ones are omitted. Pub/Sub sent them as empty strings.
7. **Attribute sources**:
   - `generation` is now the S3 version ID, not a numeric GCS generation.
   - `md5` is the S3 ETag. That is only an MD5 for non-multipart, non-KMS uploads, and it is hex rather than base64.
   - `crc32c` is only present if the upload supplied that checksum.
   - `uploader`, `show`, `season` and `episode` now come from `x-amz-meta-*` object metadata.
   - The ingest function makes an extra `head_object` call to get these.
8. **Task naming**:
   - The old name was `abs(hash(...))`, which Python randomises per process, so it wasn't stable across invocations. The new schedule name is a SHA-256 of the key and version ID.
   - Two events for the same version now collide, and the second `create_schedule` raises a conflict. In the old code, GCP only collided when the hash happened to match.
9. **OIDC token**: the old code sent an OIDC token with an empty service-account email, because `SA_EMAIL` was never set. That authentication is gone. The transcoder now reads from SQS and has no HTTP endpoint.
10. **Transcode response**: the old function returned `("stale", 200)` or `("ok", 200)` over HTTP. The Lambda returns plain strings that SQS ignores. Errors raise an exception to trigger redelivery.
11. **Ingest retries**: `maximum_retry_attempts = 0` matches `DO_NOT_RETRY`. S3 can still deliver a notification more than once, as GCS could.
12. **Key decoding**: S3 URL-encodes keys in event notifications (spaces become `+`), so the ingest function now decodes them. GCS gave raw names.
13. **Trigger scope**: `s3:ObjectCreated:*` fires on puts, copies and multipart completes, which is close to GCS `finalized`. Metadata-only changes don't fire it on either platform.
14. **Deleted-file check**: this relies on versioning, where a delete adds a delete marker and `head_object` returns 404. An unversioned bucket would have no version ID.
15. **SQL, week start**: Trino weeks start on Monday, so I shifted by one day to keep Sunday starts.
16. **SQL, weekend check**: ISO weekday numbers are Saturday=6 and Sunday=7. BigQuery's Sunday=1 and Saturday=7 become `IN (6, 7)`.
17. **SQL, average and cutoff**:
    - `SAFE_DIVIDE` is now a plain division. A group always has at least one row, so only a `NULL` sum could give a `NULL` result, and that behaves the same way.
    - The sum is cast to double to avoid integer division.
    - The 56-day cutoff uses `localtimestamp`, which assumes a UTC session and a UTC `uploaded_at`.
18. **Missing table**: `media.uploads` still isn't defined anywhere in the repo. You'll need to create it as a Glue/Athena table.