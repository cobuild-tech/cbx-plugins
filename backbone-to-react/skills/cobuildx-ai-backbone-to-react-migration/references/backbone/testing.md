# Porting Backbone tests

Read this in every unit that ports tests. Also read
`references/react/testing.md`.

- Jasmine, Mocha, or QUnit with Sinon becomes Vitest/Jest with React
  Testing Library.
- Sinon fake servers become MSW with the same fixtures.
- Many Backbone apps are under-tested. If a piece has no tests, write
  characterization tests against the old behavior before porting it.
