# GCP → AWS quick map

One line per service. The area file has the decision rules and the
traps. The map is the easy part: the work is in the "Watch out" column.

## Compute (`compute.md`)

| GCP | AWS | Watch out |
|---|---|---|
| Compute Engine VM | EC2 | No custom machine shapes; size from measured use |
| Instance template | EC2 launch template | Rebuild, don't convert |
| Managed instance group | Auto Scaling group | One subnet per AZ; set `health_check_type = "ELB"` |
| Spot / preemptible VM | EC2 Spot | 2-minute best-effort notice; diversify instance types |
| Sole-tenant node | Dedicated Host | For per-core BYOL only |
| Machine image / custom image | AMI | Rebuild (Packer, Image Builder) or rehost with MGN |
| GKE Standard | EKS + managed node groups or Karpenter | Pods take real VPC IPs |
| GKE Autopilot | EKS Auto Mode | Nodes replaced at most every 21 days |
| GPU VMs (A2, A3, A4, G2) | EC2 P4d, P5/P5e/P5en, P6-B200, G6 | Capacity and quota, not code |
| Cloud TPU | Trainium / Inferentia, or GPUs | No TPU on AWS; a porting project |
| Batch | AWS Batch | Retries and job settings map loosely |
| Bare Metal Solution | EC2 `.metal` | Check licences and hardware |

## Serverless (`serverless.md`)

| GCP | AWS | Watch out |
|---|---|---|
| Cloud Run service | ECS Express Mode (Fargate) or Lambda | Lambda serves one request per instance |
| Cloud Run job | ECS task on Fargate, or AWS Batch array job | Task index variable changes |
| Cloud Run functions / Cloud Functions | Lambda | 15-minute limit; new handler signature |
| App Engine standard | Lambda, ECS Fargate, or Elastic Beanstalk | Legacy bundled services must be replaced |
| App Engine flexible | ECS Fargate or Elastic Beanstalk | `app.yaml` becomes new config |
| API Gateway / Cloud Endpoints | Amazon API Gateway | REST API 29 s default timeout |
| Eventarc | EventBridge | Event envelope differs |
| Pub/Sub push subscription | SNS + SQS, or EventBridge | Retries live on the queue |
| Cloud Tasks | SQS + Lambda | SQS only stores; a consumer must poll |
| Cloud Scheduler | EventBridge Scheduler | Time zone set per schedule |
| Workflows | Step Functions | Rewrite YAML to ASL JSON |
| Secret Manager | Secrets Manager or SSM Parameter Store | Access via the workload's IAM role |

App Runner is closed to new customers (since April 30, 2026). Don't
recommend it for new work. AWS points to ECS Express Mode instead.

## Big data (`big-data.md`, `big-data-sql.md`)

| GCP | AWS | Watch out |
|---|---|---|
| BigQuery | Redshift (Serverless or provisioned) | SQL dialect and pricing differ |
| BigQuery over lake files | Athena on S3 + Iceberg | Billed per TB scanned |
| Dataproc | EMR (on EC2, Serverless, or EKS) | `gs://` paths and init actions change |
| Dataproc Serverless | EMR Serverless | Different job settings and limits |
| Dataflow (Beam) | Managed Service for Apache Flink, Glue, or EMR | No 1:1; triage every job |
| Pub/Sub | Kinesis Data Streams, MSK, SNS + SQS | Ordering, retention, push all differ |
| Composer | MWAA | Same Airflow; different operators |
| Data Fusion | Glue (visual ETL) | Rebuild pipelines |
| Datastream | DMS | CDC set up differently |
| Dataplex / Data Catalog | Glue Data Catalog + Lake Formation | Access rules rebuilt by hand |
| BigQuery ML | Redshift ML or SageMaker AI | Retrain models |
| Looker Studio | QuickSight | Rebuild dashboards |
| Bigtable | DynamoDB or Keyspaces | Different data model; separate project |

## Storage (`storage.md`)

| GCP | AWS | Watch out |
|---|---|---|
| Cloud Storage | S3 | Cold classes need a restore before read |
| Autoclass | S3 Intelligent-Tiering | Objects under 128 KB aren't tiered |
| Persistent Disk / Hyperdisk | EBS (gp3, io2, st1) | Performance set separately from size |
| Regional PD | No match | EBS lives in one AZ; replicate at app level |
| Local SSD | EC2 instance store | Lost on stop |
| Filestore | EFS or FSx | Pick by sharing pattern |
| NetApp Volumes | FSx for NetApp ONTAP | Same NetApp tools |
| Backup and DR | AWS Backup | Recreate plans |
| Storage Transfer Service | DataSync | Reads GCS directly |
| Transfer Appliance | DataSync over the network | Snowball Edge closed to new customers (Nov 7, 2025) |

## Cross-cutting

| GCP | AWS | Read |
|---|---|---|
| Service account (attached) | IAM role (instance profile, Pod Identity, task/function role) | `iam-identity.md` |
| Service account key file | Nothing; delete it | `iam-identity.md` |
| Workload Identity Federation (GKE) | EKS Pod Identity (or IRSA) | `iam-identity.md` |
| Global VPC | One VPC per region + Transit Gateway or peering | `networking.md` |
| Firewall rule with network tags | Security group | `networking.md` |
| Global HTTP(S) load balancer | ALB (regional) + Route 53 or CloudFront | `networking.md` |
| Cloud DNS | Route 53 | `networking.md` |
| Cloud Interconnect / VPN | Direct Connect / Site-to-Site VPN | `networking.md` |
| Cloud Monitoring / Logging | CloudWatch metrics, Logs, Logs Insights, alarms | `methodology/validation.md` |
| Cloud KMS | AWS KMS | `iam-identity.md` |
| Committed use discounts | Savings Plans / Reserved Instances | `cost-limits.md` |
| Sustained use discounts | No equivalent | `cost-limits.md` |
