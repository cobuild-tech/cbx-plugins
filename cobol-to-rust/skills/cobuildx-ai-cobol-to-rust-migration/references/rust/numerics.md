<!-- GENERATED from shared/rust/numerics.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Exact numbers in Rust

Read this when a unit does arithmetic on money, quantities, rates, or any
value the old system stored as a decimal.

- **Never use `f32`/`f64` for money.** Use whole numbers of the smallest
  unit (cents, thousandths of a percent) where the scale is fixed, or
  `rust_decimal::Decimal` (28 significant digits) where it isn't.
- Put each rounding rule in **one** function, named for what it copies,
  and call it everywhere. `Decimal::round_dp_with_strategy` with
  `RoundingStrategy::ToZero` truncates; `MidpointAwayFromZero` is "round
  half up" as most business systems mean it; `MidpointNearestEven` is
  banker's rounding. Find out which the old code does; don't assume.
- Overflow is a decision. Check what the old code did when a result didn't
  fit (an error, a wrap, lost leading digits, a float), copy it in compat
  mode, and list it as a risk. Use `checked_*` arithmetic in fixed mode.
- Parsing typed or received numbers has rules too: separators, signs,
  junk characters, empty strings. Copy the old runtime's rules into one
  parser and test it against the old system on many inputs.
- Intermediate precision can differ in the last digit. When the golden
  data shows a one-unit difference, work out the exact steps the old code
  takes, write them out, and add that record to the tests.
- Property tests (`proptest`) check the rules over thousands of values:
  truncation never rounds, round trips are exact, results stay in range.
