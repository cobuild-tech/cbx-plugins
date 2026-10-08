# From markup-building code to components

Read this when a unit builds markup with `innerHTML`, `createElement`, or
template strings.

- Functions that build lists usually do two jobs: work out the data, then
  draw it. Split them. The data half becomes a pure function with unit
  tests; the drawing half becomes a component that maps over the result
  with stable `key`s.
- Test the data function on edge cases (partial data, empty lists, time
  zones). Missing fields that produced broken URLs or empty cards in the
  original are quirks; record them.
- Template strings that inserted values into `innerHTML` become JSX, which
  escapes values. Anything that relied on raw HTML needs an audited
  `dangerouslySetInnerHTML` and a reason in the unit file.
- Keep the same element structure, class names, and ids.
