---
name: cobuildx-ai-vanillajs-to-react-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize a vanilla (plain) JavaScript app or page — script-tag pages, IIFE modules, or ES-module apps that work on the DOM directly — to React, as a full rewrite or an incremental/strangler-fig migration of any size, or to continue, resume, or check the status of a vanilla-JS-to-React migration already in progress (e.g. \"continue the migration\", \"what's left to migrate\", \"why isn't Search migrated yet\")."
metadata:
  version: "1.0.0"
---

# Vanilla JS → React Migration

Port a vanilla JavaScript app to React with no change in behavior or
appearance. A migration proves equivalence. Don't redesign, refactor
beyond what the move needs, or fix things along the way unless the user
asks.

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

1. Delegate the sweep to the `vanillajs-inventory` agent. For an app of
   only a handful of files, you can read them directly.
2. Read `references/vanillajs/flavor.md` and record the module system,
   the page model, and every place the app keeps state. If jQuery does
   most of the DOM work, tell the user the `jquery-to-react` plugin fits
   better and ask before going on.
3. Write `.migration/assessment.md` and create `state.json` with
   `phase: "strategy"`.

## Step 2: Choose a strategy

1. Read `references/methodology/strategy-selection.md`. No framework owns
   the page, so `strangler-fig.md` or `vertical-slice.md` with React
   mounted into one container at a time usually fits best.
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
   The first unit moves onto a bundler
   (`references/vanillajs/config-build.md`). Then units go one page area
   at a time, leaves first; globals, page-wide listeners, and state shared
   across areas go last. Each unit must be small enough to validate on its
   own.
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
   `vanillajs-parity-reviewer` agent.
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, read `references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| is the scaffold / first unit, or moves scripts and globals onto modules | `references/react/architecture.md`, `references/vanillajs/config-build.md` |
| reads or writes state in the DOM (`textContent`, `classList`, `style.`, `.value`, `data-*`) | `references/vanillajs/dom-state.md`, `references/react/state-data.md` |
| mounts React into part of the page, or shares values with old scripts | `references/vanillajs/coexistence.md`, `references/react/coexistence.md` |
| builds markup (`innerHTML`, `createElement`, template strings) | `references/vanillajs/rendering.md` |
| has `addEventListener`, timers, `requestAnimationFrame`, or observers | `references/vanillajs/events-timing.md` |
| touches the theme, global CSS, third-party scripts, or code that runs before first paint | `references/vanillajs/outside-react.md` |
| fetches data | `references/react/state-data.md` |
| adds or moves a route or page | `references/react/routing.md` |
| ports or writes tests (almost every unit) | `references/vanillajs/testing.md`, `references/react/testing.md` |
| writes code against a React library | `references/react/library-apis.md` |
| hits a concept you haven't mapped | `references/mappings.md` |

## Always

- Change one thing at a time. Keep class names and ids as they are, so the
  CSS and the test selectors keep working.
- Once React owns a container, no old script may touch anything inside
  it. Delete the old code for an area in the same unit that hands it over.
- Keep existing bugs and quirks for parity, and list them as quirks in the
  unit file. Don't fix them silently.
- Never send app code, config, or secrets to Context7. Send only library
  names and feature questions.
- Never remove old code until the unit has passed validation and has a
  rollback path.
