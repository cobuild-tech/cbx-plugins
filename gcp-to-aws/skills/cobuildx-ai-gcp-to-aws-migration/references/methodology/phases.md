# Phases and waves

Every GCP → AWS move follows the same seven phases. The plan's units map
onto them.

1. **Inventory.** Every resource with type, size, usage, cost, owner, and
   who depends on it. The `gcp-inventory` agent covers what's in the repo;
   ask the user for what isn't (billing export, asset inventory).
2. **Pick targets and record why.** Walk each area file's "Decide in
   order" list. One line per decision in `decisions.md`.
3. **Build the base** (unit `u01-base`): AWS accounts per environment,
   VPCs and subnets sized for EKS, IAM and SSO, KMS keys, S3 gateway
   endpoints, CloudWatch logs and alarms, ECR, quota increases, the
   private link to GCP, and Google's exit-transfer application.
4. **Pilot one unit end to end.** Small, real, and low-risk: one service
   with its bucket, secrets, alarms, and domain, or one data product with
   a few tables and queries. Keep it to one to two weeks.
5. **Waves.** Group units so each wave can be validated and rolled back on
   its own:
   - Storage and stateless services first (buckets, functions, stateless
     containers).
   - Then rehosted VMs and stateful services.
   - Then data pipelines and warehouses: backfill, keep in sync, switch
     readers, then writers.
   - Events last for each producer/consumer pair: move consumers, then
     producers, and drain GCP queues before turning them off.
6. **Cut over gradually.** Weighted DNS for traffic, final incremental
   sync for data, readers before writers for analytics
   (`cutover.md`).
7. **Decommission, then commit.** Keep GCP read-only for an agreed window,
   delete resources and keys, review the first full AWS bill, then buy
   Savings Plans or reservations.

## Unit sizing

A unit is one thing that can be switched over and back alone: one
service, one bucket (or a group of small related buckets), one
pipeline, one dataset with its readers. Split anything that needs more
than one cutover window.

## Ordering rules

- `u01-base` comes first; every other unit depends on it.
- A consumer moves before or with its producer's queue, never after the
  queue is turned off.
- A dataset's readers move only after its data matches daily.
- Identity is re-made in the same unit as the workload, never later.
