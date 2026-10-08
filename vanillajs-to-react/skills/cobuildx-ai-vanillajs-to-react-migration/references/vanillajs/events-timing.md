# Events, timers, and observers

Read this when a unit has `addEventListener`, timers,
`requestAnimationFrame`, or observers.

- `addEventListener` on an element becomes the matching JSX prop on the
  same element.
- Delegation on a parent becomes a handler on each item, or one on the
  list that reads the item from props, not from `event.target` classes.
- Listeners on `window` or `document` go in a `useEffect` that removes
  them in its cleanup.
- `setTimeout`, `setInterval`, `requestAnimationFrame`,
  `IntersectionObserver`, `ResizeObserver`, and `MutationObserver` go in
  effects with cleanup. Strict Mode mounts twice in development, so
  cleanup must really stop them.
- Code that queried the DOM right after changing it becomes an effect with
  a `ref`. Use refs only for focus, scrolling, and measuring.
