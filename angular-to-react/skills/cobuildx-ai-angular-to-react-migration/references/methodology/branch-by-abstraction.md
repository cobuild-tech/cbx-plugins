<!-- GENERATED from shared/methodology/branch-by-abstraction.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Branch by Abstraction

Swap a dependency that everything uses, such as the data layer, session,
event bus, or store, while the app keeps running. Usually this is
secondary to Strangler Fig or Vertical slice.

## Steps (each step is its own unit)

1. **Introduce the abstraction.** Write a framework-agnostic interface,
   for example `api.getOrders()` or a `sessionStore` with
   `subscribe`/`getSnapshot`. Back it with the **old** implementation.
   Behavior doesn't change.
2. **Move callers onto the abstraction**, one area per unit. The old app
   calls it through a thin adapter and React calls it directly.
3. **Build the new implementation** behind the same interface (fetch
   client, TanStack Query, plain store) with the same endpoints, payloads,
   normalization, and cache expectations.
4. **Switch with a flag.** Run both implementations against the same
   tests. Where it's safe, run them side by side and compare.
5. **Remove the old implementation** once nothing references it and the
   flag has stayed on for a while.

## Rules

- The abstraction's snapshot must be a cached, stable reference.
  `useSyncExternalStore` loops forever if `getSnapshot` returns a new
  object on every call.
- Keep the interface the minimum both sides need. Don't rebuild the old
  framework's container, ORM, or event system behind it.
- The abstraction is temporary. Log in `decisions.md` when it will be
  deleted.
