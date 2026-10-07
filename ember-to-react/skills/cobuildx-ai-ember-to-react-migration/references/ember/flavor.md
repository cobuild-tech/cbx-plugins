# Identifying the Ember flavor

Read this in the Assess step.

- **Classic**: `Ember.Component` / `Component.extend`, computed
  properties, observers, mixins, two-way bindings, `tagName`/`classNames`.
- **Octane**: Glimmer components (`@glimmer/component`), `@tracked`,
  `@action`, one-way data flow, modifiers.
- **Mixed**: common in older apps. Count each kind
  (`@ember/component` vs. `@glimmer/component` imports).

Octane maps to React almost one to one. Classic needs more untangling,
especially observers and mixins. For a large Classic app, consider whether
moving the hot spots to Octane idioms first makes the React port safer.
If you choose that, log it in `decisions.md` as its own set of units.

Record the flavor in `state.json` (`"flavor": "classic" | "octane" | "mixed"`).
Versions come from `package.json`: `ember-source`, `ember-cli`, and
`ember-data`.
