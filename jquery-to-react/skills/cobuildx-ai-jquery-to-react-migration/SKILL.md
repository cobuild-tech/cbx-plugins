---
name: cobuildx-ai-jquery-to-react-migration
description: "Use when the user asks to convert or translate jQuery code to React — a single page, widget, plugin, event handler, or AJAX call, pasted jQuery code with a request for React, or \"what would this look like in React\" — or to migrate, port, rewrite, or modernize a jQuery app or page (including jQuery plugins, jQuery UI, and server-rendered pages enhanced with jQuery) to React — full rewrites or incremental/strangler-fig migrations of any size — or to continue, resume, or check the status of a jQuery-to-React migration already in progress (e.g. \"continue the migration\", \"what's left to migrate\", \"why isn't Checkout migrated yet\"). Also use for planning, scoping, or estimating a move off jQuery, and for requests to upgrade, modernize, or replace jQuery with React."
metadata:
  version: "1.2.0"
---

# jQuery → React Migration

Port a jQuery app to React with no change in behavior or appearance. A
migration proves equivalence. Don't redesign, refactor beyond what the
framework change needs, or fix things along the way unless the user asks.

This skill is a workflow. The detail is in `references/`. Open a reference
only when a condition below says to, and open only that file.

## Pick a mode

- **Snippet mode.** Use this when there's no repo to work in (Claude.ai or
  Cowork chat without a project folder), or the user pasted code or asked
  about one page or a few files. Convert the code directly: read
  `references/mappings.md` and only the one file in `references/jquery/` that
  matches the code. Return the React code, then a short list of behavior
  differences and anything the snippet depends on that you couldn't see.
  Don't create `.migration/` or run the inventory agent. End with one line:
  "For a whole-app migration, open the repo in Claude Code and run
  `/jquery-to-react:plan`."
- **Direct mode.** Use this when you are in a repo and the user asks you
  to convert a specific page, widget, or file now, rather than plan a
  migration. Don't create `.migration/` and don't stop for approval. Do
  this, in order:
  1. Read the files you are converting, then read **every** reference the
     routing table below gives for what that code contains. This is not
     optional; most of the parity rules live there.
  2. Search the **rest of the repo** for code that touches the area or
     that it relies on, using the coupling checklist under "Always". Read
     each hit. jQuery code that stays behind is where migrations break.
  3. Convert, mount React into the page, and change the remaining jQuery
     code only as far as the handover needs (for example, delete or scope
     a delegated handler, or exclude the React container from a page-wide
     plugin initializer).
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

1. Delegate the sweep to the `jquery-inventory` agent (if your tool has no such agent, follow `../../agents/jquery-inventory.md` yourself). For an app of
   only a handful of files, you can read them directly.
2. Read `references/jquery/flavor.md` and record the jQuery version, how
   it is loaded, the plugin list, and whether pages are server-rendered.
   If the app is really a Backbone or Marionette app, tell the user the
   `backbone-to-react` plugin fits better and ask before going on.
3. Write `.migration/assessment.md` and create `state.json` with
   `phase: "strategy"`.

## Step 2: Choose a strategy

1. Read `references/methodology/strategy-selection.md`. jQuery never owns
   the whole page, so `strangler-fig.md` or `vertical-slice.md` with
   React mounted into one container at a time usually fits best.
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
   The first unit bundles jQuery (`references/jquery/config-build.md`).
   Then units go one page area at a time, leaves first; shared variables,
   global handlers on `document`, and plugins used everywhere go last.
   Each unit must be small enough to validate on its own.
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
   `jquery-parity-reviewer` agent (if your tool has no such agent, follow `../../agents/jquery-parity-reviewer.md` yourself).
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, read `references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| is the scaffold / first unit, or moves jQuery off a `<script>` tag | `references/react/architecture.md`, `references/jquery/config-build.md` |
| mounts React into part of a jQuery page, or passes values between the two | `references/jquery/coexistence.md`, `references/react/coexistence.md` |
| has handlers that update shared variables or the DOM by hand (`.html(`, `.addClass(`, `.val(`, `.prop(`) | `references/jquery/handlers-state.md`, `references/react/state-data.md` |
| uses a jQuery plugin or jQuery UI widget | `references/jquery/plugins.md` |
| uses `$.ajax`, `$.getJSON`, `$.Deferred`, or effects (`.fadeIn`, `.animate`) | `references/jquery/ajax-animation.md`, `references/react/state-data.md` |
| moves markup, templates, or CSS | `references/jquery/markup-styles.md` |
| adds or moves a route or page | `references/react/routing.md` |
| ports or writes tests (almost every unit) | `references/jquery/testing.md`, `references/react/testing.md` |
| writes code against a React library | `references/react/library-apis.md` |
| hits a jQuery concept you haven't mapped | `references/mappings.md` |

## Always

- **Coupling checklist.** Before handing an area to React, check the
  whole repo, not just the files you are converting, for:
  - delegated handlers (`$(document).on(`, `$('body').on(`) whose
    selectors match the area's class names or ids; they also fire on
    React's elements;
  - page-wide setup that runs again later on broad selectors
    (`initWidgets(document)`, `$(document).ajaxComplete(…)`, partial
    reload hooks); it re-attaches plugins to elements React now owns;
  - global AJAX setup and hooks (`$.ajaxSetup` headers or `cache`,
    `ajaxSend`, `ajaxError`, `ajaxStart`/`ajaxStop`); `fetch` skips all of
    them, and so does the default `X-Requested-With` header and form
    encoding of `$.post`;
  - custom events the area triggers or listens to, and globals other
    scripts read;
  - server code or other consumers of the values the area submits
    (date, number, and field-name formats).
  Keep each one working, or list it under Behavior differences.
- Change one thing at a time. Keep class names and ids as they are, so the
  CSS and the test selectors keep working.
- Once React owns an element, no jQuery code may touch anything inside it.
  Delete the old handlers for an area in the same unit that hands it over.
- Keep existing bugs and quirks for parity, and list them as quirks in the
  unit file. Don't fix them silently.
- Never send app code, config, or secrets to Context7. Send only library
  names and feature questions.
- Never remove old jQuery code until the unit has passed validation and
  has a rollback path.
