# Serverless: Lambda, API Gateway, Step Functions, events

There are no servers to copy. The work is in the defaults: requests per
instance, the longest request, and how events retry and acknowledge.

## Decide in order (stop at the first yes)

1. Runs longer than 60 minutes → Cloud Run jobs (up to 7 days per task;
   check current limits) or Batch.
2. A container image Lambda, a full web app, or anything behind an ALB →
   Cloud Run service.
3. A small zip-packaged handler for HTTP or one event source → Cloud Run
   functions (deploys from source onto Cloud Run).
4. Scheduled work → Cloud Scheduler calling Cloud Run, a function, or a
   Workflows execution.
5. Multi-step with waits and retries (Step Functions) → Workflows.

## Lambda vs Cloud Run

| | Lambda | Cloud Run (services and functions) |
|---|---|---|
| Requests per instance | 1 | default 80, up to 1,000 |
| Longest HTTP request | 15 min | 60 min |
| Longest event-driven invocation | 15 min | 9 min for event-triggered functions; Pub/Sub push waits at most the ack deadline (600 s), so longer work goes to Cloud Tasks (up to 30 min) or a Cloud Run job |
| Scale to zero | yes | yes |
| Keep warm | provisioned concurrency | min instances |
| Largest request body | 6 MB (sync invoke) | 32 MiB (HTTP/1) |
| CPU | scales with memory | set separately from memory |
| Deploy unit | zip or Lambda-runtime image | container, or source built by Cloud Build |

The single biggest change is **requests per instance**, in the other
direction from what people expect. Lambda gives each request its own
environment. Cloud Run sends up to 80 at once to one instance. Consequences:

- **Module-level state is now shared.** Globals, caches, and clients that
  Lambda code mutated per invocation are now touched by many requests in
  parallel. Audit for thread safety, or set `max_instance_request_concurrency = 1`
  to keep Lambda behavior and say so.
- **Database pools.** A pool sized 1–2 for Lambda (or RDS Proxy in front)
  is too small at concurrency 80. Size the pool against concurrency ×
  max instances and the database's connection limit.
- **CPU throttling outside requests.** By default Cloud Run only gives CPU
  while handling a request. Background work after the response (common
  with Lambda extensions) needs instance-based billing (CPU always on).
- **`/tmp`** is an in-memory filesystem that counts against memory, not
  separate ephemeral storage up to 10 GB.
- **Reserved concurrency** → `max_instance_count` × concurrency. These are
  not the same limit; state it.

## Lambda handler → Cloud Run functions

| Lambda | Cloud Run functions |
|---|---|
| `def handler(event, context)` (API GW / function URL) | `@functions_framework.http def f(request)` (Flask request) |
| `def handler(event, context)` (SQS/SNS/S3/EventBridge) | `@functions_framework.cloud_event def f(cloud_event)` |
| Function URL | Built-in HTTPS URL |
| Event source mapping (SQS, Kinesis, DynamoDB Streams) | Eventarc trigger or Pub/Sub push subscription |
| Memory only | CPU and memory set separately |
| Env `AWS_LAMBDA_FUNCTION_NAME` | Env `K_SERVICE` |
| Layers | Normal dependencies in the image or `requirements.txt` |

Keep business logic in a plain module and write a thin entry point per
cloud. That keeps both deployable during cutover.

```python
# AWS (Function URL or API Gateway HTTP API, payload v2)
import json
def handler(event, context):
    params = event.get("queryStringParameters") or {}
    return {"statusCode": 200, "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"hello": params.get("name", "world")})}

# GCP
import functions_framework
@functions_framework.http
def hello(request):
    return {"hello": request.args.get("name", "world")}, 200
```

## Events

- **Envelope.** SQS gives `Records[].body` (plain text), SNS wraps the
  message in a JSON envelope unless raw delivery is on, S3 gives
  `Records[].s3`, EventBridge gives `detail`. Pub/Sub delivers one
  message per invocation, base64-encoded in `message.data`; Eventarc
  delivers CloudEvents. Every handler changes.
- **No batches.** A Lambda invocation gets up to 10 (or more) SQS records
  and reports failures with `batchItemFailures`. Pub/Sub delivers one
  message per push or function call and acks per message (a 2xx response
  or normal return). Remove the batch loop; per-message ack replaces
  partial batch failure.

```python
# AWS: SQS event source mapping with ReportBatchItemFailures
def handler(event, context):
    failed = []
    for record in event["Records"]:
        try:
            process(record["body"])
        except Exception:
            failed.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failed}

# GCP: Pub/Sub via Eventarc; raising makes Pub/Sub redeliver this message
import base64, functions_framework
@functions_framework.cloud_event
def on_message(cloud_event):
    process(base64.b64decode(cloud_event.data["message"]["data"]).decode())
```

- **Visibility timeout → ack deadline.** `ack_deadline_seconds` is 10–600.
  A consumer that legitimately runs longer must extend the deadline
  (client library lease management, pull only) or move to a Cloud Run
  job. Push subscriptions use the ack deadline as the request timeout.
