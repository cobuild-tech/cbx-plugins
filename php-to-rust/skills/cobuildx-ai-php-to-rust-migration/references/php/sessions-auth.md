# Sessions and auth

Read this before the first route that needs a logged-in user moves.

- By default PHP keeps sessions in files on the server, in its own
  serialization format (`php`, `php_serialize`, or `php_binary`). Laravel
  also encrypts its cookies with `APP_KEY`, and stores sessions in files,
  a database, or Redis. A Rust service can't read either easily.
- Pick one, and do it as **its own unit, before any route moves**, so a
  login problem never gets mixed up with a migration problem:
  - Move sessions to Redis (or the database) as JSON, with a small custom
    session handler on the PHP side (`SessionHandlerInterface`, or a
    Laravel session driver).
  - Or switch logins to signed tokens (JWT, or signed cookies) that both
    sides verify with a shared key.
- Keep cookie names, paths, domains, `Secure`, `HttpOnly`, `SameSite`, and
  lifetimes the same, so a user is never logged out by the move.
- CSRF tokens: both sides must accept a token issued by either.
- No auth at all is a finding too. With open CORS, any page can call
  every endpoint, writes included. Record it in the assessment; fixing it
  is a decision for fixed mode.
- Never copy session secrets or `APP_KEY` into the plan or unit files.
  Name them and flag them for rotation.
