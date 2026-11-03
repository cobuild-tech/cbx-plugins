# Validation

A unit is `done` only when it is proven equivalent and the
`aws-parity-reviewer` report has no `high` differences.

## Every unit

- IaC plans cleanly (`terraform plan` shows only the expected resources).
  Show the plan to the user; apply only on their go-ahead.
- IAM: the new role grants no more than the GCP identity had, and no less
  than the code calls. No key files.
- Network: same exposure (public vs private), same allowed callers.
- Observability: logs arrive in CloudWatch, the alarms that existed in
  Cloud Monitoring exist, and one has been triggered on purpose.
- No remaining GCP references in the migrated code path (`gs://`,
  `storage.googleapis.com`, `metadata.google.internal`,
  `projects/*/secrets/*`, `google.cloud` imports) unless the plan keeps
  them on purpose.

## Per area

| Area | Proof |
|---|---|
| Compute | Health checks pass across at least two AZs; load test at GCP peak; instance replacement (terminate one) recovers |
| Serverless | Same responses for a recorded set of requests (status, headers, body); timeouts and payload limits checked end to end; event handlers tested with real AWS event payloads, including a failed record in a batch |
| Big data | Daily row counts and column totals match per table; top 50 queries match row by row; pipeline outputs match for the same input window; timestamps checked at day and month boundaries |
| Storage | Object count, total bytes, and checksums match (DataSync report); `Content-Type`/`Cache-Control` preserved; apps read and write through the new path; lifecycle and versioning configured |
| Events | Ordering, duplicate handling, retry and dead-letter behavior tested; backlog on GCP drained |

## Record

Write the results into `.migration/units/<id>.md`: what was checked, the
numbers, and the parity reviewer's report. A check that couldn't run is
listed as `not verified` with the reason, never as passed.
