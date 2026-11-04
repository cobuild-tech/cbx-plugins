# Cutover and rollback

Keep AWS running and able to take traffic back until the unit is
validated and the rollback window has passed. Every unit file records its
rollback path before cutover starts.

## Services (compute and serverless)

1. Lower DNS TTLs a few days ahead.
2. Deploy on GCP with alert policies in place; run uptime checks.
3. Shift a small share of traffic with weighted records (Route 53
   weighted records while DNS stays on Route 53, or Cloud DNS weighted
   round robin after the zone moves), e.g. 5% → 25% → 50% → 100%.
   Compare error rate and latency with AWS at each step.
4. Rollback: set the GCP weight to 0.
5. For VMs rehosted with Migrate to Virtual Machines: final sync,
   cut over, repoint DNS; the EC2 instance stays stopped, not
   terminated.

Move the DNS zone itself last, after every service it points to has
passed, and lower the NS TTL first.

## Events and queues

1. Create the Pub/Sub topic/subscription (or Cloud Tasks queue) and
   deploy consumers.
2. Point producers at GCP (or dual-publish during the switch).
3. Drain SQS queues and Kinesis streams to zero backlog before deleting
   them.
4. Rollback: point producers back; consumers on both sides must be
   idempotent.

## Storage

1. Full copy with Storage Transfer Service, then catch-up (incremental)
   transfers until each run is short.
2. Write freeze, final incremental transfer, repoint apps.
3. Verify counts, sizes, and checksums (transfer job logs, plus a sample
   check). Multipart S3 ETags are not MD5s; compare CRC32C or recompute.
4. Keep the S3 bucket read-only (bucket policy denying writes) for the
   rollback window.
5. Rollback: repoint apps to S3 and copy back any objects written on GCS
   since the freeze.

## Data and analytics

1. Backfill, then keep in sync (dual pipelines, dual writes, or
   Datastream / Database Migration Service CDC).
2. Compare row counts and totals daily; run the top-query check.
3. Switch readers one dashboard or consumer at a time.
4. Switch writers last; stop the AWS pipelines.
5. Rollback: readers point back at Redshift/Athena while it is still
   being written.

## Decommission

After every unit is `done` and the agreed window has passed:

1. Confirm no traffic reaches AWS (ALB access logs, CloudWatch metrics,
   S3 server access logs or CloudTrail data events, SQS/Kinesis metrics).
2. Deactivate, then delete IAM access keys; then delete roles and users.
3. Snapshot or export anything the user must retain, then delete
   resources. Ask before each deletion batch.
4. Shut down the AWS↔GCP link.
5. Review the first full GCP bill, then buy committed use discounts
   (`cost-limits.md`).
6. Set `phase: "complete"` in `state.json`.
