# Paragraphs, WORKING-STORAGE, and control flow

Read this in any unit that ports `PROCEDURE DIVISION` logic.

## Port first, tidy later

- `WORKING-STORAGE` is one global that every paragraph can read and
  change. While porting, keep it as fields on one struct, and each
  paragraph as a method with the paragraph's name. Turning flags into
  locals during the port quietly changes behavior, for example a flag
  shared by two menus that makes "log out" exit the program.
- Once the port matches the golden data, tidy in fixed mode: work out what
  each paragraph really reads and writes, make those parameters and return
  values, and replace "next step" flags with return values.

## Mapping

- `PERFORM para` → a method call. `PERFORM para N TIMES` / `VARYING` /
  `UNTIL` → `for` or `while`. Check whether `UNTIL` is tested before or
  after (`WITH TEST AFTER`).
- `PERFORM a THRU b` runs every paragraph between them in source order.
  Draw where control can go before translating.
- `GO TO` → usually a loop with `continue`, `break`, or an early `return`.
  `GO TO … DEPENDING ON` → `match`. `ALTER` → find every target first.
- Fall-through: a paragraph without `EXIT`/`GOBACK` runs into the next.
- Unreachable paragraphs: check the JCL, `CALL`s from other programs, and
  `PERFORM THRU` ranges before calling them dead.
- `CALL 'PROG' USING a b` → a function taking `&mut` references (COBOL
  passes by reference unless `BY CONTENT`/`BY VALUE`). `CANCEL` resets the
  called program's `WORKING-STORAGE`; without it, values persist between
  calls.
- `STRING`/`UNSTRING`/`INSPECT` → explicit byte operations. `DELIMITED BY
  SPACE` stops at the first space, including spaces that zero suppression
  (`PIC Z`) put at the front.
- `INITIALIZE` sets numbers to zero and text to spaces, but skips
  `FILLER` and `REDEFINES`.

Keep business rules (`interest`, `fee`, `limit`) as plain functions with
no file access.
