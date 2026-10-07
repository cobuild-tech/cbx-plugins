# Porting QUnit and Mirage tests

Read this in every unit that ports tests. Also read
`references/react/testing.md`.

| Ember | React |
|---|---|
| Unit tests (`module`, `test`) | Vitest `describe`/`it` |
| Integration (rendering) tests, `render(hbs\`…\`)` | React Testing Library `render(<X/>)` |
| Acceptance tests (`visit`, `click`, `currentURL`) | Playwright (or RTL with a memory router for small flows) |
| `assert.dom('.x').hasText()` | `expect(screen.getByRole(...)).toHaveTextContent()` |
| Mirage factories/fixtures/handlers | MSW handlers reusing the same fixtures |
| `settled()` / `waitFor` | `findBy*` / `waitFor` |

Every QUnit `test` maps to one new test, or is recorded in the unit file
with a reason.
