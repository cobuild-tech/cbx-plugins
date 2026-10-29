---
name: cobuildx-ai-gcp-to-aws-migration
description: "Use when the user asks to convert or translate Google Cloud (GCP) code or configuration to AWS — Terraform with google_* resources, gcloud commands, app.yaml, Cloud Run or Cloud Functions code, Pub/Sub handlers, BigQuery SQL, Dataproc or Dataflow jobs, Composer DAGs, or google-cloud SDK calls, or \"what would this look like on AWS\" — or to migrate, move, or re-platform GCP workloads to AWS: Compute Engine, GKE, GPUs/TPUs, Cloud Run, Cloud Functions, App Engine, Eventarc, Cloud Tasks, Cloud Scheduler, Workflows, BigQuery, Dataproc, Dataflow, Pub/Sub, Composer, Cloud Storage, Persistent Disk, or Filestore. Also use to continue, resume, or check the status of a GCP-to-AWS migration already in progress (e.g. \"continue the migration\", \"what's left to move\", \"why isn't the orders bucket migrated yet\"), and for planning, scoping, sizing, or estimating the cost of a move off GCP."
metadata:
  version: "1.0.0"
---

# GCP → AWS Migration

Move GCP workloads to AWS with no change in behavior. A migration proves
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
  or `storage.md`; add `big-data-sql.md` for BigQuery SQL). Return the AWS
  version (Terraform, SDK code, handler, or SQL), then a short list of
  behavior differences and anything the snippet depends on that you
  couldn't see (service accounts, networks, callers). Don't create
  `.migration/` or run the inventory agent. End with one line: "For a
  whole-project migration, open the repo in Claude Code and run
  `/gcp-to-aws:plan`."
- **Project mode.** Use this for a whole project, an area of it, or an
  existing `.migration/`. Follow Steps 0–4. Before starting Step 1 on a
  repo with no `.migration/`, tell the user in one sentence what happens
  next: an inventory and a plan for their approval, with nothing changed
  in either cloud.

## Step 0: Resume or start

- If `.migration/state.json` exists, read it and
  `references/methodology/state-format.md`, then resume at its `phase`.
  - If `phase` is `execute`, continue with `next_unit`.
  - If the user asks about status ("why isn't X migrated yet"), answer
    from `state.json` and `plan.md` and change nothing.
- If it doesn't exist, read `references/methodology/state-format.md` and
  start at Step 1.

## Step 1: Assess

1. Delegate the sweep to the `gcp-inventory` agent (if your tool has no
   such agent, follow `../../agents/gcp-inventory.md` yourself). For a
   project of only a handful of files, you can read them directly.
2. If the repo shows only part of the estate (no IaC, or IaC for some
   services only), say so and ask the user for a resource export
   (`gcloud asset search-all-resources` output, billing export, or a list).
   Don't guess what isn't in front of you.
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
   Unit 1 is always the AWS base (accounts, network, IAM, limits, link to
   GCP). Then a pilot: one small workload end to end. Then waves:
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
3. Write the AWS code: IaC in the format the repo already uses (Terraform
   by default), application code changes, and pipeline or config changes.
   Show any command that creates, changes, or deletes cloud resources, and
   run it only after the user says to.
4. Validate it with `references/methodology/validation.md`, including the
   `aws-parity-reviewer` agent (if your tool has no such agent, follow
   `../../agents/aws-parity-reviewer.md` yourself).
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, follow the decommission section of
`references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| has VMs, instance templates, MIGs, sole-tenant, Batch, GPUs, TPUs, or Bare Metal | `references/compute.md` |
| has GKE (Standard or Autopilot) | `references/compute.md`, `references/networking.md` |
| has Cloud Run, Cloud Functions, App Engine, API Gateway, Eventarc, Cloud Tasks, Cloud Scheduler, or Workflows | `references/serverless.md` |
| has BigQuery, Dataproc, Dataflow, Pub/Sub, Composer, Data Fusion, Datastream, Dataplex, or Bigtable | `references/big-data.md` |
| converts BigQuery SQL, views, or scheduled queries | `references/big-data-sql.md` |
| has Cloud Storage buckets, Persistent Disk, Hyperdisk, Local SSD, Filestore, NetApp Volumes, or Backup and DR | `references/storage.md` |
| uses a service account, key file, secret, or IAM binding | `references/iam-identity.md` |
| touches VPCs, firewall rules, load balancers, DNS, NAT, or the GCP↔AWS link | `references/networking.md` |
| sizes instances, buys commitments, raises quotas, or moves data out of GCP | `references/cost-limits.md` |
| is the base unit or a cutover | `references/methodology/phases.md`, `references/methodology/cutover.md` |
| hits a GCP service you haven't mapped | `references/mappings.md` |

## Always

- Change one thing at a time. Keep names, labels/tags, regions-of-record,
  and data formats unless the target forces a change; record each forced
  change in the unit file.
- Keep GCP running and readable until the unit has passed validation and
  has a rollback path. Never delete GCP data, buckets, datasets, or keys
  before that.
- Never run `terraform apply`, `aws`/`gcloud` commands that change state,
  or data copies without the user's go-ahead for that specific command.
- Never put secret values, key file contents, or account credentials in
  `.migration/` files or in your output. Name the secret instead.
- Prices, quotas, and service availability change. Check any number you
  give the user against current AWS documentation (the `aws-knowledge` MCP
  server, if connected). Send it only service names and feature
  questions, never code, config, account IDs, or secrets.
