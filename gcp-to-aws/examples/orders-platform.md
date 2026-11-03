# Example: orders platform, GCP → AWS

> This example shows the output format the skill's Direct mode produces:
> the checklist it walks and the Behavior changes table it ends with. For
> measured results, see [`evals/RESULTS-gcp-to-aws.md`](../../evals/RESULTS-gcp-to-aws.md).

**Input:** the repo in
[`evals/cases/gcp-to-aws/01-orders-platform/repo`](../../evals/cases/gcp-to-aws/01-orders-platform/repo):
a GCS bucket, Pub/Sub with ordering and a dead-letter topic, Cloud SQL
(PostgreSQL 15, IAM auth), a Cloud Run API, a Cloud Function worker,
BigQuery SQL, and a Cloud Scheduler job.

**Prompt:** "Migrate this repo from GCP to AWS. Write the AWS Terraform in
aws/, port the Python app code in place, and port the SQL."

## What the skill adds

The skill walks the coupling checklist against every resource and ends
with a Behavior changes table, so nothing is changed without being said.

| Checklist item | What it catches in this repo |
|---|---|
| Location | `location = "US"` bucket and dataset are multi-region; S3 and Athena are one region |
| Ordering | `ordering_key=customer_id` needs FIFO + `MessageGroupId` |
| Retries and DLQ | `max_delivery_attempts = 5` → `maxReceiveCount = 5` on every consumer queue |
| Timeouts | 900 s Cloud Run timeout rules out App Runner (120 s) and default API Gateway (29 s) |
| Scaling | Concurrency 80, min 1 / max 20 instances |
| Identity | Cloud SQL IAM auth; 7-day signed URL can't be kept with role credentials |
| Event shape | Worker reads a base64 Pub/Sub CloudEvent; SQS delivers `Records[].body` |
| Schedules | `time_zone = "America/New_York"` |
| Data and SQL | `SAFE_CAST`, `QUALIFY`, `_PARTITIONDATE`, `ARRAY_AGG(STRUCT … LIMIT 3)` |
| Defaults you introduced | Instance class, health check, glue queues and Lambdas |

## Behavior changes (the table the skill ends with)

| GCP behavior | AWS now | Kept / changed / needs decision | Why |
|---|---|---|---|
| GCS bucket in `US` multi-region | S3 bucket in `us-east-1` | **Needs decision** | S3 is regional. Add Cross-Region Replication if you need multi-region durability |
| BigQuery dataset in `US` | Athena + Glue in `us-east-1` | **Needs decision** | Same as above |
| Pub/Sub ordering by `customer_id` | SNS FIFO → SQS FIFO, `MessageGroupId = customer_id` | Kept | A failed message now blocks its customer's group until it reaches the DLQ |
| 5 delivery attempts, then DLQ | `maxReceiveCount = 5` on every consumer queue | Kept | Applied to the glue queue too |
| Ack deadline 60 s, function timeout 540 s | Visibility timeout 3240 s, Lambda timeout 540 s | Changed | AWS guidance: visibility ≥ 6× function timeout |
| Function retries forever per message | Lambda SQS batch size 1, partial-batch responses | Changed | Batch of 1 keeps per-message retry |
| Cloud Run 900 s timeout | ECS Fargate behind ALB, `idle_timeout = 900` | Kept | App Runner caps requests at 120 s |
| Concurrency 80 per instance, min 1 / max 20 | ECS min 1 / max 20, target tracking on requests per target | Changed | Requests per target is not a per-task concurrency limit |
| Cloud SQL IAM auth, regional HA, PITR | RDS PostgreSQL 15, IAM auth, Multi-AZ, PITR | Kept | |
| 7-day V4 signed upload URL | Presigned PUT URL, 1 h default (configurable) | Changed | A URL signed with role credentials stops working when the session ends |
| Worker reads Pub/Sub CloudEvent | Worker reads SQS `Records[].body` (raw SNS delivery) | Changed (code) | Different event format |
| Nightly job at 02:00 New York time | EventBridge Scheduler, `schedule_expression_timezone = "America/New_York"` | Kept | EventBridge rules are UTC only |
| Versioning; Nearline at 30 d; delete at 365 d | Versioning; `STANDARD_IA` at 30 d; expire at 365 d; noncurrent versions expire at 365 d | Kept | Noncurrent rule added so old versions don't build up |
| BigQuery SQL | Athena (Trino) SQL: `TRY_CAST`, `QUALIFY` → subquery, `dt` partition, `slice(array_agg(ROW(...)))` | Changed (code) | Approximate counts use a different algorithm and can differ slightly |
| None | RDS `db.m6g.large`, password in Secrets Manager, ALB health check `/healthz` | **Introduced** | No GCP counterpart; choices to review |

## Commands shown, not run

```bash
cd aws && terraform init && terraform plan
```

Nothing is applied in either cloud without your go-ahead for that command.
