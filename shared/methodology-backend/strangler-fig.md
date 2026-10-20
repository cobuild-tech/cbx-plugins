# Strangler Fig

Old and new run side by side. Each unit moves one piece, a **job step** in
a batch system or a **route** in a web app, from the old code to Rust.
The pieces around it can't tell it changed, because it reads and writes
exactly what the old one did. Repeat until the old system runs nothing.

## Set up once (this is the first unit in plan.md)

1. Scaffold the Rust workspace and get it building, testing, and
   deploying with one empty binary or route before any feature code
   (`references/rust/architecture.md`).
2. Build the shared contract first: the record codecs for every layout the
   first pieces touch, or the database connection set up exactly as the
   old code's. Nothing else starts until it round-trips real data.
3. Put a switch in front of each piece: a JCL step or scheduler entry, or
   a proxy rule per route. **One piece has exactly one owner at a time.**
4. Settle shared state before moving anything: sessions, auth, file
   locations, character sets. Do it as its own change, so a login or
   encoding problem never gets mixed up with a migration problem.
5. Make the switch back a one-line change, and try it once.

Coexistence details for this source are in the source folder.

## Each unit

- Move leaves first: read-only routes, report jobs, and pieces few others
  depend on. Leave shared writers, sessions, and the most central jobs for
  last. Queues and cron jobs are often a good early choice, because no
  user waits on them.
- Move a route with all of its methods, or a job step with all of its
  inputs and outputs, together.
- Data shared by both sides stays in the old format until the last reader
  of the old format is gone.
- A unit is done only when it passes `validation.md`, including the
  parallel run and the switch back.

## Done when

Every piece runs on Rust. Then read `cutover.md` to remove the old system.
