<!-- GENERATED from shared/rust/data-access.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Data access in Rust

Read this when a unit reads or writes a database, or shares one with the
old code.

- Use `sqlx`. Move the old SQL over nearly unchanged; the port is not the
  time to rewrite queries. Prefer the `query!` macros, which check each
  query against the schema at compile time; use `sqlx::query` only where
  the build can't reach a database, and say so in `decisions.md`.
- **Connect the way the old code connected.** Character set, collation,
  time zone, SQL mode, isolation level, autocommit. Drivers set their own
  defaults (sqlx sets `utf8mb4`, `PIPES_AS_CONCAT`, `NO_ENGINE_SUBSTITUTION`
  and a time zone on MySQL), and a different default means the two sides
  store and read different bytes for the same row.
- Bind values the way the old code did while both sides are live. If it
  sent every value as a string, so does compat mode, so the database makes
  the same conversions.
- Keep transaction and commit boundaries the same. Batch jobs that commit
  every N records need the same restart point.
- Whatever the old code did around a write (audit rows, triggers it
  relied on, cache clears, derived columns) the Rust side does too, or the
  old side reads data it doesn't expect.
- Changing the stored data (fixing encodings, types, layouts) is a data
  migration. Do it only after the last old reader is gone.