- **`maxReceiveCount` → dead-letter policy.** `max_delivery_attempts` is
  5–100; a `maxReceiveCount` below 5 can't be kept (flag it). The
  dead-letter topic needs the Pub/Sub service agent
  (`service-<project-number>@gcp-sa-pubsub.iam.gserviceaccount.com`)
  granted publisher on the DLQ topic and subscriber on the source
  subscription, or messages are never forwarded. Attach a subscription
  to the DLQ topic, or dead letters are dropped.
- **Retry backoff.** SQS redelivers after the visibility timeout; set a
  `retry_policy` (min/max backoff) on the subscription or redelivery is
  immediate.
- **FIFO → ordering keys.** SQS FIFO `MessageGroupId` → publish with
  `ordering_key` and `enable_message_ordering = true` (the publisher must
  enable ordering too). `MessageDeduplicationId` has no publish-side
  equivalent; use `enable_exactly_once_delivery` (pull subscriptions,
  same region) and keep the handler idempotent. A message that keeps
  failing blocks its key until it is dead-lettered.
- **SQS delay / Cloud Tasks.** Per-message `DelaySeconds` and
  rate-limited dispatch → Cloud Tasks (`schedule_time`, queue rate and
  concurrency limits). Plain fan-in work queues → Pub/Sub.
- **SNS → Pub/Sub topic.** Each SNS subscription becomes a Pub/Sub
  subscription. Filter policies → subscription `filter` (attributes only,
  not message body). SMS/email targets have no Pub/Sub equivalent.
- **Idempotency.** Both clouds deliver at least once. Keep processed IDs
  (Firestore transaction or a unique key in the database).
- **EventBridge rules → Eventarc.** AWS service events map to Eventarc
  triggers on Cloud Audit Logs or direct events. Custom buses and
  `PutEvents` → Pub/Sub topics or Eventarc Advanced. Input transformers
  move into the handler.
- **EventBridge Scheduler → Cloud Scheduler.** Cron with a `time_zone`.
  EventBridge *rules* with `cron(...)` were UTC: keep UTC explicitly, or
  convert and say so. AWS cron has six fields (with year and `?`); Cloud
  Scheduler uses five-field unix cron.
- **Step Functions → Workflows.** Rewrite Amazon States Language JSON to
  Workflows YAML by hand. `Retry`/`Catch` → `try`/`retry`/`except`.
  `Map` → `parallel for`. `.waitForTaskToken` → callbacks. Express
  workflows at high event rates may need Pub/Sub + Cloud Run instead.

## Containers and jobs

- ECS/Fargate tasks run on a schedule → Cloud Run jobs started by Cloud
  Scheduler. AWS Batch array jobs → Cloud Run jobs with task count:
  `AWS_BATCH_JOB_ARRAY_INDEX` → `CLOUD_RUN_TASK_INDEX`.
- Elastic Beanstalk → Cloud Run (web) or App Engine flexible. Don't pick
  App Engine standard for new work.

## Identity and access

| AWS | GCP |
|---|---|
| One execution role per function | One service account per Cloud Run service or function |
| Lambda resource policy / `AWS_IAM` function URL | `roles/run.invoker` on the service |
| Public function URL (`NONE`) | `allUsers` invoker ("allow unauthenticated") |
| SigV4 service-to-service calls | Google-signed ID tokens with the target URL as audience |
| Cognito / ALB OIDC authentication | Identity-Aware Proxy or Identity Platform |
| API Gateway usage plans and API keys | API Gateway API keys (quotas) or Apigee |

## Networking

- A Lambda in a VPC reaches private resources directly. Cloud Run needs
  Direct VPC egress (or a Serverless VPC Access connector) and, for the
  internet from a private range, Cloud NAT.
- API Gateway (REST/HTTP) → Google API Gateway (OpenAPI 2.0; set the
  `x-google-backend` `deadline`, the default is short) or an external
  Application Load Balancer with serverless NEGs. Check current limits.
- Custom domains → certificate on the load balancer (Certificate
  Manager) or Cloud Run domain mapping.

## Terraform shape

```hcl
# AWS
resource "aws_lambda_function" "api" {
  function_name = "api"
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.api.repository_url}:1.4"
  memory_size   = 1024
  timeout       = 30
  role          = aws_iam_role.api.arn
  reserved_concurrent_executions = 50
}

# GCP
resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = "us-central1"
  template {
    service_account                  = google_service_account.api.email
    max_instance_request_concurrency = 1   # keeps Lambda's one-request-per-instance; raise after a thread-safety review
    timeout                          = "30s"
    scaling { max_instance_count = 50 }
    containers {
      image = "us-docker.pkg.dev/proj/api/api:1.4"
      resources { limits = { cpu = "1", memory = "1Gi" } }
    }
  }
}
```

Concurrency 1 is the faithful default. Raising it is usually right for
cost, but it is a behavior change: record it.

## Things that bite later

- Push subscriptions and Eventarc retry on any non-2xx, including
  timeouts. A slow handler retries while still running; make it
  idempotent.
- Lambda Powertools, X-Ray, and CloudWatch EMF metrics → Cloud Logging
  structured logs, Cloud Trace, and log-based or custom metrics.
- `boto3` calls for SSM/Secrets Manager at cold start → Secret Manager
  mounted as env var or volume on the Cloud Run service.
- Cloud Run instance and CPU quotas per region are set per project.
  Check them weeks ahead (check current docs).
