# Cost, commitments, egress, and quotas

Prices change. Use this file for the shape of each pricing model, and
check current numbers in AWS documentation before quoting them.

## Pricing models that differ

| Area | GCP | AWS |
|---|---|---|
| VM discounts | Sustained use discounts (automatic, up to 30% on N1, N2, N2D, C2, M1, M2) | None automatic. Savings Plans / Reserved Instances only |
| Commitments | Committed use discounts | Compute Savings Plans (cover EC2, EKS nodes, Fargate, Lambda), EC2 Instance Savings Plans, RIs |
| Per-second billing | yes, 1-minute minimum | yes for Linux, 1-minute minimum |
| Kubernetes control plane | GKE cluster fee (free-tier credit for one) | EKS $0.10 per cluster-hour (standard support) |
| Serverless | Cloud Run: CPU-time + memory-time + requests | Lambda: memory-time (GB-s) + requests; Fargate: per-second vCPU + memory, plus the ALB |
| Idle min instances | Cloud Run min instances at a lower idle rate | Provisioned concurrency billed while on; ECS min tasks billed fully |
| Warehouse | BigQuery per TiB scanned or slot-hours | Athena per TB scanned; Redshift Serverless RPU-hours; provisioned nodes |
| Streams | Pub/Sub per TiB | Kinesis per shard-hour or per GB on-demand; MSK per broker-hour |
| Objects | Per 1,000 ops; min durations on cold classes | Per 1,000 requests; min durations; 128 KB minimum per object in IA/Glacier IR |
| Disks | Performance scales with size | EBS gp3 per GB plus extra IOPS/throughput |
| File shares | Filestore: provisioned size | EFS: stored bytes |
| Network | Egress per GB; NAT per GB | Egress per GB; NAT gateway per hour + per GB; cross-AZ per GB |

## Things that surprise people on the first bill

- No sustained use discount: steady VMs cost more on demand until a
  Savings Plan is bought.
- NAT gateway data processing for S3, ECR, and other AWS APIs. Add VPC
  endpoints.
- An ALB per small app under ECS Express Mode. Several apps can share one.
- Redshift Serverless kept awake by frequent dashboard refreshes.
- Lambda billed for time spent waiting on other services.
- Lifecycle transitions of millions of tiny objects into Glacier classes.
- Cross-AZ traffic between chatty services.

## When to commit

Don't buy Savings Plans, RIs, or Redshift reservations in the first
weeks. Run the workload until usage is steady (usually after the last
wave and the first full month's bill), then buy commitments sized to the
measured baseline.

## Egress out of GCP

- Data leaving GCP is billed per GB. Data entering AWS is free.
- Google offers free data transfer for customers leaving Google Cloud
  (cloud.google.com/exit-cloud). You must apply before the transfer, and
  conditions apply. Apply through the Google account team before the bulk
  copy.
- Ask AWS (account team or the Migration Acceleration Program) about
  migration credits before the move.

## Quotas to raise early

New AWS accounts start with low limits. Request increases in Service
Quotas weeks before the wave that needs them:

- EC2 On-Demand and Spot vCPUs per instance family (Standard, P, G).
- Elastic IPs per region.
- Lambda concurrent executions.
- EMR instances, Kinesis shards per region, Glue concurrent job runs.
- VPCs, NAT gateways, and interfaces per region if the design uses many.

Record each request and its status in `decisions.md`.
