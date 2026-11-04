# Cost, commitments, egress, and quotas

Prices change. Use this file for the shape of each pricing model, and
check current numbers in Google Cloud documentation (cloud.google.com
pricing pages) before quoting them.

## Pricing models that differ

| Area | AWS | GCP |
|---|---|---|
| VM discounts | None automatic. Savings Plans / Reserved Instances | Sustained use discounts applied automatically on some families (N1, N2, N2D, C2, M1, M2; not E2, N4, C3 and newer; check current docs) |
| Commitments | Compute / EC2 Instance Savings Plans, RIs | Resource-based CUDs (vCPU/memory/GPU/local SSD per region) and spend-based CUDs (flexible across families, Cloud Run, GKE, Cloud SQL and more; check current coverage) |
| Per-second billing | yes for Linux, 1-minute minimum | yes, 1-minute minimum |
| Kubernetes control plane | EKS per cluster-hour | GKE cluster management fee (free-tier credit for one zonal or Autopilot cluster) |
| Serverless | Lambda: GB-s + requests; Fargate per-second | Cloud Run: CPU + memory time (request-based or instance-based billing) + requests |
| Idle warm capacity | Provisioned concurrency; ECS min tasks | Cloud Run min instances (billed at an idle rate) |
| Warehouse | Redshift nodes or RPU-hours; Athena per TB scanned | BigQuery on-demand per TiB scanned, or Editions slot-hours |
| Streams | Kinesis per shard-hour or on-demand GB; MSK per broker | Pub/Sub per TiB of throughput; Managed Kafka per vCPU/GB |
| Objects | Per 1,000 requests; min durations; 128 KB minimum in IA/Glacier IR | Per 1,000 ops; min durations; per-GB retrieval fees on cold classes |
| Disks | gp3 per GB + extra IOPS/throughput | PD performance scales with size; Hyperdisk provisions IOPS/throughput |
| File shares | EFS: stored bytes | Filestore: provisioned capacity |
| Network | NAT gateway per hour + GB; cross-AZ per GB | Cloud NAT per hour + GB; cross-zone and cross-region per GB; Premium vs Standard network tier |

## Things that surprise people on the first bill

- Filestore billed on provisioned size where EFS billed stored bytes.
- Cold-class reads billed per GB with no restore step to slow them down.
- BigQuery on-demand scans from dashboards and `SELECT *` without
  partition filters. Set `require_partition_filter` and per-user quotas.
- Cloud Run instance-based billing (CPU always allocated) left on for
  services that only need request-based billing.
- Premium network tier egress by default.
- Cross-region traffic inside the global VPC (easy to create by accident).

## When to commit

Don't buy CUDs in the first weeks. Sustained use discounts already apply
to eligible VMs. Run the workload until usage is steady (usually after
the last wave and the first full month's bill), then buy resource-based
CUDs for stable VM baselines and spend-based CUDs for the rest.

## Egress out of AWS

- Data leaving AWS to the internet is billed per GB. Data entering GCP is
  free.
- AWS offers free data transfer out to the internet for customers moving
  off AWS (announced March 2024). You must contact AWS Support before the
  transfer, it covers the move only, and conditions apply. Check the
  current terms and apply before the bulk copy.
- Direct Connect / Cross-Cloud Interconnect egress is billed at a lower
  per-GB rate than internet egress; compare for large, ongoing syncs.
- Ask Google (account team, Google Cloud migration programs such as
  RaMP) about migration credits before the move.

## Quotas to raise early

New GCP projects start with low limits. Request increases in IAM & Admin
→ Quotas weeks before the wave that needs them:

- CPUs per region and per machine family (N2, C3, etc.), and Spot
  (preemptible) CPUs.
- GPUs per region per model (and `GPUS_ALL_REGIONS`).
- In-use external IP addresses per region.
- Persistent Disk / Hyperdisk total GB per region.
- Cloud Run max instances per region, Cloud Functions per project.
- BigQuery slots (Editions reservations), Dataproc CPUs, Pub/Sub
  throughput if very high.

Record each request and its status in `decisions.md`.
