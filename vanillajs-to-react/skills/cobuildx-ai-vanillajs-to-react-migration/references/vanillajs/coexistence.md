# Running React inside a vanilla JS page

Read this when a unit mounts React into the page or shares values with
old scripts. Also read `references/react/coexistence.md`.

- Pick one self-contained area, give it an empty container, and call
  `createRoot` on it **once**. The old scripts keep running the rest.
- **Each element has one owner.** Once React owns a container, old code
  must not touch anything inside it. Move whole areas at once, and delete
  the old code for an area in the same unit that hands it over.
- If old code removes the container, unmount the root first.
- Values both sides need: keep them in one small store
  (`get`/`set`/`subscribe`; `set` always builds a new object, because
  React compares by reference) and read it in React with
  `useSyncExternalStore`. Old code calls `store.set(...)`.
- React → old code signals: a `CustomEvent` on `document`.
- The store and the events are temporary. They go on the cleanup list.
