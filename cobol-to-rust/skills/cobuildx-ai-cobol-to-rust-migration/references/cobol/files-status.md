# Files and FILE STATUS

Read this in any unit with `OPEN`, `READ`, `WRITE`, `REWRITE`, `DELETE`,
or `START`.

- The read loop (`READ … AT END … NOT AT END`) becomes iterating over a
  reader. End of file ends the loop.
- `FILE STATUS` codes become a `Result` error type that keeps the code:
  `00` ok, `02` duplicate alternate key, `10` end of file, `22` duplicate
  key, `23` not found, `35` file missing on open, `39` attributes don't
  match, `9x` implementor-specific.
- **Programs that ignore a status:** find out what they did next. A
  downstream job may depend on it. Copy it in compat mode.
- `OPEN OUTPUT` truncates; `OPEN EXTEND` appends; `OPEN I-O` with
  `REWRITE` updates in place. Keep the same mode, or the files around a
  replaced step won't match.
- Indexed and VSAM KSDS files: keep key order, alternate keys, and
  duplicate rules. A sorted file or embedded key-value store can stand in
  while the file stays in the old format; the format changes only after
  the last COBOL reader is gone.
- Line sequential vs record sequential: check record delimiters, trailing
  spaces, and the final newline. Byte comparison catches all three.
- `SORT`/`MERGE` with `INPUT`/`OUTPUT PROCEDURE`: copy the key order,
  collating sequence (EBCDIC sorts digits after letters), and stability.
- Checkpoint/restart: a job that can restart halfway needs the same
  restart point in Rust.
