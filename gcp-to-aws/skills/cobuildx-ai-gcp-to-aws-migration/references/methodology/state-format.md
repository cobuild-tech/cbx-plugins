# The `.migration/` folder

This folder lives in the user's repo and is committed. It is the memory of
the migration and the reason "continue the migration" works in a new
session. Create it in the Assess step. Update it at the end of every step.

```
.migration/
├── state.json        ← machine-readable progress; read first, every session
├── assessment.md     ← inventory summary (from the gcp-inventory agent)
├── decisions.md      ← append-only log: targets, regions, accounts, deviations
├── plan.md           ← units, waves, dependencies; approved by the user
└── units/
    └── <unit-id>.md  ← one per unit: what changed, validation results, rollback
```

Never write secret values, key file contents, or credentials into these
files. Name the secret or file instead.

## state.json

```json
{
  "version": 1,
  "source": "gcp",
  "target": "aws",
  "aws_regions": ["us-east-1"],
  "iac": "terraform",
  "phase": "execute",
  "plan_approved": true,
  "next_unit": "u03-reports-bucket",
  "units": [
    { "id": "u01-base", "title": "Accounts, VPCs, IAM, quotas, GCP link", "area": "base", "wave": 0, "status": "done", "depends_on": [] },
    { "id": "u02-pilot-thumbnailer", "title": "Pilot: thumbnailer function + bucket", "area": "serverless", "wave": 0, "status": "done", "depends_on": ["u01-base"] },
    { "id": "u03-reports-bucket", "title": "gs://reports → s3://reports-prod", "area": "storage", "wave": 1, "status": "pending", "depends_on": ["u01-base"], "blocked_reason": null }
  ],
  "updated": "2026-10-29"
}
```

- `phase` is one of `assess`, `strategy`, `plan`, `execute`, or
  `complete`.
- `area` is one of `base`, `compute`, `serverless`, `big-data`,
  `storage`, or `cutover`.
- Unit `status` is one of `pending`, `in-progress`, `synced` (built and
  data in sync, traffic still on GCP), `needs-qa`, `done` (traffic on AWS
  and validated), or `blocked`. If a unit is `blocked`, `blocked_reason`
  says why.
- A unit can start only when every unit in its `depends_on` is `done`. If
  one is `needs-qa`, ask the user first. If they agree, log that in
  `decisions.md` and go ahead.
- "Why isn't X migrated yet?" is answered from this file: X's status, its
  `depends_on`, and its `blocked_reason`.

## plan.md template

1. **Summary**: what the GCP estate is (projects, regions, main
   services, rough monthly cost if known), the target regions and account
   layout, and the overall approach.
2. **Inventory highlights**: counts per area, plus the hidden GCP
   references and identity wiring that matter most.
3. **Target map**: a table of every GCP resource or group, its AWS
   target, and the reason (from each area file's "Decide in order").
4. **Base**: account structure, VPC/CIDR plan, IAM approach, the
   GCP↔AWS link, quotas to raise, observability.
5. **Units and waves**: a table with id, title, area, wave, `depends_on`,
   size, and downtime expected. Wave 0 is base and pilot.
6. **Data movement**: per bucket, dataset, or share: size, method, sync
   approach, freeze window.
7. **Validation**: how each unit is proven equivalent
   (`methodology/validation.md`).
8. **Cutover and rollback**: per unit, how traffic moves and how it moves
   back (`methodology/cutover.md`).
9. **Cost**: pricing-model changes that matter, egress plan (exit
   program), when to buy commitments.
10. **Risks and open questions**: anything the user needs to decide.

## decisions.md entry

```
## 2026-10-29 — api (Cloud Run) → ECS Express Mode
Why: steady traffic, 80 concurrent requests per instance, Postgres pool.
Rejected: Lambda (one request per environment would multiply DB connections).
```

## units/<id>.md

What was built (files and resources), behavior differences accepted,
validation results (counts, checksums, query diffs, error rates), the
parity reviewer's report, cutover time, the rollback path, and what was
deleted on GCP and when.
