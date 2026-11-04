# AWS → GCP quick map

One line per service. The area file has the decision rules and the
traps. The map is the easy part: the work is in the "Watch out" column.

## Compute (`compute.md`)

| AWS | GCP | Watch out |
|---|---|---|
| EC2 | Compute Engine | Custom machine types exist; size from measured use |
| Launch template | Instance template | Rebuild, don't convert |
| Auto Scaling group | Managed instance group (regional) | Autohealing health check is separate from the LB check |
| EC2 Spot | Spot VMs | 30-second preemption notice, not 2 minutes |
| Dedicated Host | Sole-tenant node | For per-core BYOL only |
| AMI | Custom image | Rebuild (Packer) or rehost with Migrate to Virtual Machines |
| EKS + managed node groups / Karpenter | GKE Standard + node pools / node auto-provisioning | Pod IPs come from secondary ranges |
| EKS Auto Mode / Fargate profiles | GKE Autopilot | Per-pod billing; some privileged workloads not allowed |
| GPU instances (P4d, P5, G5, G6) | A2, A3, A4, G2 VMs | Capacity and quota, not code |
| Inferentia / Trainium | GPUs or Cloud TPU | Neuron SDK code is a porting project |
| AWS Batch | Batch | Job and retry settings map loosely |
| `.metal` instances | Bare Metal Solution or C3 metal | Check licences and hardware |

## Serverless (`serverless.md`)

| AWS | GCP | Watch out |
|---|---|---|
| Lambda (zip) | Cloud Run functions | Many requests per instance now; new handler signature |
| Lambda (container image) | Cloud Run service | Image must serve HTTP on `$PORT`, not the Lambda runtime API |
| ECS on Fargate / App Runner | Cloud Run service | Sidecars and non-HTTP ports may push to GKE |
| ECS scheduled / one-off task | Cloud Run job | Task index variable changes |
| Elastic Beanstalk | Cloud Run or App Engine flexible | `.ebextensions` become new config |
| API Gateway (REST/HTTP) | API Gateway, or external Application LB + Cloud Run | Authorizers and usage plans rebuilt |
| Function URL | Cloud Run URL with `roles/run.invoker` | Public only with `allUsers` |
| EventBridge rules / buses | Eventarc | Event envelope differs (CloudEvents) |
| EventBridge Scheduler | Cloud Scheduler | Five-field cron + `time_zone` |
| SQS | Pub/Sub pull subscription, or Cloud Tasks | No per-message delay on Pub/Sub; ack deadline max 600 s |
| SQS FIFO | Pub/Sub with ordering keys (+ exactly-once) | A failed message blocks its key until acked or dead-lettered |
| SNS | Pub/Sub topic + subscriptions | Filter policies → subscription filters |
| Step Functions | Workflows | Rewrite ASL JSON to Workflows YAML |
| Secrets Manager / SSM Parameter Store | Secret Manager | Access via the workload's service account |

## Big data (`big-data.md`, `big-data-sql.md`)

| AWS | GCP | Watch out |
|---|---|---|
| Redshift (provisioned or Serverless) | BigQuery | SQL dialect and pricing differ; no DISTKEY |
| Athena on S3 | BigQuery (native, or BigLake / external tables) | Billed per TB scanned on both by default |
| EMR | Dataproc | `s3://` paths and bootstrap actions change |
| EMR Serverless / Glue Spark jobs | Dataproc Serverless | Glue `DynamicFrame` and job bookmarks have no match |
| Glue Data Catalog + Lake Formation | BigLake metastore + Dataplex | Access rules rebuilt by hand |
| Kinesis Data Streams | Pub/Sub | Shard ordering → ordering keys; no replay by sequence number |
| Kinesis Firehose | Pub/Sub BigQuery or Cloud Storage subscription | Buffering and transforms differ |
| MSK | Managed Service for Apache Kafka | Same Kafka clients |
| Managed Flink | Dataflow (Beam) or Managed Flink on Dataproc | No 1:1; triage every job |
| MWAA | Cloud Composer | Same Airflow; different operators |
| DMS | Datastream or Database Migration Service | CDC set up differently |
| Redshift ML / SageMaker | BigQuery ML / Vertex AI | Retrain models |
| QuickSight | Looker Studio or Looker | Rebuild dashboards |
| DynamoDB | Firestore, Bigtable, or Spanner | Different data model; separate project |

## Storage (`storage.md`)

| AWS | GCP | Watch out |
|---|---|---|
| S3 | Cloud Storage | Archive classes read online but with minimum durations and retrieval fees |
| S3 Intelligent-Tiering | Autoclass | Different tiers and fees |
| S3 Object Lock | Bucket Lock / object retention | Lock is irreversible; confirm first |
| S3 replication (CRR) | Dual- or multi-region bucket, or Storage Transfer | Location is chosen at creation |
| EBS (gp3, io2, st1) | Persistent Disk / Hyperdisk | Hyperdisk sets IOPS/throughput separately |
| Instance store | Local SSD | Lost on stop |
| EFS | Filestore | Fixed provisioned capacity, not elastic |
| FSx for NetApp ONTAP | NetApp Volumes | Same NetApp tools |
| FSx for Windows / Lustre | NetApp Volumes (SMB) / Managed Lustre | Check feature fit |
| AWS Backup | Backup and DR | Recreate plans |
| DataSync / S3 copy | Storage Transfer Service | Reads S3 directly; needs AWS credentials or a role |
| Snowball | Transfer Appliance | Lead time |

## Cross-cutting

| AWS | GCP | Read |
|---|---|---|
| IAM role (instance profile, task/function role) | Service account attached to the workload | `iam-identity.md` |
| IAM user access keys | Nothing; delete them | `iam-identity.md` |
| IRSA / EKS Pod Identity | GKE Workload Identity Federation | `iam-identity.md` |
| VPC per region + Transit Gateway | One global VPC (or Shared VPC) | `networking.md` |
| Security group | Firewall rule (network tags or service accounts) | `networking.md` |
| ALB / NLB (regional) | Application / Network Load Balancer (global or regional) | `networking.md` |
| CloudFront | Cloud CDN / Media CDN | `networking.md` |
| Route 53 | Cloud DNS | `networking.md` |
| Direct Connect / Site-to-Site VPN | Cloud Interconnect / HA VPN | `networking.md` |
| CloudWatch metrics, Logs, alarms | Cloud Monitoring, Cloud Logging, alert policies | `methodology/validation.md` |
| AWS KMS | Cloud KMS | `iam-identity.md` |
| Savings Plans / Reserved Instances | Committed use discounts | `cost-limits.md` |
| No equivalent | Sustained use discounts (some machine families) | `cost-limits.md` |
