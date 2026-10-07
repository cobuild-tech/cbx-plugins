<!-- GENERATED from shared/react/testing.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Testing in React

Read this whenever a unit ports tests. That's every unit with code.

- Use Vitest (or Jest, if the repo already has it) with React Testing
  Library. Query by role and label, the way users find things.
- Use **MSW** for network mocks, reusing the old app's fixtures and
  factories so both suites assert against the same data.
- Use Playwright for end-to-end, or Cypress if the team already uses it.
  Port acceptance and e2e flows one to one.
- Port tests **scenario for scenario**. Every `it`/`test` in the old suite
  maps to one in the new suite, or is recorded in the unit file with a
  reason.
- Where there are no tests, or tests only check that a piece renders,
  write characterization tests against the **old** implementation first.
  Then port, and run the same assertions against React.
- Test timing explicitly (debounce, cancellation, focus after render) with
  fake timers or `findBy*`.
- Never reduce coverage during a migration.
