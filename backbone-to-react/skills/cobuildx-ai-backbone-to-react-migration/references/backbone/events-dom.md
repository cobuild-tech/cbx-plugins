# Porting view events, jQuery DOM, and plugins

Read this when a unit has an `events:` hash, `this.$(`, or jQuery plugins.

- `events: {'click .btn': 'f'}` becomes `onClick` on that element. There
  is no selector-based delegation.
- `this.$('.x').addClass/show/hide` becomes a state-driven `className` or
  conditional render.
- `this.$('input').val()` becomes a controlled `value` + `onChange`.
- `initialize`, `remove()`, and `stopListening` become `useEffect` with
  cleanup.
- `_.defer` and DOM queries after `render()` become `useEffect` + `ref`.
- jQuery plugins (datepicker, select2) are wrapped first for parity:
  init in `useEffect` with a `ref`, and destroy in cleanup. Replace them
  with React-native components later, as a separate change.
- Watch for code that queries the DOM right after `render()` or depends
  on a plugin having run. Port the intent and test the timing.
