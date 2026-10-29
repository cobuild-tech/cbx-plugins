# gcp-to-aws

A Claude skill by CobuildX for migrating Google Cloud (GCP) workloads to AWS: compute, GKE, serverless, big data, and storage.

## Quick start

Where it works:

- **Claude Code, or Cowork with your project folder:** full migrations of a repo (Terraform, configs, and application code).
- **Claude.ai and any chat:** paste GCP Terraform, config, SQL, or SDK code and ask for the AWS version.

For a full migration:

1. Install the plugin (see [Install](#install)).
2. Open your repo in Claude Code.
3. Run `/gcp-to-aws:plan`. It writes a plan to `.migration/` and changes nothing in either cloud until you approve.

Try asking:

- "Convert this Cloud Run Terraform to AWS" (then paste it)
- "What would this Pub/Sub handler look like on Lambda?"
- "Translate this BigQuery query to Redshift"
- "Plan a migration of this GCP project to AWS"

## What it does

The `cobuildx-ai-gcp-to-aws-migration` skill guides Claude through moving GCP workloads to AWS with no change in behavior. It picks an AWS target for each service with explicit decision rules, flags the differences that cause outages (requests per instance, timeouts, event formats, cold storage retrieval, SQL time zones, identity), plans the move in waves, and validates each unit before GCP is switched off.

| Area | Covers |
|---|---|
| Compute | Compute Engine, MIGs, Spot, sole-tenant, GKE Standard and Autopilot, GPUs, TPUs, Batch, Bare Metal |
| Serverless | Cloud Run services and jobs, Cloud Functions, App Engine, API Gateway, Eventarc, Pub/Sub push, Cloud Tasks, Cloud Scheduler, Workflows, Secret Manager |
| Big data | BigQuery (and its SQL), Dataproc, Dataflow, Pub/Sub, Composer, Data Fusion, Datastream, Dataplex, BigQuery ML, Bigtable |
| Storage | Cloud Storage classes and features, Persistent Disk, Hyperdisk, Local SSD, Filestore, NetApp Volumes, Backup and DR, data transfer |
| Cross-cutting | IAM and service accounts, networking, cost and commitments, egress, quotas, cutover, rollback |

## What's included

| Component | Name | What it does |
|---|---|---|
| Skill | `cobuildx-ai-gcp-to-aws-migration` | The migration workflow: assess, choose targets, plan, then migrate one unit per run. Detailed guidance is in reference files that load only when needed. Triggers on "move this to AWS" and on "continue the migration". |
| Command | `/gcp-to-aws:plan [path]` | Runs assess, target selection, and plan, writes `.migration/`, and stops for your approval. Changes nothing in either cloud. |
| Agent | `gcp-inventory` | Read-only sweep of IaC, configs, and code that returns a structured inventory of GCP resources and hidden GCP references. |
| Agent | `aws-parity-reviewer` | Read-only comparison of a migrated unit against its GCP original: permissions, exposure, limits, events, data, and storage behavior. |
| MCP server | `aws-knowledge` | Looks up current AWS documentation, service availability, and limits. |

## How a migration runs

The skill keeps its progress in a `.migration/` folder in your repo. Commit it, because it lets a migration continue across sessions:

```
.migration/
├── state.json      progress: phase, units, waves, their status, next unit
├── assessment.md   inventory of the GCP estate
├── decisions.md    target choices, with reasons
├── plan.md         units and waves, with dependencies (you approve this)
└── units/<id>.md   what each unit changed, validation results, rollback path
```

1. **Assess**: inventory the GCP resources and code.
2. **Choose targets**: one AWS target per service, each with a recorded reason.
3. **Plan**: base, pilot, then waves. Stop for your approval.
4. **Execute**: migrate and validate **one unit**, update the state, and stop. Say "continue the migration" to run the next one.

Claude never runs `terraform apply`, state-changing `aws`/`gcloud` commands, or data copies without your go-ahead for that command, and never deletes anything on GCP before a unit is validated.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install gcp-to-aws@cbx-plugins
```

In VS Code with GitHub Copilot, add the marketplace to your user settings, reload the window, then search `@agentPlugins` in the Extensions view and install **gcp-to-aws**:

```json
"chat.plugins.enabled": true,
"chat.plugins.marketplaces": ["cobuild-tech/cbx-plugins"]
```

In GitHub Copilot CLI:

```
copilot plugin marketplace add cobuild-tech/cbx-plugins
copilot plugin install gcp-to-aws@cbx-plugins
```

## Bundled MCP server

This plugin connects to the [AWS Knowledge MCP server](https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server) (`https://knowledge-mcp.global.api.aws`), a remote server run by AWS, so Claude can check current AWS documentation, regional availability, and limits before giving numbers. It needs no install, AWS account, or API key. To turn it off, disable `aws-knowledge` with `/mcp` in Claude Code.

## Data handling

The skill contains instructions only. Its only output besides your migrated code is the `.migration/` folder in your own repo, and nothing is sent anywhere else. The bundled AWS Knowledge server receives service names and documentation questions (for example "EventBridge Scheduler time zones"); the skill instructs Claude never to send your source code, configuration, account IDs, secrets, or business data to it. AWS's handling of those queries is covered by AWS's own privacy notice (https://aws.amazon.com/privacy/).

CobuildX privacy policy: https://cobuildx.ai/privacy

## Open source, independent of CobuildX services

This plugin is free, MIT-licensed open source, and complete on its own. It is not a trial, demo, or lead-in for any paid offering: it has no upsell, sign-up, license key, usage limit, or "contact us" step, and nothing in it collects contact details or calls CobuildX servers. CobuildX also offers migration consulting as a separate business, and this plugin does not reference or depend on it.

## Support

Report problems or request features in [GitHub Issues](https://github.com/cobuild-tech/cbx-plugins/issues), or email hello@cobuildx.ai.

Terms of service: https://cobuildx.ai/terms

## License

MIT — see [LICENSE](LICENSE).
