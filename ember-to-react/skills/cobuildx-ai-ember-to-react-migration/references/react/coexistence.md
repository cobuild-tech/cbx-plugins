<!-- GENERATED from shared/react/coexistence.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Coexistence: running old and new together

Read this when the strategy is Strangler Fig or Vertical slice, in the
setup unit and in any unit that crosses the boundary.

## Route-level split (Strangler Fig)

- A reverse proxy or micro-frontend shell sends each URL to exactly one app.
- Session and auth are shared through a cookie or a token store both apps
  read.
- Both apps load the same global CSS.
- Each moved route has a toggle that can send it back to the old app.

## React inside an old-framework component (Vertical slice)

This is the general pattern. The exact lifecycle hooks are in the
framework folder.

```ts
// on host element ready (once):
root = createRoot(hostElement)
// on every input change (guard: root may not exist yet):
root?.render(<Component {...props} />)
// on host teardown:
root?.unmount(); root = null
```

- **Create the root once.** Calling `createRoot` on every render leaks
  roots and loses state.
- Callbacks from React that change old-framework state must trigger that
  framework's update mechanism.

## Shared data across the boundary

Use a framework-agnostic store that both sides read:

```ts
let snapshot = compute()                 // cached
const listeners = new Set<() => void>()
export const store = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l) },
  getSnapshot() { return snapshot },     // SAME reference until data changes
  update() { snapshot = compute(); listeners.forEach(l => l()) },
}
// React: const value = useSyncExternalStore(store.subscribe, store.getSnapshot)
```

`getSnapshot` must return a cached, stable reference. Building a new
object or calling `toJSON()` inside it makes React re-render forever.

This bridge is temporary. Delete it once both sides of it are React.
