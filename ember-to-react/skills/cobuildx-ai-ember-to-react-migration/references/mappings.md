# Ember → React concept map

Read this in the Plan step, and when a unit hits an Ember concept you
haven't mapped yet. In each unit file, list only the rows you actually
used.

| Ember concept | React equivalent | Why |
|---|---|---|
| Component class + `.hbs` template | JSX in the component function | Markup and logic merge into one file |
| `{{#if}}` / `{{#each}}` / `{{yield}}` | `&&`/ternary, `.map()` with `key`, `children` / render props | Plain JS control flow; named blocks → named props |
| `@arg` / `this.args` | Props | Same one-way flow |
| Actions (`@action`, `{{on "click"}}`, closure actions) | Event handler functions / callback props | Data down, actions up is already React's model |
| `@tracked` properties | `useState` | Explicit setters instead of autotracking |
| Computed properties / tracked getters | Derived values computed in render; `useMemo` only if expensive | Don't store what you can derive |
| Observers | Usually: derive it, or move into the event handler that caused the change. `useEffect` as last resort | Observers are almost always a smell; don't port them 1:1 as effects |
| Two-way binding (`{{input value=x}}`, `mut`) | Controlled input (`value` + `onChange`) | Every state change is visible in code |
| Services (`@service`) | Plain modules, custom hooks, or Context for app-wide singletons (session, current user) | Don't rebuild Ember's container/DI in React |
| Mixins | Custom hooks or plain utility functions | Composition over inheritance |
| Helpers | Plain functions called in JSX | No registration layer needed |
| Modifiers (`did-insert`, custom) | `ref` + `useEffect`, or a callback ref | Direct DOM access lives at the element |
| Lifecycle (`didInsertElement`, `willDestroy`) | `useEffect` with cleanup | Pair setup and teardown in one place |
| Router + route `model()` hooks | React Router (loaders) or a data-fetching lib (TanStack Query) | URL → screen unchanged; data loading moves to loaders/hooks |
| Controllers + `queryParams` | Component state + `useSearchParams` | Controllers have no React counterpart; state lives in the route component |
| Ember Data (models, store, adapters, serializers) | API client module + TanStack Query (or similar); port serializer logic as plain normalize functions | Keep the same request/response shapes; don't build an ORM unless needed |
| Ember Concurrency tasks | `async` handlers + AbortController, or TanStack Query mutations | Cancellation and "drop/restartable" semantics must be preserved explicitly |
| Initializers / instance-initializers | Module-level setup or app-root providers | Make global setup explicit at the entry point |
| `ember-intl` / addon features | React equivalent library (e.g. `react-intl`), mapped feature by feature | Audit every addon — each is a hidden dependency |

Rule of thumb: if you find yourself building scaffolding in React to copy
an Ember mechanism (a container or resolver, an observer system, a run
loop, a store with identity maps), stop. That mechanism usually solved a
problem React doesn't have, or one a small library already solves.
