<!-- GENERATED from shared/methodology-backend/state-format.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# The `.migration/` folder

This folder lives in the user's repo and is committed. It is the memory of
the migration and the reason "continue the migration" works in a new
session. Create it in the Assess step. Update it at the end of every step.

```
.migration/
├── state.json        ← machine-readable progress; read first, every session
├── assessment.md     ← inventory summary (from the *-inventory agent)
├── decisions.md      ← append-only log: strategy, target stack, deviations
├── plan.md           ← units, order, dependencies; approved by the user
└── units/
    └── <unit-id>.md  ← one per unit: what changed, validation results, quirks
```

## state.json

```json
{
  "version": 1,
  "source": "cobol",
  "flavor": "gnucobol-batch",
  "strategy": "strangler-fig",
  "secondary_strategies": ["branch-by-abstraction"],
  "phase": "execute",
  "plan_approved": true,
  "next_unit": "u03-intereses",
  "units": [
    { "id": "u01-scaffold", "title": "Workspace + record codecs", "status": "done", "depends_on": [] },
    { "id": "u02-numerics", "title": "Numeric store and rounding rules", "status": "done", "depends_on": ["u01-scaffold"] },
    { "id": "u03-intereses", "title": "INTERESES monthly interest job", "status": "pending", "depends_on": ["u02-numerics"], "blocked_reason": null }
  ],
  "updated": "2026-10-07"
}
```

- `phase` is one of `assess`, `strategy`, `plan`, `execute`, or
  `complete`.
- Unit `status` is one of `pending`, `in-progress`, `needs-qa`, `done`,
  or `blocked`. If a unit is `blocked`, `blocked_reason` says why.
- A unit can start only when every unit in its `depends_on` is `done`. If
  one is `needs-qa`, ask the user first. If they agree, log that in
  `decisions.md` and go ahead.
- "Why isn't X migrated yet?" is answered from this file: X's status, its
  `depends_on`, and its `blocked_reason`.

## plan.md template

1. **Summary**: what the app is, its size, version and flavor, the chosen
   strategy, and why.
2. **Inventory highlights**: the categories and counts, plus the hidden
   wiring that matters most.
3. **Target stack**: Rust edition and toolchain, crates (decimal, database,
   HTTP, serialization, testing), where the Rust code runs, and the
   replacement for each library or runtime feature the old code relies on.
4. **Coexistence layer** (incremental only): how old and new run side by
   side, how each piece is switched, and how files, sessions, and the
   database are shared without either side changing their format.
5. **Unit map**: a table of every job step or route, its current program
   or script, its inputs and outputs, and its Rust replacement.
6. **Units**: a table with id, title, `depends_on`, and the size of each
   unit. Leaves come first and the most central pieces last. Each unit must
   be small enough to verify and ship on its own.
7. **Test plan**: the golden data each unit records, the tests it ports,
   the property tests it needs, and how its parallel run is done.
8. **Risks and quirks**: the hot spots and how each is handled, plus the
   existing bugs kept in compat mode and the fixed-mode decision for each.
9. **Rollback**: how each unit is switched back, and when old code is
   removed.
10. **Open questions**: anything the user needs to decide.

## decisions.md entry

```
## 2026-10-07 — Strategy: strangler-fig
Why: nightly batch with 14 job steps, each reads and writes files; jobs must keep running.
Rejected: full rewrite (too large, live users).
```
