# COBOL arithmetic

Read this in any unit with `COMPUTE`, `ADD`, `SUBTRACT`, `MULTIPLY`,
`DIVIDE`, or a `MOVE` between numeric fields. Read
`references/rust/numerics.md` with it.

## The rules

- **Truncate unless `ROUNDED`.** A result with more decimals than its
  field has the extra digits cut off. `RoundingStrategy::ToZero`, or whole
  number division on scaled integers. `ROUNDED` is
  `MidpointAwayFromZero` (unless the code says `ROUNDED MODE`).
- **Storing drops what doesn't fit.** Without `ON SIZE ERROR`, a result
  too big for its field loses its leading digits in practice (`ADD 1` to a
  `PIC 99` holding 99 gives 00). Moving a negative value to an unsigned
  field drops the sign. Put this in one `store` function per field shape.
- **`ON SIZE ERROR`** becomes a `Result` with a size error, and the target
  field is left unchanged, as COBOL does.
- **Arithmetic without `ON SIZE ERROR`** is a decision: copy the silent
  overflow in compat mode, list it as a risk, and decide fixed-mode
  behavior on purpose. The golden data shows whether it ever happened.
- **Intermediate precision** depends on the compiler and options (`ARITH`).
  A long `COMPUTE` can differ in the last digit. When golden data shows a
  one-cent difference, write out COBOL's exact steps.
- **Input conversion** (`ACCEPT`, `NUMVAL`, moving text to numbers) has
  runtime rules: commas and signs may be dropped, junk may become zero.
  Copy them from the compiler's runtime and test against the old program
  on many inputs.
- **Dates** in `PIC 9(8)` (YYYYMMDD) or `PIC 9(6)`: parse into a date type
  at the edge, write back in the same digits. Check for windowing of
  two-digit years.

## Test

Unit tests with values from real records, and `proptest` checks that
`store` always truncates, never rounds unless asked, and wraps the way the
old field does.
