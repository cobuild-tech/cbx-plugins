---
name: cobuildx-ai-aws-to-gcp-migration
description: "Use when the user asks to convert or translate AWS code or configuration to Google Cloud (GCP) — Terraform with aws_* resources, CloudFormation, SAM, CDK, Serverless Framework, aws CLI commands, ECS task definitions, Lambda handlers, SQS/SNS/Kinesis consumers, Step Functions definitions, Redshift or Athena SQL, Glue or EMR jobs, MWAA DAGs, or boto3/AWS SDK calls, or \"what would this look like on GCP\" — or to migrate, move, or re-platform AWS workloads to GCP: EC2, Auto Scaling, EKS, ECS, Fargate, GPUs, Inferentia, Lambda, API Gateway, EventBridge, SQS, SNS, Step Functions, Redshift, Athena, Glue, EMR, Kinesis, Firehose, MSK, MWAA, DynamoDB, S3, EBS, EFS, or FSx. Also use to continue, resume, or check the status of an AWS-to-GCP migration already in progress (e.g. \"continue the migration\", \"what's left to move\", \"why isn't the orders bucket migrated yet\"), and for planning, scoping, sizing, or estimating the cost of a move off AWS."
metadata:
  version: "1.0.1"
---

# AWS → GCP Migration

Move AWS workloads to GCP with no change in behavior. A migration proves
equivalence. Don't re-architect beyond what the target service requires,
and don't fix things along the way unless the user asks. Record every
choice and the reason.

This skill is a workflow. The detail is in `references/`. Open a reference
only when a condition below says to, and open only that file.

## Pick a mode

- **Snippet mode.** Use this when there's no repo to work in (Claude.ai or
  Cowork chat without a project folder), or the user pasted code or config
  or asked about one service. Read `references/mappings.md` and only the
  one area file that matches (`compute.md`, `serverless.md`, `big-data.md`,
  or `storage.md`; add `big-data-sql.md` for Redshift or Athena SQL).
  Return the GCP version (Terraform, SDK code, handler, or SQL), then a
  short list of behavior differences and anything the snippet depends on
  that you couldn't see (IAM roles, VPCs, callers). Don't create
  `.migration/` or run the inventory agent. End with one line: "For a
  whole-project migration, open the repo in Claude Code and run
  `/aws-to-gcp:plan`."
