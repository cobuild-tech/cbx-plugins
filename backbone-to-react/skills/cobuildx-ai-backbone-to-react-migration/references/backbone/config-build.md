# Porting the build and config

Read this in the scaffold unit.

- Bridge RequireJS/AMD, Browserify, or script-tag globals to the Vite
  build. Record the approach in `decisions.md`.
- `window.App` config globals become `import.meta.env.VITE_*` or modules.
  Never copy secret values. Flag them for rotation.
- Write the API client that replaces `Backbone.sync` now (see
  `models-collections.md`).
- Port CSS, SCSS, LESS, and class names as they are, in the same pass as
  the logic.
