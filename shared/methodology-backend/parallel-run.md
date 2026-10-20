# Parallel run and golden data

This is how every unit proves equivalence. Read it in the Plan step, and
again in the unit that sets it up.

## Record before you change anything

- For each piece you plan to move, save real input and the output the old
  code produced from it: a night's input files and output files, or real
  requests with their full responses. These are the **golden data**.
- Mask personal data, but keep the odd records: negative balances, empty
  names, unknown codes, malformed requests, errors. They are the spec.
- Save everything a client or downstream job can see: output bytes, file
  contents after the run, status, headers, body, and stored rows. Store
  text as hex where the stored bytes matter.
- Pin what isn't deterministic: the clock, random values, generated ids.
  Have both sides read the same setting.
- If there's no production data, script sessions against the old code and
  record those. Run the recording twice; it must give identical files.

## Compare

- The Rust version passes only when it turns the same input into exactly
  the same output, **byte for byte**. A difference fails the build and
  shows where it is.
- Reset shared state (files, database) to the same starting point before
  each replay.
- Check the check: break one rule on purpose in the Rust code and confirm
  the comparison fails.

## Run both in production

- **Batch:** add a step that runs Rust on the same input into a separate
  output, then a compare step. The old output still goes downstream. Swap
  only after an agreed number of matching runs, including a month end.
- **Web:** mirror read-only traffic to Rust and compare offline. Never
  mirror writes to a service that shares the real database; it would
  write everything twice.

## Compat mode and fixed mode

A port that keeps the old bugs is no use, but a port that fixes them as it
goes can't be compared. So:

- **Compat mode** (an env var such as `APP_COMPAT=1`) reproduces the old
  behavior exactly, bugs included. Golden tests run against it, and it is
  what serves traffic while both sides are live.
- **Fixed mode** is the default for the future. Each fix is one branch in
  the code, with a comment saying what the original did and a test that
  fails in compat mode.
- Match every recording in compat mode first. Add fixes only after that,
  one at a time, and ship them as announced changes after the move.
