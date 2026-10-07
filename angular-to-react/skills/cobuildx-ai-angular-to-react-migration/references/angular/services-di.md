# Porting services and DI

Read this when a unit touches an `@Injectable`, `providers`,
`InjectionToken`, or `APP_INITIALIZER`. Also read
`references/react/state-data.md`.

- A stateless `@Injectable` becomes a plain module of functions.
- A stateful `providedIn: 'root'` service becomes Context + a custom hook,
  or a small store.
- Component-level `providers: [...]` become a Context provider wrapping
  that subtree.
- `InjectionToken` and config providers become a config module or
  Context.
- `APP_INITIALIZER` becomes explicit setup in `main.tsx`.
- NgRx store, effects, and selectors become Redux Toolkit (the closest one
  to one), or Context or Zustand if the store was overkill. Keep the
  action and state shapes if other code depends on them.
- Don't rebuild Angular's injector in React.