- **Direct mode.** Use this when there is a repo and the user asks you to
  convert it (or part of it) now, in this session ("migrate this repo to
  GCP", "port the infra/ folder"), with no `.migration/` and no request
  for a plan. Read every AWS file in scope. Read `references/mappings.md`
  and the area file for every service family present (not just the
  first). Write the GCP code in the repo, walk the **Coupling checklist**
  below against every resource, and end with the **Behavior changes**
  table. Don't create `.migration/`. Show, never run, commands that
  change cloud state.
- **Project mode.** Use this for a whole project, a multi-session move,
  an explicit request for a plan, or an existing `.migration/`. Follow
  Steps 0–4. Before starting Step 1 on a repo with no `.migration/`, tell
  the user in one sentence what happens next: an inventory and a plan for
  their approval, with nothing changed in either cloud.

## Step 0: Resume or start

- If `.migration/state.json` exists, read it and
  `references/methodology/state-format.md`, then resume at its `phase`.
  - If `phase` is `execute`, continue with `next_unit`.
  - If the user asks about status ("why isn't X migrated yet"), answer
    from `state.json` and `plan.md` and change nothing.
- If it doesn't exist, read `references/methodology/state-format.md` and
  start at Step 1.

## Step 1: Assess

1. Delegate the sweep to the `aws-inventory` agent (if your tool has no
   such agent, follow `../../agents/aws-inventory.md` yourself). For a
   project of only a handful of files, you can read them directly.
2. If the repo shows only part of the estate (no IaC, or IaC for some
   services only), say so and ask the user for a resource export (AWS
   Config or Resource Explorer output, a Cost and Usage Report, or a
   list). Don't guess what isn't in front of you.
3. Write `.migration/assessment.md` and create `state.json` with
   `phase: "strategy"`.

## Step 2: Choose targets

1. Read `references/methodology/phases.md`.
2. For each area the inventory found, read that area's file and walk its
   "Decide in order" list, stopping at the first yes. Read
   `references/networking.md` and `references/iam-identity.md` for every
   project. They set up the base that every unit depends on.
3. If you can't tell whether a workload is live, how much downtime it can
   take, or who reads a dataset, ask the user before choosing.
4. Log each target and the reason in `.migration/decisions.md` and set
   `phase: "plan"`.

## Step 3: Plan (the only approval point)

1. Read `references/cost-limits.md` and
   `references/methodology/cutover.md`.
2. Write `.migration/plan.md` using the template in `state-format.md`.
   Unit 1 is always the GCP base (org, projects, network, IAM, quotas,
   link to AWS). Then a pilot: one small workload end to end. Then waves:
   storage and stateless services first, data pipelines and stateful
   services next, decommission last. Each unit must be small enough to
   validate and roll back on its own.
3. Fill `units` in `state.json`, then **stop and ask the user to approve
   the plan.** Once they approve, set `plan_approved: true` and
   `phase: "execute"`.

## Step 4: Execute one unit, then stop

1. Take `next_unit`, check that its `depends_on` units are `done`, and set
   it to `in-progress`.
2. Read the references the routing table below gives for what this unit
   contains.
3. Write the GCP code: IaC in the format the repo already uses (Terraform
   by default; CloudFormation/CDK/SAM become Terraform unless the user
   picks otherwise), application code changes, and pipeline or config
   changes. Show any command that creates, changes, or deletes cloud
   resources, and run it only after the user says to.
4. Validate it with `references/methodology/validation.md`, including the
   `gcp-parity-reviewer` agent (if your tool has no such agent, follow
   `../../agents/gcp-parity-reviewer.md` yourself).
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, follow the decommission section of
`references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| has EC2, launch templates, Auto Scaling groups, Dedicated Hosts, AWS Batch, GPUs, Inferentia, or Trainium | `references/compute.md` |
| has EKS (node groups, Karpenter, Auto Mode, or Fargate profiles) | `references/compute.md`, `references/networking.md` |
| has Lambda, ECS/Fargate, App Runner, Elastic Beanstalk, API Gateway, EventBridge, SQS, SNS, or Step Functions | `references/serverless.md` |
| has Redshift, Athena, Glue, EMR, Kinesis, Firehose, MSK, MWAA, DMS, Lake Formation, SageMaker, or DynamoDB | `references/big-data.md` |
| converts Redshift or Athena SQL, views, or scheduled queries | `references/big-data-sql.md` |
| has S3 buckets, EBS, instance store, EFS, FSx, AWS Backup, or data transfer | `references/storage.md` |
| uses an IAM role, access key, secret, parameter, KMS key, or resource policy | `references/iam-identity.md` |
| touches VPCs, security groups, load balancers, CloudFront, Route 53, NAT, or the AWS↔GCP link | `references/networking.md` |
| sizes machines, buys commitments, raises quotas, or moves data out of AWS | `references/cost-limits.md` |
| is the base unit or a cutover | `references/methodology/phases.md`, `references/methodology/cutover.md` |
| hits an AWS service you haven't mapped | `references/mappings.md` |

## Coupling checklist (Direct and Snippet mode; Step 4 of Project mode)

Check every item that applies. Each one either keeps the AWS behavior in
code or becomes a row in the Behavior changes table. Never drop one
silently.

- **Location.** An S3 bucket and a Redshift cluster live in one region;
  GCS and BigQuery offer region, dual-region, and multi-region. Keep the
  single region unless the user wants more, and say which you chose. S3
  replication (CRR) → dual-/multi-region bucket or a Storage Transfer
  job (`storage.md`).
- **Ordering.** SQS FIFO / SNS FIFO `MessageGroupId` and Kinesis
  partition keys → Pub/Sub `enable_message_ordering` with the same value
  as `ordering_key` on publish (and a regional endpoint for publishers).
  SQS FIFO deduplication → exactly-once delivery on the subscription,
  plus idempotent consumers. A failed message still blocks its key.
- **Retries and DLQ.** `maxReceiveCount` → `max_delivery_attempts`
  (5–100) with a dead-letter topic on every subscription that feeds a
  consumer, including ones you add; grant the Pub/Sub service agent
  publisher on the DLQ topic and subscriber on the source subscription.
  Lambda `ReportBatchItemFailures` / partial batch logic → per-message
  ack/nack. Lambda async retries and destinations → subscription retry
  policy and DLQ.
- **Timeouts.** SQS visibility timeout → `ack_deadline_seconds` (max
  600 s; longer work extends the deadline in the client or moves to
  Cloud Tasks / Cloud Run jobs). Lambda timeout → Cloud Run request
  timeout (event-triggered Cloud Run functions cap at 9 min). Load
  balancer backend timeout ≥ the old ALB `idle_timeout`.
- **Scaling and concurrency.** Lambda runs one request per environment;
  Cloud Run defaults to 80 per instance. Either set concurrency to 1 or
  check globals, thread safety, `/tmp` names, and DB pools. Reserved
  concurrency → `max_instance_count`; provisioned concurrency →
  `min_instance_count`. ECS desired/min/max → Cloud Run min/max.
- **Identity.** IAM roles → one service account per workload, attached
  (no key files). Access keys → none. RDS IAM auth → Cloud SQL IAM
  database authentication. S3 presigned URLs → V4 signed URLs (max 7
  days; without a key file, signing needs `iam.serviceAccounts.signBlob`
  on the runtime service account).
- **Event shape.** Rewrite handlers for the payload they now get
  (Pub/Sub push/CloudEvent with base64 `message.data` and `attributes`,
  GCS object events, Eventarc CloudEvents), not SQS `Records[]`, the SNS
  envelope, or EventBridge `detail`.
- **Schedules.** EventBridge `cron(0 2 * * ? *)` is UTC unless it is
  EventBridge Scheduler with `schedule_expression_timezone`; Cloud
  Scheduler takes five-field cron and a `time_zone`. Keep the same wall
  clock time and say which zone you used.
- **Storage features.** Versioning, lifecycle transitions and expiry
  (and noncurrent versions), storage classes and their minimum durations,
  Block Public Access → public access prevention + uniform bucket-level
  access, Object Lock → retention policy or object retention, KMS keys →
  CMEK, event notifications → Pub/Sub notifications or Eventarc.
- **Data and SQL.** Redshift/Athena SQL → GoogleSQL (`big-data-sql.md`):
  `GETDATE`/`SYSDATE`, `NVL`, `LISTAGG`, `TRY_CAST`, `approx_distinct`,
  `DATEADD`/`DATEDIFF`, `::` casts, `ILIKE`, DISTKEY/SORTKEY →
  partitioning and clustering, time zones. Say how data gets to the new
  tables.
- **Terraform that validates.** Write every block on multiple lines (a
  one-line block holds at most one argument and no nested blocks), even
  if the source uses compact one-liners. Respect GCP naming rules that
  AWS doesn't have: service account `account_id` is 6–30 characters,
  lowercase letters, digits, and hyphens, starting with a letter (AWS
  role `api` → `api-sa` or `api-runtime`); bucket names are global.
  Reference build artifacts (zips, images) the same way the source did
  and say how they get built.
- **Defaults you introduced.** Machine types, Cloud SQL tiers,
  `deletion_protection`, concurrency, health checks, new topics,
  subscriptions, or functions added as glue: anything with no AWS
  counterpart is a choice, so list it.

## Behavior changes (end of every conversion)

Finish with a table, one row per difference, including the ones you
chose. If a row is empty, write "none".

| AWS behavior | GCP now | Kept / changed / needs decision | Why |
|---|---|---|---|

## Always

- Change one thing at a time. Keep names, labels/tags, regions-of-record,
  and data formats unless the target forces a change; record each forced
  change in the unit file.
- Keep AWS running and readable until the unit has passed validation and
  has a rollback path. Never delete AWS data, buckets, tables, snapshots,
  or keys before that.
- Never run `terraform apply`, `gcloud`/`aws` commands that change state,
  or data copies without the user's go-ahead for that specific command.
- Never put secret values, access keys, key file contents, or account
  credentials in `.migration/` files or in your output. Name the secret
  instead.
- Prices, quotas, limits, and service availability change. Check any
  number you give the user against current Google Cloud documentation
  (cloud.google.com/docs) when you can fetch it, and say so when you
  can't. Send only service names and feature questions, never code,
  config, project or account IDs, or secrets.
