# Testing a COBOL port

Read this in any unit that ports or writes tests. Read
`references/rust/testing.md` and `references/methodology/parallel-run.md`
with it.

Old COBOL systems rarely have automated tests. They do have decades of
real input and output, which is better than tests written from memory.

- **Golden files:** for each job step, a real run's input datasets and the
  COBOL output. The Rust step must produce the same bytes. Keep the odd
  records: negative balances, empty names, unknown codes.
- **No production data:** build the original with GnuCOBOL and record
  scripted runs (for interactive programs, scripted keyboard sessions),
  saving screen output and every data file after each run.
- **Pin the clock:** `COB_CURRENT_DATE` on GnuCOBOL; the Rust side reads
  the same variable.
- **Round trips** for every layout, before any logic.
- **Unit tests** for each business rule with real values, for example
  `interest(123457, 2500) == 257`.
- **Many inputs** for input conversion and arithmetic: hundreds of awkward
  and random strings through COBOL and Rust, every result equal.
- **The nightly parallel run** is the final test. Nothing moves until it
  has matched through a month end.
