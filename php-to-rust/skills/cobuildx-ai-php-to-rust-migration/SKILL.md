---
name: cobuildx-ai-php-to-rust-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize a PHP app or part of one — plain PHP scripts, Laravel, Symfony, Slim, or other frameworks, including APIs, cron jobs, and queue workers — to Rust, as a full rewrite or an incremental/strangler-fig migration of any size, or to continue, resume, or check the status of a PHP-to-Rust migration already in progress (e.g. \"continue the migration\", \"what's left to migrate\", \"why isn't the orders endpoint migrated yet\")."
metadata:
  version: "1.0.0"
---

# PHP → Rust Migration

Port a PHP app, or the parts of it there's a reason to move, to Rust with
no change in behavior. A migration proves equivalence: the same request
gets the same response. Don't redesign, refactor beyond what the move
needs, or fix things along the way unless the user asks.

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

1. Delegate the sweep to the `php-inventory` agent. For an app of only a
   handful of files, you can read them directly.
2. Read `references/php/flavor.md` and record the PHP version, framework,
   server setup, `php.ini` settings, database connection, sessions, and
   background work.
3. Write `.migration/assessment.md` and create `state.json` with
   `phase: "strategy"`.

## Step 2: Choose a strategy

1. Read `references/methodology/strategy-selection.md`. Strangler Fig
   with one route per unit behind the existing proxy usually fits best.
   Sessions often need Branch by Abstraction first.
2. Pick one strategy, then read **only** that strategy's file:
   `references/methodology/strangler-fig.md`,
   `references/methodology/branch-by-abstraction.md`, or
   `references/methodology/cutover.md`.
3. If you can't tell why the app is moving, or which parts need to, ask
   the user before choosing. Moving only some routes is a valid plan.
4. Log the choice and the reason in `.migration/decisions.md` and set
   `phase: "plan"`.

## Step 3: Plan (the only approval point)

1. Read `references/mappings.md`, `references/rust/architecture.md`, and
   `references/methodology/parallel-run.md`. Read
   `references/rust/library-apis.md` before choosing crate versions.
2. Write `.migration/plan.md` using the template in `state-format.md`.
   The first unit records golden pairs and scaffolds the workspace and
   proxy. Then shared state: the database connection, then sessions. Then
   units go one route (all its methods) or one job at a time, leaves
   first; cron jobs and read-only routes are good early units. Each unit
   must be small enough to validate on its own.
3. Fill `units` in `state.json`, then **stop and ask the user to approve
   the plan.** Once they approve, set `plan_approved: true` and
   `phase: "execute"`.

## Step 4: Execute one unit, then stop

1. Take `next_unit`, check that its `depends_on` units are `done`, and set
   it to `in-progress`.
2. Read the references the routing table below gives for what this unit
   contains.
3. Build it in compat mode, route it through the proxy, and port or write
   its tests.
4. Validate it with `references/methodology/validation.md`, including the
   `php-parity-reviewer` agent.
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, read `references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| is the scaffold / first unit | `references/rust/architecture.md`, `references/methodology/parallel-run.md`, `references/php/routing-proxy.md` |
| moves a route, or changes the proxy | `references/php/routing-proxy.md` |
| reads request input, converts values, or builds a response | `references/php/implicit-rules.md`, `references/php/arrays-to-types.md` |
| queries the database | `references/php/database.md`, `references/rust/data-access.md` |
| needs a logged-in user, cookies, or CSRF | `references/php/sessions-auth.md` |
| ports a Laravel, Symfony, or other framework route | `references/php/frameworks.md` |
| moves a cron job or queue worker | `references/php/background-jobs.md` |
| does money or decimal arithmetic | `references/rust/numerics.md` |
| ports or writes tests (every unit) | `references/php/testing.md`, `references/rust/testing.md` |
| writes code against a crate | `references/rust/library-apis.md` |
| hits a concept you haven't mapped | `references/mappings.md` |

## Always

- Match the PHP version and `php.ini` that run in production, not the
  newest ones.
- Connect to the database the way PHP did (charset, prepares, session
  settings) while both sides share it.
- Golden pairs are recorded from PHP before porting, and the unit matches
  them byte for byte in compat mode: status, headers, body, and rows.
- Keep existing bugs and quirks in compat mode, and list them in the unit
  file. Fix them only in fixed mode, one at a time, with a test each.
- Never send app code, config, secrets, or traffic to Context7. Send only
  crate names and feature questions.
- Never remove PHP code until the unit has passed validation and has a
  switch back.
