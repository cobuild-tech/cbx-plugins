# Rust target architecture

Read this in the first unit (scaffold), or when you're unsure where a
ported piece should live.

## Scaffold

- A Cargo workspace on the stable toolchain, unless the team already has
  one. Match the existing repo's CI, formatting, and lint setup.
- Get it building, testing, and deploying with one empty binary or route
  before any feature code.
- Read config from environment variables or a config file at start-up.
  **Never copy secret values.** Flag them for rotation in `decisions.md`.
- One env var turns on compat mode (`references/methodology/parallel-run.md`).
  Read it once at start-up and pass it down; don't read it deep in the code.

## Where things go

```
Cargo.toml              workspace
crates/
├── <app>-core/         business rules: plain functions, values in, values out
├── <app>-data/         record codecs or database access: the shared contract
├── <app>-batch/        one binary per job, or one subcommand per job step
└── <app>-web/          HTTP service: routes, extractors, middleware
tests/golden/           recorded inputs and outputs, replayed by the tests
```

Use only the crates the source needs. A batch system has no `-web`; a web
app may have no `-batch`.

## Rules

- Keep the business rules free of I/O, so they can be tested with plain
  values and changed for years without touching files or HTTP.
- Port first, tidy later. Keep the old names and boundaries (one function
  per paragraph, one handler per script) until the port matches. That
  keeps parity review and rollback easy, and stops bugs from being fixed
  by accident.
- Errors are values: `thiserror` for the library crates, `anyhow` at the
  binary edge. Keep the old error text where clients or operators read it.
- Don't rebuild the old runtime. Copy the specific rules the code depends
  on (conversions, rounding, status codes), each in one function, and
  nothing else.
- No `unsafe`, and no `unwrap()` on data that came from outside.
