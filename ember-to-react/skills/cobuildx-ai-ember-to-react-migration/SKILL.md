---
name: cobuildx-ai-ember-to-react-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize an Ember.js app (Classic or Octane) to React — full rewrites or incremental/strangler-fig migrations of any size — or to continue, resume, or check the status of an Ember-to-React migration already in progress (e.g. \"continue the migration\", \"what's left to migrate\", \"why isn't Orders migrated yet\")."
metadata:
  version: "2.0.0"
---

# Ember → React Migration

Port an Ember app to React with no change in behavior or appearance. A
migration proves equivalence. Don't redesign, refactor beyond what the
framework change needs, or fix things along the way unless the user asks.

This skill is a workflow. The detail is in `references/`. Open a reference
only when a condition below says to, and open only that file.

## Step 0: Resume or start

- If `.migration/state.json` exists, read it and
  `references/methodology/state-format.md`, then resume at its `phase`.
  - If `phase` is `execute`, continue with `next_unit`.
  - If the user asks about status ("why isn't X migrated yet"), answer
    from `state.json` and `plan.md` and change nothing.
- If it doesn't exist, read `references/methodology/state-format.md` and
  start at Step 1.

## Step 1: Assess

1. Delegate the sweep to the `ember-inventory` agent. For an app of only a
   handful of files, you can read them directly.
2. Read `references/ember/flavor.md` and record the version and flavor.
3. Write `.migration/assessment.md` and create `state.json` with
   `phase: "strategy"`.

## Step 2: Choose a strategy

1. Read `references/methodology/strategy-selection.md`.
2. Pick one strategy, then read **only** that strategy's file:
   `references/methodology/strangler-fig.md`,
   `references/methodology/branch-by-abstraction.md`,
   `references/methodology/vertical-slice.md`, or
   `references/methodology/cutover.md`.
3. If you can't tell whether real users depend on the app, ask the user
   before choosing.
4. Log the choice and the reason in `.migration/decisions.md` and set
   `phase: "plan"`.

## Step 3: Plan (the only approval point)

1. Read `references/mappings.md` and `references/react/architecture.md`.
   Read `references/react/library-apis.md` before choosing library
   versions.
2. Write `.migration/plan.md` using the template in `state-format.md`.
   Units go leaves first and the most central pieces last. Each unit must
   be small enough to validate on its own.
3. Fill `units` in `state.json`, then **stop and ask the user to approve
   the plan.** Once they approve, set `plan_approved: true` and
   `phase: "execute"`.

## Step 4: Execute one unit, then stop

1. Take `next_unit`, check that its `depends_on` units are `done`, and set
   it to `in-progress`.
2. Read the references the routing table below gives for what this unit
   contains.
3. Build it, integrate it with the coexistence layer or the new app, and
   port its tests.
4. Validate it with `references/methodology/validation.md`, including the
   `ember-parity-reviewer` agent.
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, read `references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| is the scaffold / first unit | `references/react/architecture.md`, `references/ember/addons-initializers.md` |
| adds or moves a route | `references/ember/routing.md`, `references/react/routing.md` |
| has Glimmer / Octane components | `references/ember/components-octane.md` |
| has Classic components (`Component.extend`) | `references/ember/components-classic.md` |
| touches services, mixins, observers, or helpers | `references/ember/services-mixins.md`, `references/react/state-data.md` |
| uses Ember Data (`this.store`, models, adapters, serializers) | `references/ember/ember-data.md`, `references/react/state-data.md` |
| has `task(` / Ember Concurrency | `references/ember/ember-concurrency.md` |
| has `run.next` / `later` / `schedule(` / debounce | `references/ember/runloop-timing.md` |
| uses an `ember-*` addon or initializer | `references/ember/addons-initializers.md` |
| ports tests (almost every unit) | `references/ember/testing-qunit-mirage.md`, `references/react/testing.md` |
| mounts React inside Ember, or shares state across both | `references/ember/coexistence.md`, `references/react/coexistence.md` |
| writes code against a React library | `references/react/library-apis.md` |
| hits an Ember concept you haven't mapped | `references/mappings.md` |

## Always

- Change one thing at a time. Port styles and class names as they are, in
  the same pass as the logic.
- Keep existing bugs and timing oddities for parity, and list them as
  quirks in the unit file. Don't fix them silently.
- Never send app code, config, or secrets to Context7. Send only library
  names and feature questions.
- Never remove old Ember code until the unit has passed validation and
  has a rollback path.
