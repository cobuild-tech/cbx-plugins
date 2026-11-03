---
name: cobuildx-ai-ember-to-react-migration
description: "Use when the user asks to convert or translate Ember.js code to React — a single component, template, route, controller, service, model, or helper, pasted Ember code with a request for React, or \"what would this look like in React\" — or to migrate, port, rewrite, or modernize an Ember.js app (Classic or Octane) to React — full rewrites or incremental/strangler-fig migrations of any size — or to continue, resume, or check the status of an Ember-to-React migration already in progress (e.g. \"continue the migration\", \"what's left to migrate\", \"why isn't Orders migrated yet\"). Also use for planning, scoping, or estimating a move off Ember, and for requests to upgrade, modernize, or replace Ember with React. Also use for requests to rewrite, rebuild, or replace an Ember component, form, or route template with React."
metadata:
  version: "2.2.0"
---

# Ember → React Migration

Port an Ember app to React with no change in behavior or appearance. A
migration proves equivalence. Don't redesign, refactor beyond what the
framework change needs, or fix things along the way unless the user asks.

This skill is a workflow. The detail is in `references/`. Open a reference
only when a condition below says to, and open only that file.

## Pick a mode

- **Snippet mode.** Use this when there's no repo to work in (Claude.ai or
  Cowork chat without a project folder), or the user pasted code or asked
  about one component or a few files. Convert the code directly: read
  `references/mappings.md` and only the one file in `references/ember/` that
  matches the code. Return the React code, then a short list of behavior
  differences and anything the snippet depends on that you couldn't see.
  Don't create `.migration/` or run the inventory agent. End with one line:
  "For a whole-app migration, open the repo in Claude Code and run
  `/ember-to-react:plan`."
- **Direct mode.** Use this when you are in a repo and the user asks you
  to convert a specific component, route, or file now, rather than plan a migration. Don't
  create `.migration/` and don't stop for approval. Do this, in order:
  1. Read the files you are converting, then read **every** reference the
     routing table below gives for what that code contains. This is not
     optional; most of the parity rules live there.
  2. Search the **rest of the repo** for code that touches the area or
     that it relies on, using the coupling checklist under "Always". Read
     each hit. Ember code that stays behind is where migrations break.
  3. Convert, mount React where the old code ran (remove the old component from the template, or pass the Ember service into React), and change
     the remaining Ember code only as far as the handover needs.
  4. Reply with what you changed and a **Behavior differences** list
     covering every difference you introduced or could not rule out,
     including request mechanics and timing. Say "none" only if you
     checked.
- **Project mode.** Use this for a whole app, an area of it, or an
  existing `.migration/`. Follow Steps 0–4. Before starting Step 1 on a
  repo with no `.migration/`, tell the user in one sentence what happens
  next: an inventory and a plan for their approval, with no app code
  changed.

## Step 0: Resume or start

- If `.migration/state.json` exists, read it and
  `references/methodology/state-format.md`, then resume at its `phase`.
  - If `phase` is `execute`, continue with `next_unit`.
  - If the user asks about status ("why isn't X migrated yet"), answer
    from `state.json` and `plan.md` and change nothing.
- If it doesn't exist, read `references/methodology/state-format.md` and
  start at Step 1.

## Step 1: Assess

1. Delegate the sweep to the `ember-inventory` agent (if your tool has no such agent, follow `../../agents/ember-inventory.md` yourself). For an app of only a
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
   `ember-parity-reviewer` agent (if your tool has no such agent, follow `../../agents/ember-parity-reviewer.md` yourself).
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

- **Coupling checklist.** Before handing an area to React, check the
  whole repo, not just the files you are converting, for:
  - other code that reads the same records from the Ember Data store
    (`peekAll`, `peekRecord`, relationships, store-backed getters); data
    fetched outside the store is invisible to them;
  - timing that tests wait on: `settled()` waits for the run loop
    (`later`, `next`, `debounce`), Ember Concurrency, and registered test
    waiters, but not for plain `setTimeout` or `fetch` unless you register
    a waiter (`@ember/test-waiters`);
  - the router while it still owns routing: query params,
    `refreshModel`, loading and error substates, and `transitionTo`; URL
    state must go through the Ember router, not React state or
    `history.pushState`;
  - services, tracked state, and actions (`@onX`) other components share;
  - CSS and tests that depend on element structure; mounting React adds a
    wrapper element, which breaks `>` and `:first-child` selectors;
  - teardown: the React root must unmount in `willDestroy` or a
    modifier's cleanup.
  Keep each one working, or list it under Behavior differences.
- Change one thing at a time. Port styles and class names as they are, in
  the same pass as the logic.
- Keep existing bugs and timing oddities for parity, and list them as
  quirks in the unit file. Don't fix them silently.
- Never send app code, config, or secrets to Context7. Send only library
  names and feature questions.
- Never remove old Ember code until the unit has passed validation and
  has a rollback path.
