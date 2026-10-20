---
name: cobuildx-ai-cobol-to-rust-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize a COBOL system — batch jobs with JCL, copybooks, sequential or VSAM files, DB2, or CICS, on a mainframe or on GnuCOBOL / Micro Focus — to Rust, as a full rewrite or an incremental/strangler-fig migration of any size, or to continue, resume, or check the status of a COBOL-to-Rust migration already in progress (e.g. \"continue the migration\", \"what's left to migrate\", \"why isn't the interest job migrated yet\")."
metadata:
  version: "1.0.0"
---

# COBOL → Rust Migration

Port a COBOL system to Rust with no change in behavior or output. A
migration proves equivalence: the same input gives the same bytes out.
Don't redesign, refactor beyond what the move needs, or fix things along
the way unless the user asks.

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

1. Delegate the sweep to the `cobol-inventory` agent. For a system of only
   a handful of programs, you can read them directly.
2. Read `references/cobol/flavor.md` and record the compiler, platform,
   batch or online, data stores, encoding, and schedule.
3. Write `.migration/assessment.md` and create `state.json` with
   `phase: "strategy"`.

## Step 2: Choose a strategy

1. Read `references/methodology/strategy-selection.md`. For batch, Strangler
   Fig over job steps usually fits best. CICS transactions are their own
   later phase.
2. Pick one strategy, then read **only** that strategy's file:
   `references/methodology/strangler-fig.md`,
   `references/methodology/branch-by-abstraction.md`, or
   `references/methodology/cutover.md`.
3. If you can't tell whether downstream jobs or users depend on the
   system, or where the Rust code should run, ask the user before
   choosing.
4. Log the choice and the reason in `.migration/decisions.md` and set
   `phase: "plan"`.

## Step 3: Plan (the only approval point)

1. Read `references/mappings.md`, `references/rust/architecture.md`, and
   `references/methodology/parallel-run.md`. Read
   `references/rust/library-apis.md` before choosing crate versions.
2. Write `.migration/plan.md` using the template in `state-format.md`.
   The first unit records golden data and scaffolds the workspace. The
   second builds codecs for the copybooks the first steps touch, with
   round-trip tests. Then units go one job step or program at a time,
   leaves first; shared writers and the most central jobs go last. Each
   unit must be small enough to validate on its own.
3. Fill `units` in `state.json`, then **stop and ask the user to approve
   the plan.** Once they approve, set `plan_approved: true` and
   `phase: "execute"`.

## Step 4: Execute one unit, then stop

1. Take `next_unit`, check that its `depends_on` units are `done`, and set
   it to `in-progress`.
2. Read the references the routing table below gives for what this unit
   contains.
3. Build it in compat mode, wire it into the job beside the COBOL step,
   and port or write its tests.
4. Validate it with `references/methodology/validation.md`, including the
   `cobol-parity-reviewer` agent.
5. Write `.migration/units/<id>.md`, update `state.json` (unit status and
   `next_unit`), and **stop**. Tell the user what was done and what comes
   next. They say "continue" to run the next unit.

When every unit is `done`, read `references/methodology/cutover.md`.

## Routing table: what to read, and when

| When the unit… | Read |
|---|---|
| is the scaffold / first unit | `references/rust/architecture.md`, `references/methodology/parallel-run.md` |
| reads or writes a record (copybook, `FD`, `COMMAREA`) | `references/cobol/copybooks-layout.md` |
| does arithmetic or moves between numeric fields | `references/cobol/numerics.md`, `references/rust/numerics.md` |
| ports `PROCEDURE DIVISION` logic, `PERFORM`, `GO TO`, or `CALL` | `references/cobol/control-flow.md` |
| opens, reads, or writes files, or checks `FILE STATUS` | `references/cobol/files-status.md` |
| has `EXEC SQL` or `EXEC CICS` | `references/cobol/db2-cics.md`, `references/rust/data-access.md` |
| replaces a job step or touches JCL or the schedule | `references/cobol/jcl-batch.md` |
| shares files or tables with programs that haven't moved | `references/cobol/coexistence.md` |
| ports or writes tests (every unit) | `references/cobol/testing.md`, `references/rust/testing.md` |
| writes code against a crate | `references/rust/library-apis.md` |
| hits a concept you haven't mapped | `references/mappings.md` |

## Always

- No floats for money or decimals. Truncate unless COBOL says `ROUNDED`.
- Keep shared files in the old layout and encoding while any COBOL
  program still reads them. Convert only `PIC X` fields from EBCDIC.
- Golden data is recorded from the old system before porting, and the
  unit matches it byte for byte in compat mode.
- Keep existing bugs and quirks in compat mode, and list them in the unit
  file. Fix them only in fixed mode, one at a time, with a test each.
- Never send app code, copybooks, data, or secrets to Context7. Send only
  crate names and feature questions.
- Never remove a COBOL step until the unit has passed validation and has a
  switch back.
