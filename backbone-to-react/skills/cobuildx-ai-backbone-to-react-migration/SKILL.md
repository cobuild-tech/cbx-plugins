---
name: cobuildx-ai-backbone-to-react-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize a Backbone.js app (including Marionette, jQuery, and Underscore/Handlebars templates) to React — full rewrites or incremental/strangler-fig migrations of any size."
metadata:
  version: "1.0.0"
---

# Backbone → React Migration

Port a Backbone app to React with no behavioral or visual regression. Do not
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

Backbone is unusually well-suited to incremental migration: a View owns a
single `el`, so a React root can be mounted inside any view's element and
the two can coexist at component granularity, not just route granularity.

Don't skip this decision or default to "just rewrite it" — the size/risk
call changes everything downstream (tooling, shell, rollback plan).

## 2. Read the whole existing app before writing anything

Every View, Model, Collection, Router, template (Underscore/Handlebars/
Mustache), plugin, and style file. Backbone apps have no enforced
structure, so the real architecture lives in conventions: a global event
bus (`Backbone.Events`/`vent`/Radio), shared model instances passed between
views, jQuery plugins mutating the DOM, `window.App` namespaces, and
monkey-patched `Backbone.sync`. Grep for `.on(`, `listenTo`, `trigger(`,
`$(`, `Backbone.sync`, and global namespaces to surface implicit wiring.
Also identify Marionette (Regions, LayoutViews, CollectionViews, Behaviors)
if present. You cannot correctly map what you haven't fully understood.

## 3. Map concepts before syntax

| Backbone concept | React equivalent | Why |
|---|---|---|
| View + template (`_.template`, Handlebars) | JSX in the component function | Markup and logic merge into one file |
| `render()` re-rendering via `this.$el.html(...)` | Declarative render from props/state | React reconciles; no manual re-render calls |
| `events: { 'click .btn': 'onClick' }` | `onClick` on the element | Handlers live on the element, no selector-based delegation |
| jQuery DOM manipulation (`this.$('.x').addClass`) | State-driven JSX (`className`, conditional render) | Describe the result, don't mutate the DOM |
| Model attributes + `model.set` / `change` events | `useState`/`useReducer`, or a store for shared data | Explicit updates instead of event-driven mutation |
| Collections | Arrays in state / server-cache hooks; port comparators/filters as plain functions | Data is plain arrays; sorting/filtering is derived |
| `listenTo(model, 'change', this.render)` | Re-render happens automatically when state/props change | Delete these — don't recreate subscriptions in `useEffect` |
| Model `validate()` | Plain validation functions (or a schema lib like Zod) | Keep the same rules and messages |
| `Backbone.sync` / `fetch` / `save` / REST URLs | API client module + TanStack Query (or similar) | Keep the same endpoints, payloads, and custom sync overrides |
| Global event bus (`Backbone.Events`, Radio, `vent`) | Lift state up, Context, or a small store (Zustand) — **only if needed** | Implicit pub/sub becomes explicit data flow |
| Subviews / nested views, Marionette Regions | Child components rendered in JSX | Composition is built in |
| Marionette CollectionView | `.map()` with stable `key` (model `id`/`cid`) | Same identity purpose |
| Marionette Behaviors / mixins via `_.extend` | Custom hooks | Composition over inheritance |
| `initialize` / `remove()` / `stopListening` | `useEffect` with cleanup | Pair setup and teardown in one place |
| Backbone.Router + `Backbone.history` | React Router | URL → screen unchanged; preserve hash vs. pushState mode and existing URLs |
| jQuery plugins (datepickers, select2, etc.) | React-native equivalent, or wrap via `ref` + `useEffect` | Wrap first for parity; replace later as a separate change |

Rule of thumb: if you're building scaffolding in React to replicate a
Backbone mechanism (an event bus, observable models with change events,
manual `render()` calls, selector-based event delegation), stop — that
mechanism usually solved a problem React doesn't have.

Watch for DOM-ordering assumptions: code that queries the DOM right after
`render()`, relies on `_.defer`, or depends on a jQuery plugin having run.
Port the intent (`useEffect`, refs) and test the timing.

## 4. Process

1. **Scaffold and verify tooling first.** Get the new project (Vite + React +
   TypeScript) building, testing, and (if incremental) deploying — even with
   one empty page — before feature code. Older Backbone apps often use
   RequireJS/AMD, Browserify, or script-tag globals; decide early how the
   build will bridge them. Move config/`window.App` globals to
   `import.meta.env.VITE_*` or modules (never copy secrets; flag them for
   rotation), and write the API client that replaces `Backbone.sync`
   (same `url`/`urlRoot` endpoints, payloads, `parse()` and `toJSON()` logic,
   and any custom sync overrides like headers or emulateHTTP).
