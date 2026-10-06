---
name: cobuildx-ai-ember-to-react-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize an Ember.js app (Classic or Octane) to React — full rewrites or incremental/strangler-fig migrations of any size."
metadata:
  version: "1.0.0"
---

# Ember → React Migration

Port an Ember app to React with no behavioral or visual regression. Do not
redesign, refactor beyond what the framework change requires, or "improve"
things along the way unless asked — a migration proves equivalence, it
doesn't sneak in a rewrite of the product.

## 1. Decide the strategy first

Ask: does this app have real users depending on it right now?

- **Small, low-risk, no production dependents** → full rewrite. Build the
  new app separately, verify it matches, cut over once.
- **Anything a business depends on** → incremental (Strangler Fig). Migrate
  piece by piece, old and new running side by side, until the old app has
  nothing left to strangle. Never freeze feature work for months to do a
  big-bang rewrite of a live app.

Also identify the Ember flavor before planning: **Classic** (`Ember.Component`,
computed properties, observers, mixins, two-way bindings) vs. **Octane**
(Glimmer components, `@tracked`, one-way data flow). Octane maps to React
almost one-to-one; Classic needs more untangling (observers and mixins
especially). For a large Classic app, consider whether upgrading hot spots
to Octane idioms first makes the React port safer.

Don't skip this decision or default to "just rewrite it" — the size/risk
call changes everything downstream (tooling, shell, rollback plan).

## 2. Read the whole existing app before writing anything

Every route, controller, component (`.js` + `.hbs`), service, model,
adapter/serializer, helper, modifier, mixin, initializer, and style file.
Ember's conventions hide a lot — resolver-based lookups, `model()` hooks,
`queryParams` on controllers, initializers that register things globally,
addons that inject behavior. Grep for `inject`, `service(`, `observer(`,
`Mixin.create`, `reopen`, and `lookup(` to surface implicit wiring. You
cannot correctly map what you haven't fully understood.

## 3. Map concepts before syntax

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

Rule of thumb: if you're building scaffolding in React to replicate an Ember
mechanism (a container/resolver, an observer system, a run loop, a store
with identity maps), stop — that mechanism usually solved a problem React
doesn't have, or one a small library already solves.

Watch for run-loop timing: code relying on `run.next`, `schedule('afterRender')`,
or `run.later` often encodes ordering assumptions. Port the intent
(`useEffect`, `setTimeout`, `requestAnimationFrame`) and test the timing.

## 4. Process

1. **Scaffold and verify tooling first.** Get the new project (Vite + React +
   TypeScript, or the team's framework) building, testing, and (if
   incremental) deploying — even with one empty page — before feature code.
   Port `config/environment.js` → `import.meta.env.VITE_*` now (never copy
   secrets; flag them for rotation), turn initializers into explicit setup at
   the entry point, and write the API client that replaces adapters/serializers
   (same endpoints, payloads, and normalize logic as plain functions).
2. **Map the routes.** `Router.map` → React Router: `this.route('post',
   { path: '/posts/:id' })` → `<Route path="/posts/:id">`; nested routes +
   `{{outlet}}` → layout route rendering `<Outlet/>`; `model()` → `loader` or
   a query hook; `beforeModel` redirects → `redirect()` in a loader or a
   wrapper rendering `<Navigate/>`; `{{link-to}}`/`<LinkTo @route>` → `<Link to>`;
   `transitionTo`/`router.transitionTo` → `useNavigate()`; controller
   `queryParams` → `useSearchParams`; loading/error substates → route
   `errorElement` and pending UI. **If incremental:** set up the coexistence
   layer here, before any feature: route-level split behind a reverse proxy, a
   micro-frontend shell, or React roots inside Ember components (`createRoot`
   in `didInsertElement`/a modifier, `unmount` on teardown). Share session/auth
   and keep the URL as the single source of truth across both.
3. **Migrate bottom-up**, translating each layer as you reach it. Save the
   most central piece (app shell, session service, the store) for last.
   - *Helpers, utils, models:* `helper(([a, b]) => …)` → `fn(a, b)` called in
     JSX; Ember Data models → typed interfaces + mapper functions; computed
     properties → plain getters/derived values.
   - *Presentational components:* `{{this.x}}`/`{{@x}}` → `{x}`/props;
     `class="a {{if @on 'on'}}"` → computed `className`; `{{#if}}…{{else}}`
     → ternary; `{{#each @items key="id" as |i|}}` → `.map()` + `key`;
     `{{yield}}`/named blocks → `children`/element props; `...attributes` →
     spread rest props; Classic `tagName`/`classNames` → explicit wrapper
     element; `{{did-insert}}`/custom modifiers → `ref` + `useEffect`.
   - *Stateful components:* `@tracked x` → `useState`; tracked getters →
     derived in render (`useMemo` if costly); `{{on "click" this.f}}`/
     `@action` → `onClick={f}`; `{{input value=x}}`/`mut` → `value` +
     `onChange`; `didInsertElement`/`willDestroy` → `useEffect` + cleanup;
     observers → derive, or move into the causing handler (effect last);
     `run.next`/`schedule('afterRender')` → effect/`requestAnimationFrame`.
   - *Services, data, tasks:* stateless service → module of functions;
     app-wide singleton (session, current user) → Context + hook; mixins →
     hooks/utils; `store.findAll/query` → query hooks with the same cache
     expectations; `save()` → mutations; Ember Concurrency
     `restartable`/`drop` → `AbortController`/in-flight guard, kept explicit;
     addons (`ember-intl`…) → React library, feature by feature.
4. **Port every existing test**, scenario for scenario (QUnit/ember-qunit
   integration and acceptance tests → Vitest/Jest + React Testing Library;
   acceptance → Playwright/Cypress if needed). Replace Mirage with MSW using
   the same fixtures. Never reduce coverage during a migration.
5. **Verify after every piece, not just at the end:**
   - Automated tests pass → logic is equivalent.
   - Manual browser pass, side-by-side with the original → visual/behavioral
     parity. Screenshot-diff if the tooling supports it.
   - TypeScript build is clean, production build succeeds.
6. **Keep one variable fixed while you migrate the other.** Port styles
   (CSS/SCSS, ember-css-modules, class names) as-is in the same pass as the
   logic. Note that Ember components may render a wrapper element
   (`tagName`, `classNames`, `classNameBindings`) — reproduce it if styles
   depend on it. Redesign is a separate, later change.

## 5. Deprecate old code carefully, keep a rollback path

- Remove the old Ember version of a piece only after the React version has
  been verified (tests + visual pass) — for a live app, after it's proven
  itself in production for a while, not the moment it compiles.
- Until confident, keep a way to flip a piece back to Ember quickly (a
  feature flag, a route toggle, or simply not deleting the old code yet).
- Remove Ember addons and dependencies only once nothing references them.

## Output expectations when this skill runs

- A migration plan or PR should state explicitly: rewrite vs. incremental,
  Classic vs. Octane, and why.
- List the concept mappings actually used (subset of the table above),
  not a generic essay.
- Include a verification section: what tests were ported, what was checked
  visually, what still needs manual QA.
- Flag anything ported "as a quirk" (e.g., an existing bug, observer-driven
  timing oddity, or Ember Data caching behavior kept for parity) rather than
  silently fixing it — scope creep during a migration hides real regressions.
