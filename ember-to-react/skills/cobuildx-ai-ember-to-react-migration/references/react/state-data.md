<!-- GENERATED from shared/react/state-data.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# State and data in React

Read this when a unit touches shared state, services, stores, or the data
layer.

| Kind of state | Use |
|---|---|
| Local UI state | `useState` / `useReducer` |
| Derived values | Compute in render; `useMemo` only if costly |
| Server data (fetch, cache, refetch) | TanStack Query (or the team's choice) over one API client |
| App-wide singletons (session, current user, feature flags) | Context + custom hook |
| Large shared client state with many writers | A small store (Zustand / Redux Toolkit), only if Context is not enough |
| State shared with the old app during coexistence | Framework-agnostic store + `useSyncExternalStore` (see `coexistence.md`) |

## API client

- Use one `fetch` wrapper for base URL, auth headers, error mapping,
  retries, and loading indicators. It replaces the old adapters,
  interceptors, and sync.
- Keep the **same endpoints, methods, payload shapes, and normalization**.
  Port serializer, `parse()`, and transform logic as plain functions with
  unit tests.
- Match the old app's cache expectations. If the UI relied on instant
  back-navigation from a store cache, set `staleTime` and `gcTime` to
  reproduce it, and record that in the unit file.

## Async semantics

- Port cancellation explicitly. "Restartable" (latest wins) becomes an
  AbortController that aborts the previous request. "Drop" (ignore while
  running) becomes an in-flight guard. "Enqueue" becomes a promise chain.
- Debounce and throttle timing must match the original exactly.
- Mutations use the query library's mutation API with the same optimistic
  and rollback behavior as the original. If the original had none, add
  none.
