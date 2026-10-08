# Testing a jQuery migration

Read this in every unit that ports or writes tests. Also read
`references/react/testing.md`.

- Most jQuery pages have no tests. Before porting an area, write
  characterization tests for what it does today, quirks included.
- Use the original class names and ids as selectors so the same tests run
  against the jQuery page and the React version. An area counts as moved
  only when it passes on both.
- Main user journeys go in Playwright, run against both versions. Mock the
  API with MSW so one fake server answers for both.
- In Vitest, set `css: true` when a test checks visibility, or
  `toBeVisible` can pass for elements the CSS hides.
- Compare screenshots of both versions at desktop and phone widths.
