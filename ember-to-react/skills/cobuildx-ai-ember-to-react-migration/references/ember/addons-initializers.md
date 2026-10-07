# Porting addons, initializers, and config

Read this in the scaffold unit, and whenever a unit uses an addon.

- **Config:** `config/environment.js` becomes `import.meta.env.VITE_*` or
  a config module. Never copy secret values. Flag them for rotation in
  `decisions.md`.
- **Initializers and instance-initializers** become explicit setup in
  `main.tsx`, or app-root providers. Keep their order.
- **Addons:** audit every `ember-*` dependency. Each one is a migration
  of its own. Record the mapping in `decisions.md`.

| Addon | Typical React replacement |
|---|---|
| `ember-intl` | `react-intl` with the same message keys |
| `ember-simple-auth` | Session Context + API client auth header; shared cookie during coexistence |
| `ember-power-select` | A React select library (React Select, Radix, etc.) |
| `ember-css-modules` | CSS Modules with the same class names |
| `ember-cli-mirage` | MSW (see `testing-qunit-mirage.md`) |
| `ember-concurrency` | See `ember-concurrency.md` |

- **Styles:** port CSS/SCSS and class names as is, in the same pass as the
  logic. Redesign is a separate, later change.
