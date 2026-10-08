# Running React inside a jQuery page

Read this when a unit mounts React into a jQuery page or passes values
between the two. Also read `references/react/coexistence.md`.

- Give React an empty container and call `createRoot` on it **once**.
  jQuery keeps running the rest of the page.
- **Each element has one owner.** Once React owns a container, no jQuery
  code may touch anything inside it. A stray `.html()` or `.addClass()`
  doesn't crash; React just undoes it on the next render, which makes the
  bug hard to find.
- Delegated handlers like `$(document).on('click', '.share', …)` also
  fire on elements React renders with the same class names. When an area
  moves to React, search its class names in `.on(` calls and delete those
  handlers in the same unit.
- React → jQuery messages: trigger an event (`$(document).trigger(...)` or
  a `CustomEvent`) and let the jQuery code listen.
- Values both sides read: keep them in one small store
  (`get`/`set`/`subscribe`, `set` always builds a new object) and read it
  in React with `useSyncExternalStore`.
- The events and the store are temporary. They go on the cleanup list.
