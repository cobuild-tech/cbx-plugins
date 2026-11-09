I've finished writing the migration files, and nothing has been validated yet. I couldn't run `terraform validate` or test the SQL against Redshift, and I haven't run the parity-review agent.

## What changed
- **`aws/main.tf`** is new, and **`aws/lambda/nightly.py`** is a small Lambda that POSTs to the API.
  - Cloud Storage → S3.
  - Pub/Sub orders topic, subscription and DLQ topic → SNS FIFO, SQS FIFO and a FIFO DLQ.
  - Cloud SQL → RDS Postgres 15, Multi-AZ.
  - BigQuery → Redshift Serverless.
  - Cloud Run → ECS Fargate behind an ALB.
  - Cloud Function → Lambda on SQS.
  - Cloud Scheduler → EventBridge Scheduler, plus the Lambda above.
- **`app/api.py` and `app/worker.py`** are ported in place to boto3, SNS, the Redshift Data API and SQS events.
- **`sql/rollup.sql`** is ported to Redshift in place.
- **`infra/`** is untouched, so GCP stays as it was.

## Behavior changes

| GCP behavior | AWS now | Status | Why |
|---|---|---|---|
| 7-day signed upload URL | 15-minute presigned URL (`UPLOAD_URL_TTL_SECONDS`) | **Needs decision** | URLs signed with role credentials die when the session rotates. |
| `US` multi-region bucket and dataset | Single region, us-east-2 | Changed | S3 and Redshift are regional. Add S3 replication if you need the old durability. |
| Retry after a 60 s ack deadline | Retry after 3240 s (6 × the 540 s worker timeout) | **Needs decision** | A failed order blocks its FIFO group for about 54 minutes. A lower visibility timeout would shorten that. |
| Cloud Run concurrency 80 | Autoscaling on 80 requests per task | Changed | Not the same as per-instance concurrency. |
| 1 GiB memory | 4 GiB | Forced | 2 vCPU Fargate needs at least 4 GiB. |
| Lifecycle rules by object age | Noncurrent versions expire 365 days after they became noncurrent | Changed | S3 can't count from creation, so old versions are kept longer. |
| Delete after 365 days | Delete markers aren't cleaned up | Changed | Not handled. |
| Pub/Sub ordering key | `MessageGroupId` (customer id), with a random dedup ID | Kept | Duplicate-identical orders aren't dropped, same as Pub/Sub. |
| Pub/Sub max 5 delivery attempts | `maxReceiveCount` of 5; DLQ keeps messages 14 days | Kept | The old DLQ topic had no subscription, so messages in it were effectively dropped. |
| BigQuery `_PARTITIONDATE` | Needs a real `partition_date` DATE column on `analytics.orders` | **Needs decision** | Redshift has no pseudo-column. |
| `APPROX_COUNT_DISTINCT` | `APPROXIMATE COUNT(DISTINCT …)` | Changed | Both are HyperLogLog, but counts can differ slightly. |
| `SAFE_CAST` | Regex guard | Changed | Assumes `amount` is text. |
| `TIMESTAMP_TRUNC` | `AT TIME ZONE 'UTC'` | Changed | Assumes `created_at` is `TIMESTAMPTZ`. |
| `STRUCT`/`ARRAY_AGG` | `SUPER` via `LISTAGG` | Changed | `items` must be `SUPER`. |
| Cloud SQL socket volume | Plain VPC networking | Changed | Nothing in the app uses the DB. |
| New defaults I introduced | `db.m6g.large`, 20 GB gp3, managed passwords, final snapshot, 8 RPU Redshift base with a 100 RPU-hour/month usage limit (logs only), 30-day log retention, ALB health check accepting 200–499, ECS `desired_count` ignored by Terraform | New | None had a GCP counterpart. |

## Things to check
- The GCP Terraform grants `api-sa` only bucket access. The code also publishes to Pub/Sub and queries BigQuery, so those grants must exist elsewhere. I gave the AWS role SNS and Redshift access because the code needs them.
- The Cloud Run service has no public invoker binding, and the scheduler sends no auth token. I made the ALB internet-facing and the nightly call unauthenticated, so please confirm that's what you want.
- The repo has no Dockerfile or requirements file. You need to build and push the image to ECR.
- You need to supply a VPC, subnets with NAT or VPC endpoints, and an ACM cert plus DNS for `api_domain`.
- Redshift Serverless wants subnets in at least 3 AZs.
- Run once as the Redshift admin: `CREATE USER "IAMR:api" PASSWORD DISABLE; CREATE SCHEMA IF NOT EXISTS analytics AUTHORIZATION "IAMR:api";`
- The data still needs to be copied from GCS and BigQuery. Commands for that are deliberately not run.