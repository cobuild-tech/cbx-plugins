# Copybooks and record layouts

Read this in any unit that reads or writes a record. Most of the risk in a
COBOL migration is here, not in the logic. The copybook is the contract
between every program that touches the bytes.

## Build the codecs first

- One Rust type per `01` record, fields in copybook order, with a `Record`
  trait (`LEN`, `decode(&[u8])`, `encode(&self) -> Vec<u8>`).
- **Round-trip test every layout** against every record in the golden
  data before writing any business logic.
- Return an error for bad bytes (a packed field holding spaces, a bad sign
  nibble). Don't turn junk into zero. Find out what the old program did
  with those records: skipped, crashed, or processed.

## What each clause means

| Clause | Means | In Rust |
|---|---|---|
| `PIC 9(n)V99` | Implied decimal point, never stored | Whole number of the smallest unit, or `Decimal` with scale |
| `PIC S9…` | Signed. In display form, the sign is overpunched in the last digit | Decode the overpunch (`{`, `A`–`I`, `}`, `J`–`R`) |
| `COMP-3` | Packed: two digits per byte, sign in the last nibble (`C`/`F` +, `D` −) | A decoder; `n` digits take `n/2 + 1` bytes |
| `COMP`/`COMP-4`/`BINARY` | Big-endian binary, limited by the `PIC` unless `TRUNC(BIN)` | `i16`/`i32`/`i64` from big-endian bytes; check the truncation option |
| `COMP-5` | Native binary, not limited by the `PIC` | Same, without the `PIC` limit |
| `PIC X(n)` | Fixed-length text, space padded | Keep as `[u8; n]`. Trailing spaces and accents go back out exactly |
| `REDEFINES` | Two layouts for the same bytes | An `enum`; find the field that decides which layout applies |
| `OCCURS n` | Fixed-size table | An array |
| `OCCURS … DEPENDING ON` | Table sized by another field | Records have different lengths; read the count first |
| `88` levels | Named values for a field | Enum variants, **plus** a variant that keeps unknown raw values |
| `FILLER` | Unused bytes | Keep and write back unchanged |

## EBCDIC

Convert **only** `PIC X` fields, with a table for the right code page.
Running a whole record through a text converter destroys every packed and
binary field in it. Keep the old encoding on disk while any COBOL program
still reads the file.
