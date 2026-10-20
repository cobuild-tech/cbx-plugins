<!-- GENERATED from shared/rust/testing.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Testing in Rust

Read this in any unit that ports or writes tests.

- **Golden tests** replay the recorded data from
  `references/methodology/parallel-run.md` with `cargo test`. Each case
  resets state, runs the Rust piece in compat mode, and compares the
  output bytes. On failure, print the input and a diff of both outputs.
  Keep the recordings in `tests/golden/`, read by the tests at run time.
- **Unit tests** cover the business rules as plain values in and out.
  Every odd record found in real data gets a test, with a comment saying
  where it came from.
- **Round-trip tests** for every codec: decode then encode gives back the
  same bytes, for every record in the golden data.
- **Property tests** with `proptest` for conversions and arithmetic,
  checked against the old system's rules or against a reference
  implementation.
- **Fixed-mode tests**: one per fix, with a comment saying what the old
  code did. It should fail in compat mode.
- Pin the clock and any randomness through config, never by patching
  globals.
- `insta` snapshots are fine for new output, but golden data recorded from
  the old system is the reference while porting.
