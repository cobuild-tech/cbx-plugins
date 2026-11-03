# Compute: Compute Engine, GKE, GPUs, TPUs, Batch

The service map fits on a page. The work is in machine shapes,
maintenance behavior, Spot, pod IPs, identity, and discounts.

## Decide in order (stop at the first yes)

1. Uses TPUs → port the model code first (JAX or PyTorch/XLA to GPU, or to
   Trainium/Inferentia with the Neuron SDK). Treat it as its own project.
2. Runs on Kubernetes → EKS. From Autopilot → EKS Auto Mode. From
   Standard → EKS with managed node groups or Karpenter.
3. Interruptible batch work → AWS Batch on Spot.
4. Per-core licensed software (Windows Server, SQL Server BYOL) →
   Dedicated Hosts, or licence-included EC2 (often cheaper; compare).
5. Small, stateless, request-driven → serverless (`serverless.md`).
6. Otherwise → EC2 in an Auto Scaling group.

Rehost or rebuild:

- **Rehost** with AWS Transform MGN (formerly Application Migration
  Service): install the agent, replicate disks continuously, launch a test
  instance, cut over in minutes. Use it for legacy servers, licensed
  software, and hand-tuned databases. Disks move with the VM.
- **Rebuild** with Packer (`amazon-ebs` builder), EC2 Image Builder, or
  Ansible → AMI → launch template → ASG. Use it when the VM is already
  built from code.

## Machine sizing

There are no custom machine shapes on EC2 (a 6 vCPU / 20 GB GCP VM has no
twin). Size from measured CPU and memory over a few weeks, then round up
to the nearest instance. Never map by family name alone.

| GCP family | EC2 | Note |
|---|---|---|
| E2 | t3 / t4g | Burstable with CPU credits; busy VMs get throttled. Use m-family for steady load |
| N2, N2D, N4 | m7i / m8i, m7a | General purpose |
| Tau T2A, Axion C4A (Arm) | m8g, c8g (Graviton) | Often cheapest per unit of work; needs Arm builds |
| C2, C3, C4 | c7i / c8i, c7a | Match vCPU count and clock speed |
| M1, M2, M3 | r8i, x2iedn, u-series | Match memory per vCPU |
| A2 (A100) | P4d / P4de | CUDA code unchanged |
| A3 (H100/H200) | P5 / P5e / P5en | |
| A4 (B200) | P6-B200 | |
| G2 (L4) | G6 | |

## Inside the VM

| GCP | AWS |
|---|---|
| Guest agent | SSM Agent + cloud-init |
| Startup script in metadata | EC2 user data |
| `metadata.google.internal` | IMDSv2 at `169.254.169.254` (token required) or the AWS SDK |
| Attached service account | IAM role via instance profile |
| OS Login / metadata SSH keys | SSM Session Manager (no open SSH port) |
| Google OS images | Amazon Linux, Ubuntu, RHEL, or Windows AMIs |
| Ops Agent (Monitoring/Logging) | CloudWatch agent |

Search the code and scripts for `metadata.google.internal` and
`computeMetadata/v1`. Every hit must move to IMDSv2 or the SDK. IMDSv1
calls (no token) fail on instances that require IMDSv2.

## Behavior that differs

- **No live migration.** GCE live-migrates VMs during host maintenance.
  EC2 scheduled events can stop or reboot an instance. A single VM that
  was safe on GCP needs an ASG (even of 1) or a second copy on AWS.
- **ASG zones.** An ASG spreads only across the subnets you list. Give it
  one private subnet per AZ, at least two AZs. By default it checks only
  EC2 status. Set `health_check_type = "ELB"` so a dead app is replaced.
- **Spot.** GCP Spot gives only a short shutdown window before
  preemption. AWS gives a 2-minute best-effort notice through IMDS and an
  EventBridge event. GCP Spot price is a fixed discount changed at most
  monthly. EC2 Spot price varies by type and AZ. Use many instance types
  with `price-capacity-optimized` allocation: one type is interrupted far
  more often than ten. Checkpoint long jobs.
