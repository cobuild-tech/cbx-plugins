# COBOL → Rust concept map

Read this in the Plan step, and when a unit hits a concept you haven't
mapped yet. In each unit file, list only the rows you actually used.

| COBOL concept | Rust equivalent | Why |
|---|---|---|
| Copybook `01` record | A struct with `decode`/`encode` and a round-trip test | The layout is the contract |
| `PIC 9(n)V99` | Whole number of cents, or `Decimal` with scale 2 | Exact, never a float |
| `COMP-3` / `COMP` | A decoder per field shape, erroring on bad bytes | Junk must be seen, not zeroed |
| `PIC X(n)` | `[u8; n]` | Bytes go back out exactly |
| `REDEFINES` | `enum` chosen by the deciding field | One layout at a time |
| `88` levels | Enum variants plus one that keeps unknown values | Real data has unnamed values |
| `COMPUTE` without `ROUNDED` | Truncate (`ToZero`) in one `store` function | COBOL cuts, it doesn't round |
| `ROUNDED` | `MidpointAwayFromZero` | Same rule |
| `ON SIZE ERROR` | `Result` with a size error | Overflow is visible |
| No `ON SIZE ERROR` | Leading digits dropped in compat mode; a decision in fixed mode | Copy first, decide on purpose |
| `WORKING-STORAGE` | Fields on one struct while porting; parameters after | Port first, tidy later |
| Paragraph / `PERFORM` | Method with the paragraph's name / a call | Easy parity review |
| `GO TO`, `PERFORM THRU` | Loops, `continue`, early `return`, `match` | Draw the flow first |
| `READ … AT END` loop | Iterator over a record reader | End of file ends the loop |
| `FILE STATUS` | `Result` with the two-character code | Errors keep their meaning |
| `CALL … USING` | Function with `&mut` parameters | COBOL passes by reference |
| `EXEC SQL` | `sqlx`, same SQL, same commit points | Same restart behavior |
| `EXEC CICS` transaction | HTTP endpoint; `COMMAREA` as a codec | Request and response |
| JCL step | A binary or subcommand with the same datasets and return codes | The steps around it can't tell |
| `ACCEPT` / `NUMVAL` | One parser copying the runtime's rules | Input has hidden rules |
| `PIC 9(8)` date | Date type at the edge, same digits on disk | Real dates inside, old format outside |

Rule of thumb: the hard part is the data, not the logic. Get the bytes and
the arithmetic right first; the paragraphs are usually simple.
