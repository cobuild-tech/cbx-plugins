# Cutover and rollback

Keep GCP running and able to take traffic back until the unit is
validated and the rollback window has passed. Every unit file records its
rollback path before cutover starts.

## Services (compute and serverless)

1. Lower DNS TTLs a few days ahead.
2. Deploy on AWS with alarms in place; run synthetic checks.
3. Shift a small share of traffic with Route 53 weighted records (e.g.
   5% → 25% → 50% → 100%). Compare error rate and latency with GCP at
   each step.
4. Rollback: set the AWS weight to 0.
5. For VMs rehosted with MGN: final sync, launch the cutover instance,
   repoint DNS; GCP VM stays stopped, not deleted.

## Events and queues

1. Create the AWS queue/stream and deploy consumers.
2. Point producers at AWS (or dual-publish during the switch).
3. Drain GCP subscriptions to zero backlog before deleting them.
4. Rollback: point producers back; consumers on both sides must be
   idempotent.

## Storage

1. Full copy, then catch-up copies until each run is short.
2. Write freeze, final incremental copy, repoint apps.
3. Verify counts, sizes, and checksums (DataSync task report).
4. Keep the GCS bucket read-only (remove write roles) for the rollback
   window.
5. Rollback: repoint apps to GCS and copy back any objects written on AWS
   since the freeze.

## Data and analytics

1. Backfill, then keep in sync (dual pipelines, dual writes, or DMS CDC).
2. Compare row counts and totals daily; run the top-query check.
3. Switch readers one dashboard or consumer at a time.
4. Switch writers last; stop the GCP pipelines.
5. Rollback: readers point back at BigQuery while it is still being
   written.

## Decommission

After every unit is `done` and the agreed window has passed:

1. Confirm no traffic reaches GCP (load balancer logs, Pub/Sub metrics,
   bucket access logs, BigQuery job history).
2. Delete service account keys, then service accounts.
3. Snapshot or export anything the user must retain, then delete
   resources. Ask before each deletion batch.
4. Shut down the GCP↔AWS link.
5. Review the first full AWS bill, then buy commitments
   (`cost-limits.md`).
6. Set `phase: "complete"` in `state.json`.
