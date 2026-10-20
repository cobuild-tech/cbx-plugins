# Cron jobs and queue workers

Read this in any unit that moves a scheduled script or a queue consumer.

- These are often the best place to start: no user waits on them, and
  they're the usual reason to move (memory leaks in long-running
  workers).
- **Cron:** keep the schedule, the time zone, and overlap protection
  (`withoutOverlapping`, lock files). The Rust binary takes the same
  arguments and exits with the same codes.
- **Queues:** the Rust worker reads the same queue and message format.
  Laravel jobs are PHP-serialized payloads; switch the producer to JSON as
  its own unit first, or have Rust parse the payload format. Keep retry
  counts, backoff, timeouts, and failed-job handling.
- Run one consumer type per queue at a time. Don't let PHP and Rust
  workers take messages from the same queue unless both are proven
  identical on golden messages.
- Golden data for jobs: the input messages or database state before the
  run, and everything after it (rows, files, emails sent to a test
  inbox, messages published).
