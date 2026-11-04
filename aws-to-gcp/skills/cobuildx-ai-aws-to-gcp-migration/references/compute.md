# Compute: EC2, Auto Scaling, EKS, ECS on EC2, GPUs, Inferentia/Trainium, Batch

The service map fits on a page. The work is in machine shapes, zones,
Spot, pod IPs, identity, and discounts.

## Decide in order (stop at the first yes)

1. Uses Inferentia or Trainium (Neuron SDK) → port the model code to GPU
   (CUDA) or TPU (JAX or PyTorch/XLA). Treat it as its own project.
2. Runs on Kubernetes → GKE. From EKS Auto Mode or Fargate profiles →
   GKE Autopilot. From managed node groups or Karpenter → GKE Standard
   with node pools and node auto-provisioning.
3. Containers on ECS → Cloud Run if every task is an HTTP service or a
   run-to-completion job that fits Cloud Run limits (`serverless.md`);
   otherwise GKE Autopilot (sidecars, daemons, non-HTTP listeners,
   long-lived workers).
4. Interruptible batch work → Google Cloud Batch on Spot VMs.
5. Per-core licensed software (Windows Server, SQL Server BYOL) →
   sole-tenant nodes, or licence-included images (compare).
6. Small, stateless, request-driven → serverless (`serverless.md`).
7. Otherwise → Compute Engine in a regional managed instance group (MIG).

Rehost or rebuild:

- **Rehost** with Migrate to Virtual Machines (Migrate for Compute
  Engine): connect it to the AWS account, replicate disks continuously,
  run test clones, cut over. Use it for legacy servers, licensed
  software, and hand-tuned databases. Disks move with the VM.
- **Rebuild** with Packer (`googlecompute` builder) or Ansible → custom
  image (or image family) → instance template → MIG. Use it when the AMI
  is already built from code.

## Machine sizing

Compute Engine has custom machine types (N2, N2D, N4, E2 and others), so
you can match measured vCPU and memory exactly instead of rounding up to
the next EC2 size. Size from measured CPU and memory over a few weeks.
Never map by family name alone.

| EC2 | GCP family | Note |
|---|---|---|
| t3 / t4g (burstable) | E2 (shared-core e2-micro/small/medium for tiny) | E2 has no CPU-credit model; steady load is fine |
| m5 / m6i / m7i, m6a / m7a | N2, N2D, N4, or C3/C4 for high clock | General purpose |
| m7g / m8g, c7g / c8g (Graviton) | C4A (Axion), Tau T2A | Arm builds already exist; keep them |
| c6i / c7i, c7a | C3, C3D, C4, C2D | Match vCPU count and clock speed |
| r6i / r7i, x2, u- (high memory) | M1, M2, M3, or N2/N4 highmem | Match memory per vCPU |
| P4d / P4de (A100) | A2 | CUDA code unchanged |
| P5 / P5e / P5en (H100/H200) | A3 | |
| P6-B200 | A4 | |
| G5 / G6 (A10G / L4) | G2 (L4) | No A10G on GCP; L4 is the closest |
| inf2 / trn1 / trn2 | GPU (G2, A3) or TPU | Port required (see below) |

## Inside the VM

| AWS | GCP |
|---|---|
| SSM Agent + cloud-init | Guest environment (guest agent) + cloud-init on some images |
| EC2 user data | `startup-script` metadata key |
| IMDSv2 at `169.254.169.254` | `metadata.google.internal` (`Metadata-Flavor: Google` header) or the GCP SDK |
| Instance profile (IAM role) | Attached service account |
| SSM Session Manager | OS Login + IAP TCP forwarding (no public SSH port) |
| Amazon Linux AMIs | Debian, Ubuntu, RHEL, Rocky, COS, or Windows images (no Amazon Linux) |
| CloudWatch agent | Ops Agent |

Search code and scripts for `169.254.169.254`, `latest/meta-data`,
`latest/api/token`, and `ec2metadata`. GCE also answers at
`169.254.169.254`, but with a different path and header, so every hit
must be rewritten. Amazon Linux–specific packages (`amazon-linux-extras`,
`dnf` repos) need a new base image.

## Behavior that differs

- **Live migration.** GCE live-migrates most VMs during host maintenance
  (not GPU VMs or Spot). AWS scheduled reboots largely go away; GPU VMs
  still need `on_host_maintenance = "TERMINATE"`.
- **MIG zones.** A regional MIG spreads across zones in the region by
  itself; there are no subnets per zone. Add an autohealing health check
  so a dead app is replaced (the EC2 ASG `health_check_type = "ELB"`
  equivalent).
- **Spot.** EC2 gives a 2-minute best-effort notice. GCE Spot gives about
  30 seconds (a shutdown script runs; check current docs). Checkpoint more
  often. GCE Spot price is a discount that changes at most monthly, not a
  per-AZ market price, and there's no mixed-instances policy: use several
  MIGs, or Batch/GKE with multiple machine families.
