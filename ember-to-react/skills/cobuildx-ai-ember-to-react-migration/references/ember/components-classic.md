# Porting Classic components

Read this when a unit contains `Component.extend` / `@ember/component`
components. Read `components-octane.md` too for the template syntax.

- **Wrapper element:** Classic components render a wrapper `<div>` by
  default. `tagName`, `classNames`, `classNameBindings`, and
  `attributeBindings` define it. Reproduce it as an explicit wrapper
  element when styles, tests, or selectors depend on it. `tagName: ''`
  means no wrapper.
- **Two-way bindings:** `{{input value=x}}`, `mut`, and properties that a
  child sets back on the parent become `value` + `onChange` props. Make
  every upward write explicit.
- **Computed properties:** `computed('a', 'b.[]', function…)` becomes a
  value derived in render. Check dependent-key edge cases (`@each`, `[]`)
  so the port recomputes in the same situations.
- **Observers:** see `services-mixins.md`. Don't port them as `useEffect`
  one to one.
- **Lifecycle:** `didInsertElement` / `willDestroyElement` become
  `useEffect` with cleanup. `didReceiveAttrs` / `didUpdateAttrs` usually
  become derived values, or an effect keyed on the specific prop.
- `this.sendAction('x')` and string actions become callback props.
- `this.$()` (jQuery) and `this.element` become a `ref`.
