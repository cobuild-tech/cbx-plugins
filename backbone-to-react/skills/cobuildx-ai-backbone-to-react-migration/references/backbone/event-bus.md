# Porting the event bus and shared models

Read this when a unit touches `Backbone.Events`, `vent`, Radio,
`trigger(`, or model instances shared between views.

- Map each event: who triggers it, and who listens.
- Replace it with the lightest option that works: lift state to a common
  parent, use Context, or use a small store (Zustand), **only if needed**.
- Shared model instances become one source of state, read by every
  consumer.
- During coexistence, a shared model or collection becomes a hook built on
  `useSyncExternalStore` (see `coexistence.md`).
