# Example: orders platform, AWS → GCP

> This example shows the output format the skill's Direct mode produces:
> the checklist it walks and the Behavior changes table it ends with. It
> is illustrative, not a recorded run. For measured results (1.0.1:
> 42/42 criteria, 3/3 `terraform validate`), see
> [`evals/RESULTS-aws-to-gcp.md`](../../evals/RESULTS-aws-to-gcp.md).

**Input:** the repo in
[`evals/cases/aws-to-gcp/01-orders-platform/repo`](../../evals/cases/aws-to-gcp/01-orders-platform/repo):
an S3 bucket, SQS FIFO with a dead-letter queue, RDS PostgreSQL 15 (IAM
auth, Multi-AZ), a container-image Lambda API with an `AWS_IAM` function
URL, a zip Lambda worker with partial-batch responses, Athena SQL, and an
EventBridge Scheduler job.

**Prompt:** "Migrate this repo from AWS to GCP. Write the GCP Terraform in
gcp/, port the Python app code in place, and port the SQL."

## What the skill adds

| Checklist item | What it catches in this repo |
|---|---|
| Location | `us-east-1` bucket and data stay single-region unless you choose otherwise |
| Ordering | `MessageGroupId = customer_id` needs Pub/Sub ordering keys on both publisher and subscription |
| Retries and DLQ | `maxReceiveCount = 5` → `max_delivery_attempts = 5` plus Pub/Sub service agent grants |
| Timeouts | 360 s visibility timeout → 360 s ack deadline (under the 600 s cap) |
| Scaling and concurrency | Lambda ran one request per environment; module-level `CACHE` and clients now shared |
| Identity | `AWS_IAM` function URL stays private; presigned URL needs `signBlob` without a key file |
| Event shape | Worker reads SQS `Records[]` and returns `batchItemFailures`; Pub/Sub delivers one message |
| Schedules | Six-field `cron(0 2 * * ? *)` → five-field with `time_zone = "America/New_York"` |
| Data and SQL | `TRY_CAST`, `approx_distinct`, `slice(array_agg …)`, `CROSS JOIN UNNEST`, string `dt` partition |
| Defaults you introduced | Cloud SQL tier, Cloud Run CPU, concurrency, health checks |

## Behavior changes (the table the skill ends with)

| AWS behavior | GCP now | Kept / changed / needs decision | Why |
|---|---|---|---|
| S3 bucket in `us-east-1` | GCS bucket in `us-east1` | Kept | Same single-region footprint; dual-region is available if you want it |
| SQS FIFO by `customer_id` | Pub/Sub ordering keys, `ordering_key = customer_id` | Kept | A failed message still blocks its key until it reaches the DLQ |
| Content-based deduplication | Exactly-once delivery on the subscription | Changed | Dedup is per subscription and ack, not a 5-minute content window |
| 5 receives, then DLQ | `max_delivery_attempts = 5`, dead-letter topic | Kept | Pub/Sub service agent granted on both sides |
| Visibility timeout 360 s | `ack_deadline_seconds = 360` | Kept | |
| Batch of 10 with `batchItemFailures` | One message per invocation, raise to nack | Changed (code) | Per-message ack replaces partial-batch responses |
| One request per Lambda environment | Cloud Run `max_instance_request_concurrency = 1` | Kept | Module-level cache and clients aren't reviewed for sharing; raise later on purpose |
| Reserved 20 / provisioned 1 | Cloud Run max 20 / min 1 | Kept | |
| `AWS_IAM` function URL | Cloud Run with `roles/run.invoker` for the scheduler SA only | Kept | No `allUsers` |
| 1 h presigned PUT URL | 1 h V4 signed URL via IAM `signBlob` | Kept | Runtime SA gets Token Creator on itself; no key file |
| RDS IAM auth, Multi-AZ, 7-day backups | Cloud SQL PG 15, IAM auth, `REGIONAL`, PITR, 7-day retention | Kept | |
| Nightly 02:00 New York time | Cloud Scheduler `0 2 * * *`, `America/New_York` | Kept | |
| Versioning; `STANDARD_IA` at 30 d; expire at 365 d | Versioning; `NEARLINE` at 30 d; delete at 365 d | Kept | Nearline has a 30-day minimum storage duration |
| Block Public Access | Public access prevention enforced, uniform access | Kept | |
| Athena SQL | GoogleSQL: `SAFE_CAST`, `APPROX_COUNT_DISTINCT`, `ARRAY_AGG(... LIMIT 3)`, `QUALIFY` | Changed (code) | Approximate counts use a different algorithm and can differ slightly |
| None | Cloud SQL tier, Cloud Run 1 vCPU / 1 GiB | **Introduced** | No AWS counterpart; choices to review |

## Commands shown, not run

```bash
cd gcp && terraform init && terraform plan
```

Nothing is applied in either cloud without your go-ahead for that command.
