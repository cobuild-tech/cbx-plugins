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
  "source": "ember",
  "flavor": "octane",
  "strategy": "strangler-fig",
  "secondary_strategies": ["branch-by-abstraction"],
  "phase": "execute",
  "plan_approved": true,
  "next_unit": "u03-orders-list",
  "units": [
    { "id": "u01-scaffold", "title": "Scaffold + proxy + shared auth", "status": "done", "depends_on": [] },
    { "id": "u02-helpers", "title": "Helpers and formatters", "status": "done", "depends_on": ["u01-scaffold"] },
    { "id": "u03-orders-list", "title": "/orders list page", "status": "pending", "depends_on": ["u02-helpers"], "blocked_reason": null }
  ],
  "updated": "2026-10-07"
}
```

- `phase` is one of `assess`, `strategy`, `plan`, `execute`, or
  `complete`.
- Unit `status` is one of `pending`, `in-progress`, `needs-qa`, `done`,
  or `blocked`. If a unit is `blocked`, `blocked_reason` says why.
- "Why isn't X migrated yet?" is answered from this file: X's status, its
  `depends_on`, and its `blocked_reason`.

## plan.md template

1. **Summary**: what the app is, its size, version and flavor, the chosen
   strategy, and why.
2. **Inventory highlights**: the categories and counts, plus the hidden
   wiring that matters most.
3. **Target stack**: React version, router, data fetching, state, forms,
   styling, test tools, and the replacement for each framework-specific
   dependency.
4. **Coexistence layer** (incremental only): how the two apps run side by
   side, and how session, URLs, and shared data cross between them.
5. **Route map**: a table of every URL, its current handler, and its React
   route.
6. **Units**: a table with id, title, `depends_on`, and the size of each
   unit. Leaves come first and the most central pieces last. Each unit must
   be small enough to verify and ship on its own.
7. **Test plan**: which tests each unit ports, the characterization tests
   still needed, and how each unit is verified.
8. **Risks and quirks**: the hot spots and how each is handled, plus the
   existing bugs to keep for parity.
9. **Rollback**: how each unit is switched back, and when old code is
   removed.
10. **Open questions**: anything the user needs to decide.

## decisions.md entry

```
## 2026-10-07 — Strategy: strangler-fig
Why: live app, 42 routes, nginx in front, feature work continues.
Rejected: full rewrite (too large, live users).
```
