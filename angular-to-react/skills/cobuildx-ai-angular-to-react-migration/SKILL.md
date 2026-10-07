---
name: cobuildx-ai-angular-to-react-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize an Angular (2+) or AngularJS (1.x) app to React — full rewrites or incremental/strangler-fig migrations of any size, including hybrid ngUpgrade apps — or to continue, resume, or check the status of an Angular-to-React migration already in progress (e.g. \"continue the migration\", \"what's left to migrate\", \"why isn't Orders migrated yet\")."
metadata:
  version: "2.0.0"
---

# Angular / AngularJS → React Migration

Port an Angular or AngularJS app to React with no change in behavior or
appearance. A migration proves equivalence. Don't redesign, refactor
beyond what the framework change needs, or fix things along the way
unless the user asks.

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

1. Delegate the sweep to the `angular-inventory` agent. For an app of only
   a handful of files, you can read them directly.
2. Read `references/angular/version.md` and record which Angular this is
   (AngularJS, Angular 2–15, 16+ with signals, or hybrid).
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
   Units go leaves first and the most central pieces (app shell,
   auth/session, root store) last. Each unit must be small enough to
   validate on its own.
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
   `angular-parity-reviewer` agent.
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, read `references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| is the scaffold / first unit | `references/react/architecture.md`, `references/angular/http-config.md` |
| adds or moves a route | `references/angular/routing.md`, `references/react/routing.md` |
| has Angular (2+) components, directives, pipes, or signals | `references/angular/components.md` |
| has AngularJS controllers, `$scope`, directives, or filters | `references/angular/angularjs-1x.md` |
| touches services, DI, providers, or NgRx | `references/angular/services-di.md`, `references/react/state-data.md` |
| uses RxJS (`Observable`, `Subject`, `\| async`) | `references/angular/rxjs.md` |
| has forms (reactive, template-driven, AngularJS form controllers) | `references/angular/forms.md` |
| touches `HttpClient` / `$http` / interceptors / env / i18n / animations | `references/angular/http-config.md`, `references/react/state-data.md` |
| relies on Zone.js, `NgZone`, `$timeout`, or "wait for the view" | `references/angular/timing.md` |
| has component styles (`:host`, `::ng-deep`, encapsulation) | `references/angular/styles.md` |
| ports tests (almost every unit) | `references/angular/testing.md`, `references/react/testing.md` |
| mounts React inside Angular/AngularJS, is hybrid, or shares state across both | `references/angular/coexistence.md`, `references/react/coexistence.md` |
| writes code against a React library | `references/react/library-apis.md` |
| hits an Angular concept you haven't mapped | `references/mappings.md` |

## Always

- Change one thing at a time. Port styles and class names as they are, in
  the same pass as the logic.
- Keep existing bugs and timing oddities for parity, and list them as
  quirks in the unit file. Don't fix them silently.
- Never send app code, config, or secrets to Context7. Send only library
  names and feature questions.
- Never remove old Angular code until the unit has passed validation and
  has a rollback path.
