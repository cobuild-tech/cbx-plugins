# Running React inside Backbone

Read this when the strategy is Vertical slice or Strangler Fig, or when a
unit crosses the boundary. Also read `references/react/coexistence.md`.

- A Backbone View creates its React root **once**
  (`this.root ??= createRoot(this.el)`). It calls
  `this.root.render(<Component {...props} />)` in `render()`, which
  Backbone code may call repeatedly, and calls `this.root.unmount()`
  before `Backbone.View.prototype.remove.call(this)` in `remove()`. Never
  call `createRoot` on every render.
- To share data, wrap models and collections in a hook built on
  `useSyncExternalStore` that subscribes to `change`, `add`, `remove`,
  `reset`, and `sort`. Recompute the snapshot (`toJSON()`) **only inside
  the event handler**, and return the same reference otherwise. A fresh
  `toJSON()` in `getSnapshot` loops forever.
- The bridge is temporary. Delete it once the data layer is migrated.
- **Removing Backbone:** remove jQuery, Underscore, and Backbone only when
  nothing references them. Check plugins, globals, and script tags, not
  just imports.
