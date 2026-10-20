# DB2 and CICS

Read this in any unit with `EXEC SQL` or `EXEC CICS`. Read
`references/rust/data-access.md` with it.

## EXEC SQL

- Embedded SQL maps to `sqlx`, and the SQL itself often moves over
  unchanged. Host variables become bound parameters with the same types
  (`DECIMAL(p,s)` stays exact).
- `SQLCODE`/`SQLSTATE` checks become a `Result`. `+100` (not found) is
  usually `Option`, not an error.
- Null indicators become `Option`.
- Cursors become streams or batched queries with the same order and
  `FOR UPDATE` locking.
- **`COMMIT` placement:** batch jobs often commit every N records so they
  can restart. Keep the same restart point.

## EXEC CICS

CICS online transactions are a bigger piece of work. Plan them as their
own phase after the batch side is stable.

- Each transaction is a request and a response, so it usually becomes an
  HTTP endpoint. The 3270 map (BMS) becomes a page or an API payload.
- `COMMAREA` and channels are the request/response contract. Treat them
  like copybooks: codecs and round-trip tests first.
- Pseudo-conversational state between screens moves to an explicit
  session store.
- `READ`/`WRITE` on VSAM through CICS, `SYNCPOINT`, and `ENQ`/`DEQ`
  locking need the same transaction and locking behavior.
