# Porting models, collections, and sync

Read this when a unit uses Models, Collections, `fetch`/`save`/`destroy`,
or `Backbone.sync`. Also read `references/react/state-data.md`.

- `defaults` + `parse()` become a typed interface + mapper function.
  `toJSON()` becomes a serialize function. Unit-test both against real
  payloads.
- `validate()` becomes a plain function (or a Zod schema) with the same
  messages.
- `comparator`, `where`, and `filter` become array functions on derived
  data.
- `url` and `urlRoot` become the API client, with the same endpoints.
  Custom `Backbone.sync` overrides (headers, `emulateHTTP`/`emulateJSON`)
  go into the fetch wrapper.
- `fetch`, `save`, and `destroy` become query hooks and mutations.
- `model.set` with `change` events becomes `useState`/`useReducer`.
- `listenTo(model, 'change', this.render)`: delete it. A state change
  re-renders. Don't recreate subscriptions in `useEffect`.
