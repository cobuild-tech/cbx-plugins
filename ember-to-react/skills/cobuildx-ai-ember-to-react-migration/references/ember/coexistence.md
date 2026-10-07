# Running React inside Ember

Read this when the strategy is Vertical slice, or when a unit mounts React
inside an Ember template. Also read `references/react/coexistence.md`.

- Use a wrapper component or a modifier. Create the root once on insert
  (`didInsertElement` or a `{{did-insert}}` modifier), re-render it when
  args change (`didUpdateAttrs`, or a tracked getter read by a modifier),
  and `unmount()` on teardown (`willDestroyElement` or the modifier's
  destructor).
- Pass Ember actions into React as callback props. When a callback
  changes Ember state, write to `@tracked` state so Ember re-renders.
- Shared services (session, current user) become a framework-agnostic
  store. Ember reads it through a service that wraps it. React reads it
  through `useSyncExternalStore`.
