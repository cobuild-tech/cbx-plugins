# Serverless: Cloud Run, Cloud Functions, App Engine, events

There are no servers to copy. The work is in the defaults: requests per
instance, the longest request, and how events retry.

## Decide in order (stop at the first yes)

1. Runs longer than 15 minutes → ECS on Fargate, or AWS Batch.
2. A full web app (framework, database connections, long requests) or
   steady traffic → ECS Express Mode (Fargate).
3. A small API, webhook, or event handler with spiky traffic → Lambda.
4. Scheduled work → EventBridge Scheduler triggering Lambda or ECS.
5. Multi-step with waits and retries → Step Functions.

App Runner is closed to new customers (since April 30, 2026). Use ECS
Express Mode for new workloads: it takes a container image and two IAM
roles (task execution, infrastructure) and creates the Fargate service,
ALB, scaling, and networking.

## Cloud Run vs ECS Express Mode vs Lambda

| | Cloud Run | ECS Express Mode | Lambda |
|---|---|---|---|
| Requests per instance | up to 1,000 (80 typical) | as many as the app takes | 1 |
| Longest request | 60 min | set by the ALB idle timeout | 15 min |
| Scale to zero | yes | no (at least one task) | yes |
| Keep warm | min instances | min tasks | provisioned concurrency |
| Largest request body | 32 MiB | ALB limits | 6 MB (sync invoke) |
| Deploy unit | container | container | zip, or container implementing the Lambda runtime API |

The single biggest change is **requests per instance**. Cloud Run sends 80
concurrent requests to one instance. Lambda starts one environment per
concurrent request. Consequences:

- **Database connection storms.** 100 concurrent requests are 100 Lambda
  environments, each with its own connection pool. Use RDS Proxy, size
  pools to 1–2 per environment, or stay on ECS.
- **In-memory caches and counters** stop being shared across requests.
- **Lambda bills while the handler waits** on other services. Wait-heavy
  apps are often cheaper on Fargate.
- **Lambda Managed Instances** (Lambda on AWS-managed EC2) allow multiple
  concurrent requests per instance for steady, busy traffic. Code must be
  safe for parallel requests.

Fix cold starts only if users feel them: provisioned concurrency, or
SnapStart (Java, Python, .NET).

## Cloud Functions → Lambda

| Cloud Functions | Lambda |
|---|---|
| `@functions_framework.http def f(request)` | `def handler(event, context)` |
| `@functions_framework.cloud_event` | `def handler(event, context)` with the source's event shape |
| Built-in HTTPS URL | Function URL, or API Gateway |
| Eventarc / Pub/Sub trigger | SQS, SNS, EventBridge, S3, DynamoDB Streams event source |
| CPU and memory set separately | Memory only; CPU scales with memory |
| 60 min HTTP max | 15 min max |
| In-memory filesystem | `/tmp`, up to 10 GB |

Keep business logic in a plain module and write a thin entry point per
cloud. That keeps both deployable during cutover.

```python
# GCP
import functions_framework, json
@functions_framework.http
def hello(request):
    name = request.args.get("name", "world")
    return json.dumps({"hello": name}), 200, {"Content-Type": "application/json"}

# AWS (Function URL or API Gateway HTTP API, payload v2)
import json
def handler(event, context):
    params = event.get("queryStringParameters") or {}
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"hello": params.get("name", "world")}),
    }
```

## Events

- **Envelope.** Eventarc delivers CloudEvents (`type`, `source`,
  `subject`, `data`). EventBridge delivers `source`, `detail-type`, and
  `detail`. Pub/Sub push wraps data in `message.data`, base64-encoded.
  Every handler that reads events changes.
- **Pub/Sub push → SQS.** Put an SQS queue in front of each consumer, let
  Lambda poll it in batches, and attach a dead-letter queue. Retries and
  backoff live on the queue (visibility timeout, `maxReceiveCount`).
- **Partial batch failure.** By default, one failed record retries the
  whole batch. Enable `ReportBatchItemFailures` on the event source
  mapping and return the failed IDs:

```python
# GCP: Pub/Sub via Eventarc
import base64, functions_framework
@functions_framework.cloud_event
def on_message(cloud_event):
    payload = base64.b64decode(cloud_event.data["message"]["data"]).decode()
    process(payload)

# AWS: SQS event source mapping with ReportBatchItemFailures
def handler(event, context):
    failed = []
    for record in event["Records"]:
        try:
            process(record["body"])  # plain text; no base64
        except Exception:
            failed.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failed}
```

