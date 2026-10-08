# Testing a vanilla JS migration

Read this in every unit that ports or writes tests. Also read
`references/react/testing.md`.

- Most vanilla apps have no tests. Before porting an area, write
  characterization tests for what it does today, quirks included.
- Keep the original class names and ids so the same tests run against the
  old page and the React version. An area counts as moved only when it
  passes on both.
- Main user journeys go in Playwright, run against both versions. Mock the
  API with MSW so one fake server answers for both.
- Freeze the clock for anything date-based, and test pure data functions
  without a browser.
- Compare screenshots of both versions at desktop and phone widths.
