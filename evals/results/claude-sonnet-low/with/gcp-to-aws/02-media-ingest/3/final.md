I've written the AWS Terraform in `aws/main.tf`, ported both functions in place, and rewrote `sql/weekly_report.sql` for Athena. I haven't run `terraform validate`, `plan` or `apply`, and I haven't tested the functions or the SQL. `infra/` (the GCP Terraform) is untouched.

## What changed
- **Storage:** the GCS bucket becomes S3 with ACLs disabled and public access blocked. Versioning is on, because the S3 `versionId` is what stands in for the GCS `generation`.
- **Hold and queue:** the Cloud Tasks queue becomes one-time EventBridge Scheduler schedules, because the 2-hour hold is longer than SQS can delay. Each schedule deletes itself after it fires.
- **Events topic:** the Pub/Sub topic becomes a Kinesis stream with 7-day retention.
- **Functions:** `ingest` is triggered by S3 `ObjectCreated:*`, with retries off to match `DO_NOT_RETRY`. `transcode` is invoked by the scheduler. Both now take the AWS event shape.
- **IAM:** the one shared service account becomes three least-privilege roles: one per function, plus one for the scheduler.
- **Analytics:** the BigQuery dataset becomes a Glue database `media` and an Athena workgroup with a results bucket.
- **SQL:** weeks still start on Sunday (Trino starts them on Monday), and the weekend filter changes from `IN (1, 7)` to `IN (6, 7)`. `SAFE_DIVIDE` and `COUNTIF` are rewritten, and `GROUP BY` uses ordinals.

## Needs your decision
1. **Transcode timeout is the biggest risk.** Lambda stops at 900 s and the GCP function ran up to 1800 s. Real ffmpeg jobs over 15 minutes will fail. I used Lambda because the function body is only a stub. For long jobs it should be an ECS Fargate task started by the scheduler.
2. **`media.uploads` has no table definition in the repo.** I didn't create it, and nothing here loads data into it.
3. **Events topic target:** I picked Kinesis because the topic had 7-day retention. Pub/Sub carried 12 attributes, but SNS and SQS allow only 10, so on Kinesis they go in the JSON body. Any consumers need updating.

## Behavior changes
| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| Region `us-central1` | `us-east-2` (variable) | changed | Nearest central-US region |
| `project_id` variable | `name_prefix` variable | changed | Only used for bucket names |
| Transcode timeout 1800 s | 900 s | needs decision | Lambda limit (item 1 above) |
| Task retries: 4 attempts, 30–600 s backoff | 3 attempts, Lambda's own backoff | changed | Lambda async retries max out at 2 |
| Rate limit 5/s, 3 concurrent | 3 concurrent only (reserved concurrency) | partly kept | No dispatch rate limit; needs at least 10 unreserved concurrency in the account |
| Task name from `abs(hash(...))`, which differs per process | SHA-256 of bucket, key and version | changed | Makes the name stable, so the duplicate guard works |
| Duplicate task name raises an error | Returns quietly, no second event | changed | Duplicate S3 events are expected |
| Unversioned bucket | Versioned, noncurrent versions expire after 1 day | changed | Needed for `generation`; expiry mimics GCS overwrites |
| Event carries content type, metadata, md5 and crc32c | Read with `head_object`; md5 is the ETag (single-part, non-KMS uploads only), crc32c only if the upload set that checksum | changed | S3 events don't carry these |
| Stale check by `generation` | Same check by `versionId`; a delete marker also counts as stale | kept | |
| Pub/Sub topic, 12 attributes | Kinesis stream, 168 h | needs decision | Item 3 above |
| Function source bucket `-fn-src` | Zipped from `functions/` by the `archive` provider | changed | The bucket was never defined in the Terraform |
| OIDC token to call transcode (and `SA_EMAIL` was never set) | Scheduler role calls the Lambda directly | changed | |
| BigQuery `us-central1` dataset | Glue database plus workgroup in one region | changed | |
| Service account roles | None were defined in the repo; the new roles hold only what the code uses | changed | The transcode role is read-only, so add a write grant once the ffmpeg code exists |