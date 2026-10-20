# Testing a PHP port

Read this in any unit that ports or writes tests. Read
`references/rust/testing.md` and `references/methodology/parallel-run.md`
with it.

Many PHP apps have patchy tests, but every one has logs and real traffic.

- **Golden pairs:** real requests and the responses PHP sent, for every
  route you plan to move. Save the status, the headers clients see, the
  body bytes, and the affected rows afterwards (text as hex, so stored
  bytes are compared too). Keep the strange requests.
- **No production traffic:** script sessions (plain text files of
  requests) and record them against the original, run with the same PHP
  version and `php.ini` in a container with the code mounted unchanged.
  Include a recording with the database stopped.
- **Replay** each session against Rust in compat mode, with the database
  reset to the same dump before each session. Compare status, headers,
  body bytes, and rows. A failure prints the request and both bodies.
- **Replay from outside too:** point the capture script at the Rust
  service, and at the proxy with some routes moved. The recordings must
  be identical to PHP's.
- **Check the check:** remove one copied rule (the charset, say) and
  confirm the tests fail.
- **Port existing PHPUnit/Pest tests** scenario by scenario where they
  test behavior through HTTP.
- **Mirror** read-only production traffic with nginx `mirror` and compare
  offline. Never mirror writes to a service that shares the real
  database.
