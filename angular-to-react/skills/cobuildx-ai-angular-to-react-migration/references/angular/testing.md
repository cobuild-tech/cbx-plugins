# Porting Angular and AngularJS tests

Read this in every unit that ports tests. Also read
`references/react/testing.md`.

| Old | React |
|---|---|
| Jasmine/Karma, `TestBed`, `angular-mocks` | Vitest/Jest + React Testing Library |
| `HttpTestingController` / `$httpBackend` | MSW with the same fixtures |
| Protractor / Cypress e2e | Playwright (or Cypress) against the same flows |

Specs that only check `should create` don't count as coverage. Write
characterization tests against the old behavior first.
