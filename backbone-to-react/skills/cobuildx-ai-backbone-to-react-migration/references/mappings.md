# Backbone → React concept map

Read this in the Plan step, and when a unit hits a concept you haven't
mapped yet. In each unit file, list only the rows you actually used.

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

Rule of thumb: if you find yourself building scaffolding in React to copy
a Backbone mechanism (an event bus, observable models with change events,
manual `render()` calls, selector-based event delegation), stop. That
mechanism usually solved a problem React doesn't have.
