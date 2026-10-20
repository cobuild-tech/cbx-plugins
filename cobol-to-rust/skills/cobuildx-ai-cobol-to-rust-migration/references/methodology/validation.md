<!-- GENERATED from shared/methodology-backend/validation.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Validating a unit

A unit is `done` only when every check below passes. Record the results in
`.migration/units/<unit-id>.md`.

1. **Golden data.** The unit's golden data was recorded from the **old**
   code before porting, and every recording replays to identical output in
   compat mode (`parallel-run.md`).
2. **Tests.** Every test that covered the old piece is ported. Business
   rules have plain value-in, value-out unit tests. Tricky conversions and
   arithmetic have property tests against the old behavior. Coverage
   never goes down.
3. **Build.** `cargo build --release`, `cargo clippy -- -D warnings`, and
   `cargo test` are clean.
4. **Parity review.** Run the source's `*-parity-reviewer` agent on the
   original and the port. Fix every `high` difference. Fix or explicitly
   accept every `medium`, recording which in the unit file.
5. **Parallel run.** The piece ran beside the old one on real input and
   matched. If you can't run it in production from here, list it under
   "Needs manual QA" and mark the unit `needs-qa`, not `done`.
6. **Switch back.** The way back is in place and was tried once: the JCL
   step, the scheduler entry, or the proxy rule.
7. **Quirks.** Old bugs and odd behavior kept for parity are listed in the
   unit file, each with the fixed-mode decision (fixed, kept, or left for
   the business to decide). None is fixed silently.

Only then update `state.json`: set the unit to `done` (or `needs-qa`),
update `next_unit`, and stop.
