# Identifying the Backbone setup

Read this in the Assess step. Backbone apps have no enforced structure, so
the real architecture lives in conventions. Record in `state.json` and
`assessment.md`:

- **Marionette or not:** Regions, LayoutViews, CollectionViews, and
  Behaviors change the mapping. If Marionette is used, record
  `"flavor": "marionette"`. Otherwise use `"flavor": "plain"`.
- **Template engine:** Underscore (`_.template`), Handlebars, or
  Mustache.
- **Module system:** RequireJS/AMD, Browserify, or script-tag globals
  (`window.App`). Decide early how the new build will bridge them, and
  record that in `decisions.md`.
- **Routing mode:** hash or pushState (`Backbone.history.start({pushState})`).
- **Hidden wiring:** global event bus (`Backbone.Events`, `vent`, Radio),
  shared model instances passed between views, a monkey-patched
  `Backbone.sync`, and jQuery plugins.

Backbone suits incremental migration unusually well. A View owns a single
`el`, so React can mount inside any view, which makes Vertical slice a
strong option.
