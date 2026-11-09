The pipeline is ported, but I haven't run `terraform validate`, deployed anything, or tested the code. `infra/` is untouched and still holds the GCP version.

**What's in the repo**
- `aws/main.tf` holds all the AWS resources.
- `functions/ingest/main.py` is now a Lambda triggered by S3 `ObjectCreated`.
- `functions/transcode/main.py` is now a container task, with a new `Dockerfile` next to it.
- `sql/weekly_report.athena.sql` is the Athena version of the weekly report.
- The GCP SQL file is still there. I rewrote the two functions in place, so the GCP versions are only in git history.

**Behavior changes**

| GCP | AWS now | Status | Why |
|---|---|---|---|
| Cloud Function `transcode` (1800 s) | Fargate task, 2 vCPU / 4 GB | Changed | Lambda stops at 15 minutes. |
| Cloud Tasks (2 h hold, 4 attempts, 30–600 s backoff, 1800 s deadline) | Step Functions: Wait, then run the Fargate task | Changed | SQS can't delay 2 h or back off like Cloud Tasks. The retry settings carry over. |
| Cloud Tasks limits (5 dispatches/s, 3 concurrent) | Not enforced | Needs decision | Step Functions has no equivalent. A concurrency limit can be added if it matters. |
| Cloud Tasks named tasks (`abs(hash(...))`) | Execution name is a SHA-256 of bucket, key and version | Changed | Python's `hash()` is randomized per process, so the old names never deduplicated. |
| Object `generation` | S3 `versionId`, with versioning turned on | Changed | Needed for the "file was replaced" check. I added a 7-day expiry for old versions, which is my own choice. |
| Pub/Sub attributes (12), empty payload | SNS JSON body, with only `event` kept as an attribute | Changed | SNS allows 10 attributes and rejects empty values. Subscribers must parse the body. |
| Metadata, md5 and crc32c in the event | Read with `head_object` | Changed | S3 events don't carry them. `md5` is the ETag, and it's blank for multipart uploads. `crc32c` is blank unless the uploader sent a checksum. |
| Topic 7-day retention | None | Needs decision | The repo has no subscribers. If any exist outside it, add an SQS queue per consumer. |
| Function retry policy "do not retry" | `maximum_retry_attempts = 0` | Kept | |
| Shared service account | Separate roles for ingest, transcode and the state machine | Changed | One least-privilege role per workload. |
| Uniform bucket-level access | ACLs disabled and public access blocked | Kept | |
| Function source in a GCS bucket | Zipped from `functions/ingest` by Terraform | Changed | |
| `us-central1` | `us-east-2` | Changed | Nearest region, set by a variable. |
| BigQuery dataset `media` | Glue database, plus an Athena workgroup and a results bucket | Changed | The results bucket and workgroup are new glue that Athena needs. |

**SQL**
- Weeks start on Sunday: Trino's `date_trunc('week')` starts on Monday, so I shift back to Sunday.
- The weekend filter is `IN (6, 7)` instead of `IN (1, 7)`.
- `COUNTIF` is now `count_if`, and `SAFE_DIVIDE` is a cast to double divided by `NULLIF`.
- `GROUP BY` uses `1, 2` instead of the alias, which Trino rejects.
- I assumed `uploaded_at` is a zone-less timestamp holding UTC.

**Before it works**
- The `media.uploads` table isn't defined anywhere in the repo, so it has to be created in Athena and the data loaded.
- The transcode task role can only read the incoming bucket. Add write access once you know where the renditions go.
- You need to supply `vpc_id` and `subnet_ids`, and push the transcode image to the ECR repo.
- S3 bucket names are global, so `${project_id}-media-incoming` may already be taken.