- **AMI IDs differ per region.** Resolve them from SSM public parameters
  (e.g. `/aws/service/ami-amazon-linux-latest/...`), never hard-code them.
- **Limits.** New accounts start with low vCPU, GPU, and Elastic IP quotas.
  Request increases weeks ahead (`cost-limits.md`).

## GKE → EKS

| GKE | EKS |
|---|---|
| Workload Identity Federation | EKS Pod Identity (or IRSA) |
| Pod IPs from secondary ranges | Pod IPs from node subnets (VPC CNI) |
| GKE Ingress / Gateway | AWS Load Balancer Controller (different annotations) |
| Cluster autoscaler / node auto-provisioning | Karpenter, or Auto Mode |
| GCE PD CSI driver (`pd.csi.storage.gke.io`) | EBS CSI driver (`ebs.csi.aws.com`), gp3 StorageClass |
| Filestore CSI | EFS CSI |
| Control plane fee (free tier credit) | $0.10 per cluster-hour (standard support) |

- **Pod IP exhaustion is the most common surprise.** Every pod takes a VPC
  IP. Size node subnets for pods (a /19 or larger per AZ for real
  clusters), or enable prefix delegation. Plan subnets before building.
- **Identity re-linking** is the main source of "access denied" in week
  one. Every Kubernetes service account annotated with
  `iam.gke.io/gcp-service-account` needs a Pod Identity association to a
  new IAM role with equivalent permissions.
- **Auto Mode nodes live at most 21 days.** Workloads need
  PodDisruptionBudgets and must tolerate node churn.
- Rewrite Ingress annotations (`kubernetes.io/ingress.class: gce`,
  `cloud.google.com/*`) to ALB controller annotations
  (`alb.ingress.kubernetes.io/*`, `ingressClassName: alb`).
- Change image registries from `gcr.io` / `*-docker.pkg.dev` to ECR and
  rewrite every image reference.

## GPUs and TPUs

- CUDA code runs unchanged on P and G instances. Getting capacity is the
  hard part: new accounts have near-zero GPU quotas. Ask weeks ahead. For
  fixed-period training, use EC2 Capacity Blocks for ML.
- TPU code doesn't run anywhere on AWS. Port to GPU (JAX and PyTorch/XLA
  both target CUDA) or to Trainium/Inferentia via the Neuron SDK. Budget
  for accuracy and performance re-validation.

## Batch

AWS Batch runs on EC2, Spot, Fargate, or EKS. Map GCP Batch task groups to
job definitions and array jobs. Set retry strategy on purpose
(`attempts`, `evaluateOnExit` for Spot interruption) and checkpoint long
jobs on Spot.

## Load balancers and VPCs

See `networking.md`. In short: GCP's global HTTP(S) LB becomes a regional
ALB per region with Route 53 latency/weighted routing or CloudFront in
front; TCP/UDP LBs become NLBs.

## Terraform shape

```hcl
# GCP
resource "google_compute_region_instance_group_manager" "web" {
  region             = "us-central1"
  base_instance_name = "web"
  target_size        = 3
  version { instance_template = google_compute_instance_template.web.id }
}

# AWS
resource "aws_autoscaling_group" "web" {
  vpc_zone_identifier = var.private_subnet_ids # one subnet per AZ
  min_size            = 3
  max_size            = 6
  health_check_type   = "ELB"
  target_group_arns   = [aws_lb_target_group.web.arn]

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "price-capacity-optimized"
    }
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.web.id
        version            = "$Latest"
      }
      override { instance_type = "m7i.large" }
      override { instance_type = "m7a.large" }
      override { instance_type = "m6i.large" }
    }
  }
}
```

This shows the shape, not every setting. Check current provider docs.

## Things that bite later

- Service account key files in scripts and CI (`iam-identity.md`).
- `metadata.google.internal` calls left in code.
- Low vCPU, GPU, and EIP quotas.
- Hard-coded AMI IDs or IPs; use DNS names and SSM parameters.
- Single-AZ groups.
- Monitoring and alerts not rebuilt in CloudWatch before cutover.