- **Images are global.** No per-region AMI IDs. Reference an image family
  (`projects/debian-cloud/global/images/family/debian-12`) instead.
- **Elastic IPs** → static external IPs (regional). Most workloads need
  none behind a load balancer.
- **Limits.** New projects start with low CPU, GPU, and IP quotas. Request
  increases weeks ahead (`cost-limits.md`).

## EKS → GKE

| EKS | GKE |
|---|---|
| EKS Pod Identity / IRSA | Workload Identity Federation for GKE |
| VPC CNI (pods take subnet IPs) | VPC-native with secondary ranges for pods and services |
| AWS Load Balancer Controller | GKE Ingress / Gateway API (`gke-l7-*` classes) |
| Karpenter / Cluster Autoscaler | Cluster autoscaler + node auto-provisioning, or Autopilot |
| EBS CSI (`ebs.csi.aws.com`) | PD CSI (`pd.csi.storage.gke.io`), `pd-balanced`/Hyperdisk StorageClass |
| EFS CSI | Filestore CSI |
| ECR | Artifact Registry |
| Control plane fee per cluster | GKE cluster management fee (check current docs; one free zonal/Autopilot cluster credit) |

- **Plan secondary ranges.** Pod and service CIDRs come from secondary
  ranges on the subnet; size them for max pods per node × nodes before
  building. Too small a pod range caps the cluster.
- **Identity re-linking** is the main source of "access denied" in week
  one. Every Kubernetes service account annotated with
  `eks.amazonaws.com/role-arn` (or with a Pod Identity association) needs
  a Workload Identity binding to a GCP service account, or direct IAM on
  the KSA principal.
- **Autopilot rejects some pods**: privileged containers, host paths,
  most DaemonSets that touch the node. Check with the Autopilot
  compatibility rules before choosing it.
- Rewrite Ingress annotations (`alb.ingress.kubernetes.io/*`,
  `ingressClassName: alb`) to GKE Ingress/Gateway (BackendConfig,
  FrontendConfig, HealthCheckPolicy).
- Change image registries from `*.dkr.ecr.*.amazonaws.com` to
  `*-docker.pkg.dev` and rewrite every image reference.

## GPUs, Inferentia, and Trainium

- CUDA code runs unchanged on A2/A3/A4/G2. Getting capacity is the hard
  part: new projects have near-zero GPU quotas. Ask weeks ahead. For
  fixed-period training, use Dynamic Workload Scheduler (calendar mode /
  flex-start) or reservations.
- Neuron SDK code doesn't run on GCP. Port to GPU (PyTorch on CUDA) or to
  TPU (JAX or PyTorch/XLA). Budget for accuracy and performance
  re-validation.

## Batch

Google Cloud Batch runs jobs on Compute Engine (Spot or standard). Map
AWS Batch job definitions and array jobs to Batch task groups
(`BATCH_TASK_INDEX` replaces `AWS_BATCH_JOB_ARRAY_INDEX`). Set
`max_retry_count` and lifecycle policies on purpose (retry on Spot
preemption exit codes), and checkpoint long jobs on Spot.

## Load balancers and VPCs

See `networking.md`. In short: a regional ALB per region usually becomes
one global external Application Load Balancer; NLBs become passthrough
or proxy Network Load Balancers.

## Terraform shape

```hcl
# AWS
resource "aws_autoscaling_group" "web" {
  vpc_zone_identifier = var.private_subnet_ids
  min_size            = 3
  max_size            = 6
  health_check_type   = "ELB"
  target_group_arns   = [aws_lb_target_group.web.arn]
  launch_template { id = aws_launch_template.web.id  version = "$Latest" }
}

# GCP
resource "google_compute_region_instance_group_manager" "web" {
  name               = "web"
  region             = "us-central1"
  base_instance_name = "web"
  version { instance_template = google_compute_instance_template.web.id }
  named_port { name = "http"  port = 8080 }
  auto_healing_policies {
    health_check      = google_compute_health_check.web.id
    initial_delay_sec = 120
  }
}
resource "google_compute_region_autoscaler" "web" {
  name   = "web"
  region = "us-central1"
  target = google_compute_region_instance_group_manager.web.id
  autoscaling_policy {
    min_replicas = 3
    max_replicas = 6
    cpu_utilization { target = 0.6 }
  }
}
```

This shows the shape, not every setting. Check current provider docs.

## Things that bite later

- Long-lived access keys in scripts and CI (`iam-identity.md`).
- IMDS calls (`169.254.169.254/latest/...`) left in code.
- Low CPU, GPU, and external IP quotas.
- Hard-coded AMI IDs, instance IDs, or IPs; use image families and DNS.
- Single-zone MIGs (zonal) where the ASG spanned AZs.
- Monitoring and alerts not rebuilt in Cloud Monitoring before cutover.
