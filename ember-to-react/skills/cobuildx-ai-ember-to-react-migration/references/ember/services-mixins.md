# Porting services, mixins, observers, and helpers

Read this when a unit touches a service, mixin, observer, or helper. Also
read `references/react/state-data.md`.

- **Stateless service** becomes a module of plain functions, imported
  directly.
- **Stateful app-wide service** (session, current user, feature flags)
  becomes Context plus a custom hook. If the old app still needs it during
  coexistence, use a framework-agnostic store (see
  `references/react/coexistence.md`).
- **Mixins** become custom hooks (stateful) or utility functions
  (stateless). Find every class that uses each mixin before porting.
- **Observers**: first try deriving the value in render. Otherwise move
  the logic into the event handler that caused the change. Use
  `useEffect` only as a last resort, and record the reason in the unit
  file.
- **Helpers**: `helper(([a, b]) => …)` becomes `fn(a, b)` called in JSX.
- `reopen` and `lookup(` calls are hidden wiring. Find what they patch or
  resolve and make it an explicit import.