2. **Map the routes.** `Backbone.Router` → React Router: `routes:
   { 'posts/:id': 'show' }` → `<Route path="/posts/:id">`; `*splat` → `*`;
   optional `(/:page)` → separate routes or optional segments; route handler
   that swaps views into a region → layout route rendering `<Outlet/>`;
   `navigate(url, {trigger: true})` → `useNavigate()`; `<a href="#x">` →
   `<Link to>`. Preserve hash vs. pushState (`HashRouter` vs.
   `BrowserRouter`) and every existing URL. **If incremental:** set up the
   coexistence layer here, before any feature: a Backbone View that creates
   its React root **once** (`this.root ??= createRoot(this.el)`), calls
   `this.root.render(<Component {...props} />)` in `render()` — which
   Backbone code may call repeatedly — and calls `this.root.unmount()` before
   `Backbone.View.prototype.remove.call(this)` in `remove()`. Never call
   `createRoot` on every render. To share data, wrap models/collections in a
   hook built on `useSyncExternalStore`, subscribing to
   `change`/`add`/`remove`/`reset`/`sort`. The snapshot must be cached:
   recompute it (`model.toJSON()`, `collection.toJSON()`) only inside the
   event handler and return the same reference otherwise — returning a fresh
   `toJSON()` from `getSnapshot` causes an infinite re-render loop. This is a
   temporary bridge, deleted once the data layer is migrated.
3. **Migrate bottom-up**, translating each layer as you reach it. Save the
   app shell, router, and central shared models/event bus for last.
   - *Models, collections, utils:* `defaults` + `parse()` → typed interface +
     mapper function; `validate()` → plain function with the same messages;
     `comparator`/`where`/`filter` → array functions on derived data;
     template helpers (`_.escape`, formatters) → plain functions.
   - *Presentational views:* `<%= x %>`/`{{x}}` → `{x}` (`<%- %>` and `{{{x}}}`
     unescaped → audit; only `dangerouslySetInnerHTML` if truly needed);
     `<% if %>`/`{{#if}}` → ternary/`&&`; `_.each`/`{{#each}}` → `.map()` +
     `key` (`id`/`cid`); `tagName`/`className`/`attributes` → explicit
     wrapper element; subviews/Regions → child components; CollectionView →
     `.map()`.
   - *Interactive views:* `events: {'click .btn': 'f'}` → `onClick` on that
     element; `this.$('.x').addClass/show/hide` → state-driven `className`/
     conditional render; `this.$('input').val()` → controlled `value` +
     `onChange`; `listenTo(model, 'change', this.render)` → delete (state
     change re-renders); `initialize`/`remove()`/`stopListening` →
     `useEffect` + cleanup; `_.defer`/post-render DOM queries → `useEffect`
     + `ref`; jQuery plugins → wrap via `ref` + `useEffect` (destroy in
     cleanup), replace later.
   - *Shared state and data:* `model.set`/`change` → `useState`/`useReducer`;
     shared model instances/event bus (`vent`, Radio) → lift state up,
     Context, or a small store only if needed; `fetch`/`save`/`destroy` →
     query hooks and mutations on the same endpoints; Behaviors/`_.extend`
     mixins → custom hooks.
4. **Port every existing test**, scenario for scenario (Jasmine/Mocha/QUnit
   + Sinon → Vitest/Jest + React Testing Library; fake servers → MSW with
   the same fixtures). Many Backbone apps are under-tested — if a piece has
   no tests, write characterization tests against the old behavior before
   porting it. Never reduce coverage during a migration.
5. **Verify after every piece, not just at the end:**
   - Automated tests pass → logic is equivalent.
   - Manual browser pass, side-by-side with the original → visual/behavioral
     parity. Screenshot-diff if the tooling supports it.
   - TypeScript build is clean, production build succeeds.
6. **Keep one variable fixed while you migrate the other.** Port styles
   (CSS/SCSS/LESS, class names) as-is in the same pass as the logic.
   Backbone views render a wrapper element (`tagName`, `className`, `id`,
   `attributes`) — reproduce it if styles or selectors depend on it.
   Redesign is a separate, later change.

## 5. Deprecate old code carefully, keep a rollback path

- Remove the old Backbone version of a piece only after the React version
  has been verified (tests + visual pass) — for a live app, after it's
  proven itself in production for a while, not the moment it compiles.
- Until confident, keep a way to flip a piece back to Backbone quickly (a
  feature flag, a route toggle, or simply not deleting the old code yet).
- Remove jQuery, Underscore, and Backbone only once nothing references them —
  check plugins and globals, not just imports.

## Check current React library APIs

React and the libraries this migration lands on (React Router, TanStack Query, Zustand) change
between major versions — for example data loaders and `lazy` routes in
React Router 6.4+/7, or the TanStack Query v5 API. Before writing code
against them, check the versions in the target project's `package.json` and
confirm the current API:

- If the `context7` MCP server is available, call `resolve-library-id` for
  the library, then `query-docs` with the exact feature (e.g. "React Router
  loader redirect", "TanStack Query useMutation optimistic update").
- Send only library names and feature questions. Never send the app's
  source code, configuration, secrets, or business data to it.
- If it isn't available, read the installed packages' own docs and type
  definitions instead.

## Output expectations when this skill runs

- A migration plan or PR should state explicitly: rewrite vs. incremental,
  and why (and whether Marionette is involved).
- List the concept mappings actually used (subset of the table above),
  not a generic essay.
- Include a verification section: what tests were ported, what was checked
  visually, what still needs manual QA.
- Flag anything ported "as a quirk" (e.g., an existing bug, event-ordering
  oddity, or custom `sync` behavior kept for parity) rather than silently
  fixing it — scope creep during a migration hides real regressions.