- **Idempotency.** Both clouds deliver at least once. Store a processed-ID
  (in DynamoDB with a conditional write) for anything that charges, emails,
  or writes.
- **Cloud Tasks → SQS + Lambda.** Rate limits become the event source
  mapping's maximum concurrency. Scheduled delivery up to 15 minutes uses
  SQS `DelaySeconds`; longer delays use EventBridge Scheduler one-time
  schedules.
- **Cloud Scheduler → EventBridge Scheduler.** Supports cron, rate,
  one-time schedules, and a time zone per schedule. Targets Lambda, ECS
  tasks, and Step Functions directly. Cloud Scheduler HTTP targets become
  a Lambda or an API destination.
- **Workflows → Step Functions.** Rewrite YAML to Amazon States Language
  JSON. Not convertible automatically. Map retries and `try/except` to
  `Retry` and `Catch`.

## Cloud Run jobs

Run as ECS tasks on Fargate, started by EventBridge Scheduler or Step
Functions. Parallel jobs become AWS Batch array jobs. Rename the task
index: `CLOUD_RUN_TASK_INDEX` → `AWS_BATCH_JOB_ARRAY_INDEX`
(`CLOUD_RUN_TASK_COUNT` → the array size passed in).

## App Engine

- Flexible → ECS Fargate or Elastic Beanstalk.
- Standard on second-generation runtimes → containerize; treat like Cloud
  Run.
- Legacy bundled services are real code work. Find them early:
  Memcache → ElastiCache, Task Queues → SQS, Users → Cognito,
  Datastore → DynamoDB, Blobstore → S3, Mail → SES.
- `cron.yaml` → EventBridge Scheduler. `dispatch.yaml` → ALB listener
  rules. `queue.yaml` → SQS queues.

## Identity and access

| GCP | AWS |
|---|---|
| Service account per service | One least-privilege IAM role per function or task |
| `roles/run.invoker` | Lambda resource policy, or `AWS_IAM` auth on a function URL |
| ID-token service-to-service calls | SigV4-signed calls, or a private API Gateway |
| "Allow unauthenticated" | Public function URL (`NONE` auth) or public API |
| Identity-Aware Proxy | ALB authentication with Cognito or OIDC |
| API keys | API Gateway usage plans and API keys |

## Networking

- Cloud Run reaches private resources through a VPC connector or Direct
  VPC egress. A Lambda in a VPC loses internet access unless the subnet
  routes through a NAT gateway (billed per hour and per GB). Add VPC
  gateway endpoints for S3 and DynamoDB.
- Custom domains → ACM certificate on an ALB, CloudFront, or an API
  Gateway custom domain.
- Remove calls back to GCP early; they add latency and egress cost.

## Terraform shape

```hcl
# GCP
resource "google_cloud_run_v2_service" "api" {
  template {
    service_account                  = google_service_account.api.email
    max_instance_request_concurrency = 80
    scaling { min_instance_count = 1 }
    containers {
      image = "us-docker.pkg.dev/proj/api/api:1.4"
      resources { limits = { cpu = "1", memory = "512Mi" } }
    }
  }
}

# AWS (Lambda option)
resource "aws_lambda_function" "api" {
  function_name = "api"
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.api.repository_url}:1.4"
  memory_size   = 1024
  timeout       = 30
  role          = aws_iam_role.api.arn
}

resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "AWS_IAM" # was roles/run.invoker
}
```

`max_instance_request_concurrency = 80` has no Lambda equivalent: state it
in the behavior differences. For this service with `min_instance_count = 1`
and steady traffic, ECS Express Mode is usually the closer fit.

## Things that bite later

- API Gateway REST APIs time out at 29 s by default. Check every timeout
  from the client to the database.
- Lambda's 6 MB request body. Send uploads straight to S3 with pre-signed
  URLs.
- Secret paths `projects/<p>/secrets/<name>/versions/latest` become
  Secrets Manager names or Parameter Store paths. Search the code.
- Cloud Logging queries and alerts → CloudWatch Logs Insights and alarms.
  Rebuild before moving traffic.
- The default Lambda concurrency quota is low in new accounts. Raise it
  weeks ahead.
