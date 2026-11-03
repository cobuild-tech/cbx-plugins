---
name: plan
description: Inventory this GCP project and write a migration plan to AWS in .migration/ — target map, base setup, units and waves, data movement, validation, cutover, and cost. Changes nothing in either cloud.
argument-hint: "[optional: path or area to plan, e.g. infra/ or the data platform]"
allowed-tools: Read, Grep, Glob, Agent, Write
---

Plan a GCP → AWS migration for: $ARGUMENTS

If no path or area was given, plan for the whole repo in the current
directory.

Run Steps 0–3 of the `cobuildx-ai-gcp-to-aws-migration` skill: resume or
start, Assess, choose targets, and Plan. Then **stop at plan approval**.
Don't run Step 4.

- Write only inside `.migration/`. Never create, edit, or delete app or
  infrastructure files, and never run `gcloud`, `aws`, or `terraform`.
- If `.migration/state.json` already exists with an approved plan, don't
  overwrite it. Show the current plan and progress, and ask whether the
  user wants to re-plan.
- End by summarizing the target map and the unit list by wave, and ask
  the user to approve. After approval, they say "continue the migration"
  to run the first unit.
