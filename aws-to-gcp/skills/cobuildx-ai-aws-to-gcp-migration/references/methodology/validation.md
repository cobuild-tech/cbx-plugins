# Validation

A unit is `done` only when it is proven equivalent and the
`gcp-parity-reviewer` report has no `high` differences.

## Every unit

- IaC plans cleanly (`terraform plan` shows only the expected resources).
  Show the plan to the user; apply only on their go-ahead.
- IAM: the new service account grants no more than the AWS role had, and
  no less than the code calls. No service account key files.
- Network: same exposure (public vs private), same allowed callers.
- Observability: logs arrive in Cloud Logging, the alarms that existed in
  CloudWatch exist as alert policies, and one has been triggered on
  purpose.
- No remaining AWS references in the migrated code path (`s3://`,
  `amazonaws.com`, `arn:aws:`, `169.254.169.254`, `boto3`/`@aws-sdk/`
  imports, Secrets Manager or SSM paths) unless the plan keeps them on
  purpose.

## Per area

| Area | Proof |
|---|---|
| Compute | Health checks pass across at least two zones; load test at AWS peak; instance replacement (delete one MIG instance) recovers |
| Serverless | Same responses for a recorded set of requests (status, headers, body); timeouts and payload limits checked end to end; event handlers tested with real GCP event payloads (CloudEvents, Pub/Sub push/pull), including a message that fails and is redelivered; concurrency > 1 per instance tested |
| Big data | Daily row counts and column totals match per table; top 50 queries match row by row; pipeline outputs match for the same input window; timestamps checked at day and month boundaries |
| Storage | Object count, total bytes, and checksums match (Storage Transfer logs); `Content-Type`/`Cache-Control` and custom metadata preserved; apps read and write through the new path; lifecycle and versioning configured |
| Events | Ordering, duplicate handling, retry and dead-letter behavior tested; backlog on AWS drained |

## Record

Write the results into `.migration/units/<id>.md`: what was checked, the
numbers, and the parity reviewer's report. A check that couldn't run is
listed as `not verified` with the reason, never as passed.
