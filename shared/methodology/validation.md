# Validating a unit

A unit is `done` only when every check below passes. Record the results in
`.migration/units/<unit-id>.md`.

1. **Tests.** Every test that covered the old piece is ported scenario for
   scenario. Where the old piece had no tests, characterization tests were
   written against the **old** behavior before porting. Coverage never
   goes down.
2. **Build.** The TypeScript check is clean, lint is clean, and the
   production build succeeds.
3. **Parity review.** Run the framework's `*-parity-reviewer` agent on the
   original and the port. Fix every `high` difference. Fix or explicitly
   accept every `medium`, recording which in the unit file.
4. **Side-by-side check.** Run old and new in a browser and compare: the
   same states (loading, empty, error, disabled), the same URLs, and the
   same keyboard and focus behavior. Use screenshot diffs if the tooling
   supports them. If you can't run a browser, list this under "Needs
   manual QA" and don't mark the unit `done`; mark it `needs-qa`.
5. **Rollback.** The way back is in place and was tried once: a proxy
   rule, a flag, or the old component kept.
6. **Quirks.** Existing bugs or timing oddities that were kept for parity
   are listed in the unit file, not silently fixed.

Only then update `state.json`: set the unit to `done` (or `needs-qa`),
update `next_unit`, and stop.
