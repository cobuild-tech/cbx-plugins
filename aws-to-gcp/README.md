# aws-to-gcp

A Claude skill by CobuildX for migrating AWS workloads to Google Cloud (GCP): compute, EKS, serverless, big data, and storage.

## Quick start

Where it works:

- **Claude Code, or Cowork with your project folder:** full migrations of a repo (Terraform, configs, and application code).
- **Claude.ai and any chat:** paste AWS Terraform, CloudFormation, config, SQL, or SDK code and ask for the GCP version.

For a full migration:

1. Install the plugin (see [Install](#install)).
2. Open your repo in Claude Code.
3. Run `/aws-to-gcp:plan`. It writes a plan to `.migration/` and changes nothing in either cloud until you approve.

Try asking:

- "Convert this Lambda + SQS Terraform to GCP" (then paste it)
- "What would this SQS handler look like on Cloud Run with Pub/Sub?"
- "Translate this Redshift query to BigQuery"
- "Plan a migration of this AWS account to GCP"

## What it does

The `cobuildx-ai-aws-to-gcp-migration` skill guides Claude through moving AWS workloads to GCP with no change in behavior. It picks a GCP target for each service with explicit decision rules, flags the differences that cause outages (requests per instance, timeouts, ack deadlines, event formats, storage minimum durations, SQL dialect, identity), plans the move in waves, and validates each unit before AWS is switched off.

When you ask it to convert a repo in one session, it walks a coupling checklist (location, ordering, retries, timeouts, scaling, identity, event formats, schedules, storage features, SQL) against every resource and ends with a **Behavior changes** table, so every difference is either kept in code or stated. See an [example](examples/orders-platform.md).

| Area | Covers |
|---|---|
| Compute | EC2, Auto Scaling, Spot, Dedicated Hosts, EKS (node groups, Karpenter, Auto Mode, Fargate), GPUs, Inferentia/Trainium, AWS Batch |
| Serverless | Lambda, ECS/Fargate, App Runner, Elastic Beanstalk, API Gateway, EventBridge and Scheduler, SQS, SNS, Step Functions, Secrets Manager / SSM |
| Big data | Redshift and Athena (and their SQL), Glue, EMR, Kinesis, Firehose, MSK, MWAA, DMS, Lake Formation, SageMaker, DynamoDB |
| Storage | S3 classes and features, EBS, instance store, EFS, FSx, AWS Backup, data transfer |
| Cross-cutting | IAM roles to service accounts, networking, cost and commitments, egress, quotas, cutover, rollback |

## Tested

Measured on the [orders-platform eval case](../evals/cases/aws-to-gcp/01-orders-platform): a small AWS app (Terraform, Python, Athena SQL) with SQS FIFO and a dead-letter queue, Lambda API and worker, RDS with IAM auth, S3 lifecycle, and a time-zoned schedule. Claude Sonnet converted it to GCP with the plugin loaded, three runs, each graded against 14 pre-registered pass/fail criteria by a blind judge. The generated Terraform was checked offline with `terraform validate` (Google provider, no credentials).

| Plugin version | Criteria passed | Skill triggered | `terraform validate` |
|---|---|---|---|
| 1.0.1 | **100% (42/42)** | 3/3 | **3/3 PASS** |
| 1.0.0 | 95% (40/42) | 3/3 | 1/3 PASS |

1.0.0 failures were invalid HCL (one-line nested blocks), a too-short service account ID, and a string partition filter changed to a date comparison; 1.0.1 added rules for each. Per-criterion results: [`evals/RESULTS-aws-to-gcp.md`](../evals/RESULTS-aws-to-gcp.md). One case and three runs is a small sample: it shows the checklist holds on a realistic app, not that every migration will be clean.

## What's included

| Component | Name | What it does |
|---|---|---|
| Skill | `cobuildx-ai-aws-to-gcp-migration` | The migration workflow: assess, choose targets, plan, then migrate one unit per run. Detailed guidance is in reference files that load only when needed. Triggers on "move this to GCP" and on "continue the migration". |
| Command | `/aws-to-gcp:plan [path]` | Runs assess, target selection, and plan, writes `.migration/`, and stops for your approval. Changes nothing in either cloud. |
| Agent | `aws-inventory` | Read-only sweep of IaC (Terraform, CloudFormation, SAM, CDK), configs, and code that returns a structured inventory of AWS resources and hidden AWS references. |
| Agent | `gcp-parity-reviewer` | Read-only comparison of a migrated unit against its AWS original: permissions, exposure, limits, concurrency, events, data, and storage behavior. |

## How a migration runs

The skill keeps its progress in a `.migration/` folder in your repo. Commit it, because it lets a migration continue across sessions:

```
.migration/
├── state.json      progress: phase, units, waves, their status, next unit
├── assessment.md   inventory of the AWS estate
├── decisions.md    target choices, with reasons
├── plan.md         units and waves, with dependencies (you approve this)
└── units/<id>.md   what each unit changed, validation results, rollback path
```

1. **Assess**: inventory the AWS resources and code.
2. **Choose targets**: one GCP target per service, each with a recorded reason.
3. **Plan**: base, pilot, then waves. Stop for your approval.
4. **Execute**: migrate and validate **one unit**, update the state, and stop. Say "continue the migration" to run the next one.

Claude never runs `terraform apply`, state-changing `gcloud`/`aws` commands, or data copies without your go-ahead for that command, and never deletes anything on AWS before a unit is validated.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install aws-to-gcp@cbx-plugins
```

In VS Code with GitHub Copilot, add the marketplace to your user settings, reload the window, then search `@agentPlugins` in the Extensions view and install **aws-to-gcp**:

```json
"chat.plugins.enabled": true,
"chat.plugins.marketplaces": ["cobuild-tech/cbx-plugins"]
```

In GitHub Copilot CLI:

```
copilot plugin marketplace add cobuild-tech/cbx-plugins
copilot plugin install aws-to-gcp@cbx-plugins
```

## Data handling

The skill contains instructions only and bundles no MCP server. Its only output besides your migrated code is the `.migration/` folder in your own repo, and nothing is sent anywhere else. When Claude checks a number against Google Cloud's public documentation, the skill instructs it to send only service names and feature questions, never your source code, configuration, project or account IDs, secrets, or business data.

CobuildX privacy policy: https://cobuildx.ai/privacy

## Open source, independent of CobuildX services

This plugin is free, MIT-licensed open source, and complete on its own. It is not a trial, demo, or lead-in for any paid offering: it has no upsell, sign-up, license key, usage limit, or "contact us" step, and nothing in it collects contact details or calls CobuildX servers. CobuildX also offers migration consulting as a separate business, and this plugin does not reference or depend on it.

## Support

Report problems or request features in [GitHub Issues](https://github.com/cobuild-tech/cbx-plugins/issues), or email hello@cobuildx.ai.

Terms of service: https://cobuildx.ai/terms

## License

MIT — see [LICENSE](LICENSE).
