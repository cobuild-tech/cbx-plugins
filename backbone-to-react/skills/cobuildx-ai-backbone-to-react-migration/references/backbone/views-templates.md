# Porting views and templates

Read this when a unit contains Views or templates.

- `<%= x %>` and `{{x}}` become `{x}`. Unescaped `<%- %>` and `{{{x}}}`
  need an audit; use `dangerouslySetInnerHTML` with DOMPurify only if
  truly needed.
- `<% if %>` and `{{#if}}` become a ternary or `&&`. `_.each` and
  `{{#each}}` become `.map()` with `key` (`id`, or `cid` for unsaved
  models).
- `tagName`, `className`, `id`, and `attributes` become an explicit
  wrapper element. Reproduce it if styles or selectors depend on it.
- Subviews become child components.
- `render()` via `this.$el.html(...)` becomes declarative JSX. Delete the
  manual re-render calls.
- Template helpers (`_.escape`, formatters) become plain functions.
