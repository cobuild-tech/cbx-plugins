---
name: cobuildx-ai-angular-to-react-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize an Angular (2+) or AngularJS (1.x) app to React — full rewrites or incremental/strangler-fig migrations of any size, including hybrid ngUpgrade apps."
metadata:
  version: "1.0.0"
---

# Angular / AngularJS → React Migration

Port an Angular or AngularJS app to React with no behavioral or visual
regression. Do not redesign, refactor beyond what the framework change
requires, or "improve" things along the way unless asked — a migration
proves equivalence, it doesn't sneak in a rewrite of the product.

## 1. Decide the strategy first

Ask: does this app have real users depending on it right now?

- **Small, low-risk, no production dependents** → full rewrite. Build the
  new app separately, verify it matches, cut over once.
- **Anything a business depends on** → incremental (Strangler Fig). Migrate
  piece by piece, old and new running side by side, until the old app has
  nothing left to strangle. Never freeze feature work for months to do a
  big-bang rewrite of a live app.

Then identify which Angular this is — they migrate very differently:

- **AngularJS (1.x)** — `angular.module(...)`, controllers, `$scope`,
  directives, the digest cycle, `ng-*` attributes, often ui-router. Check
  for 1.5+ `.component()` usage; component-style code maps to React far more
  cleanly than `$scope`-heavy controllers.
- **Angular 2–15** — TypeScript classes with decorators, NgModules, RxJS
  everywhere, Zone.js-driven change detection.
- **Angular 16+** — may also use signals (`signal`, `computed`, `effect`,
  `input()`, `model()`), standalone components, `inject()`, and built-in
  control flow (`@if`, `@for`, `@switch`, `@defer`).
- **Hybrid (ngUpgrade)** — AngularJS and Angular in one app. Migrate both
  halves directly to React; never finish the AngularJS → Angular upgrade
  first just to then leave Angular.

Don't skip this decision or default to "just rewrite it" — the size/risk
and version call changes everything downstream (tooling, coexistence
layer, rollback plan).

## 2. Read the whole existing app before writing anything

Every module, component, controller, directive, service/factory, pipe or
filter, template, route config, interceptor, and style file. Angular hides a
lot behind DI and configuration: providers registered in modules or at
component level, `APP_INITIALIZER`s, HTTP interceptors, route guards and
resolvers, and in AngularJS `.config()`/`.run()` blocks and `$rootScope`
events. Grep to surface implicit wiring:

- **Angular:** `providedIn`, `providers:`, `InjectionToken`,
  `APP_INITIALIZER`, `HTTP_INTERCEPTORS`, `.subscribe(`, `BehaviorSubject`,
  `@ViewChild`, `ElementRef`, `Renderer2`, `ChangeDetectorRef`, `NgZone`,
  `@HostListener`, `@HostBinding`, `canActivate`, `resolve:`.
- **AngularJS:** `$scope`, `$rootScope`, `$watch`, `$broadcast`, `$emit`,
  `$on(`, `$apply`, `$timeout`, `$compile`, `.directive(`, `.factory(`,
  `.service(`, `.provider(`, `.config(`, `.run(`, `$stateProvider`.

You cannot correctly map what you haven't fully understood.

## 3. Map concepts before syntax

### Angular (2+)

| Angular concept | React equivalent | Why |
|---|---|---|
| Component class + template (`.html`) | JSX in the component function | Markup and logic merge into one file |
| `@Input()` / `input()` | Props | Same one-way flow, no decorators |
| `@Output()` / `output()` + `EventEmitter` | Callback props (`onX`) | Events are just functions |
| `[(ngModel)]`, `model()`, two-way `[(x)]` | Controlled value + `onChange` | Every state change is visible in code |
| Component fields / signals (`signal`) | `useState` / `useReducer` | Explicit setters |
| Getters / `computed()` | Derived values in render; `useMemo` only if expensive | Don't store what you can derive |
| `effect()` | Usually derive or move into the causing handler; `useEffect` last | Same smell as observers — don't port 1:1 |
| Stateless `@Injectable` service | Plain module of functions, imported directly | Don't rebuild Angular's DI in React |
| Stateful `providedIn: 'root'` service | Context + custom hook, or a small store | App-wide singletons need an explicit owner |
| Component-level `providers: [...]` | Context provider wrapping that subtree | Same scoping, made explicit |
| `InjectionToken` / config providers | Config module or Context | Plain values, no token layer |
| RxJS `Observable` / `BehaviorSubject` state | `useState` + effect, or `useSyncExternalStore` | Keep RxJS only where streams are real (websockets, complex event composition) |
| `\| async` pipe | State set in an effect that unsubscribes in cleanup | Subscription lifetime = component lifetime |
| Pipes | Plain functions called in JSX | No registration layer; pure pipes → `useMemo` only if costly |
| Attribute directives | Custom hook, wrapper component, or callback ref | Behavior attaches to the element explicitly |
| Structural directives, `ng-template` + `ngTemplateOutlet` | Components, render props, or element props | Templates as values are just functions/JSX |
| `<ng-content>` (incl. `select=`) | `children` / named element props | Composition is built in |
| `@ViewChild` / `ElementRef` / `Renderer2` | `useRef` (+ `useEffect` for DOM work) | Direct DOM access lives at the element |
| `@HostListener` / `@HostBinding` | Handlers/attributes on the root element, or `useEffect` for `window`/`document` | No host element in React |
| `ngOnInit` / `ngOnChanges` / `ngOnDestroy` / `ngAfterViewInit` | `useEffect` with deps and cleanup | Pair setup and teardown in one place |
| Zone.js / `ChangeDetectorRef` / `OnPush` | Nothing — React re-renders on state change | Delete `detectChanges`/`markForCheck` calls |
| `HttpClient` + interceptors | One `fetch` wrapper (auth headers, errors, retries) + TanStack Query | Keep the same endpoints and payloads |
| Router, guards, resolvers, `loadChildren` | React Router: wrapper/loader redirects, loaders, `lazy` routes | URL → screen unchanged |
| Reactive / template-driven forms + validators | Controlled inputs, or react-hook-form for large forms; port validators as plain functions | Keep the same rules, messages, and touched/dirty behavior |
| NgRx store / effects / selectors | Redux Toolkit (closest 1:1) — or Context/Zustand if the store was overkill | Keep action and state shapes if other code depends on them |
| `trackBy` / `@for (...; track x)` | `key` in `.map()` | Same purpose: stable identity |
| Angular Material / CDK | Audit each component; pick a React library (MUI, Radix, …) or wrap | Each UI dependency is a migration of its own |
| `@angular/localize` / ngx-translate | react-intl or i18next, same message keys | Translations stay reusable |
| `@angular/animations` | CSS transitions, or Framer Motion | Port timings exactly |

### AngularJS (1.x)

| AngularJS concept | React equivalent | Why |
|---|---|---|
| Controller + template, `$scope` / `controllerAs: 'vm'` | Function component; scope fields → state, props, or locals | No scope hierarchy — data is passed explicitly |
| `.component()` bindings `<` / `@` | Props | Already one-way |
| Bindings `&` | Callback props | Same "actions up" model |
| Bindings `=` (two-way) | `value` + `onChange` props | Make the two-way contract explicit |
| Scope inheritance (child reads parent `$scope`) | Props or Context | Implicit inheritance becomes explicit flow |
| Directive with `link` / DOM work | Component + `useRef` + `useEffect` | DOM access lives at the element |
| `transclude` / `ng-transclude` | `children` / named element props | Composition is built in |
| `$watch` / `$watchCollection` | Derive in render, or move into the causing handler; `useEffect` last | Watchers are the observer smell — don't port 1:1 |
| `$digest` / `$apply` / `$evalAsync` | Nothing — delete | React schedules renders itself |
| `$timeout` / `$interval` | `setTimeout` / `setInterval` in an effect with cleanup | No digest to trigger |
| `$rootScope.$broadcast` / `$emit` / `$on` | Lift state up, Context, or a small store — only if needed | Implicit pub/sub becomes explicit data flow |
| `.factory` / `.service` / `.provider` | Plain module, custom hook, or Context for stateful singletons | Don't rebuild the injector |
| `.config()` / `.run()` blocks | Explicit setup at the app entry point | Make global setup visible |
| `$http` + interceptors, `$resource` | One `fetch` wrapper + TanStack Query | Same endpoints, payloads, transforms |
| `$q` | Native `Promise` / `async`–`await` | Watch for code relying on `$q` triggering a digest |
| Filters (`{{ x \| currency }}`) | Plain functions called in JSX | No registration layer |
| `ng-repeat` (`track by`) | `.map()` with stable `key` | Same identity purpose |
| `ng-if` vs. `ng-show` / `ng-hide` | Conditional render vs. `hidden`/CSS | `ng-show` keeps the DOM alive — preserve that where focus, input state, or measurements depend on it |
| `ng-class` / `ng-style` | Computed `className` / `style` object | Plain expressions |
| `ng-model` + `ng-model-options` (`debounce`, `updateOn`) | Controlled input + explicit debounce | Keep the same timing |
| Form controller (`$valid`, `$dirty`, `$touched`, `$error`) | react-hook-form (or local state), validators as plain functions | Keep the same rules and when errors show |
| `ng-bind-html` / `$sce` | Audit; sanitize (DOMPurify) + `dangerouslySetInnerHTML` only if truly needed | Don't lose the sanitization AngularJS gave you |
| ui-router states, `resolve`, `$stateParams`, `ui-sref` | React Router nested routes, loaders, `useParams`, `<Link to>` | Preserve every URL and hash vs. HTML5 mode |
| `ngRoute` (`$routeProvider`, `ng-view`) | React Router + layout route rendering `<Outlet/>` | Same URL → screen mapping |
| One-time binding (`::x`) | Nothing — plain render | Perf hint with no React equivalent |

Rule of thumb: if you're building scaffolding in React to replicate an
Angular mechanism (a DI container, a template engine, a two-way-binding
system, a digest loop, scope inheritance, an event bus), stop — that
mechanism usually solved a problem React doesn't have, or one a small
library already solves.

Watch for timing assumptions: Angular code that relies on Zone.js
re-rendering after any `setTimeout`/promise, `setTimeout(() => …, 0)` to
wait for the view, or AngularJS `$timeout` to wait for a digest, often
encodes ordering the app depends on. Port the intent (`useEffect`, refs,
`requestAnimationFrame`) and test the timing.

## 4. Process

1. **Scaffold and verify tooling first.** Get the new project (Vite + React +
   TypeScript, or the team's framework) building, testing, and (if
   incremental) deploying — even with one empty page — before feature code.
   Port `environment.ts` (or AngularJS `.constant()`/config globals) →
   `import.meta.env.VITE_*` now (never copy secrets; flag them for
   rotation). Write the one `fetch` wrapper that replaces `HttpClient`/`$http`
   and every interceptor (auth headers, error handling, retries, loading
   indicators). Turn `APP_INITIALIZER`s and `.run()` blocks into explicit
   setup at the entry point. Older AngularJS apps may use Grunt/Gulp,
   script-tag globals, or Bower; decide early how the build will bridge them.
2. **Map the routes.** Angular `Routes` / ui-router states / `$routeProvider`
   → React Router: `routerLink`/`ui-sref`/`href="#!/x"` → `<Link to>`;
   `router.navigate`/`$state.go`/`$location.path` → `useNavigate()`;
   `redirectTo`/`otherwise` → `<Navigate replace/>`; guards/`resolve` →
   loaders or a wrapper rendering `<Navigate/>`; resolvers → `loader`;
   `loadChildren` → `lazy` routes; a component or state template holding
   `<router-outlet>`/`ui-view`/`ng-view` → layout route rendering
   `<Outlet/>`; abstract ui-router states → pathless layout routes. Preserve
   hash vs. HTML5 mode (`HashRouter` vs. `BrowserRouter`), the `#!` prefix if
   used, and every existing URL. **If incremental:** set up the coexistence
   layer here, before any feature (see section 5).
3. **Migrate bottom-up**, translating each layer as you reach it. Save the
   most central piece (app shell, auth/session service, root store) for
   last; top-down touches everything at once.
   - *Models, pipes, filters, utils:* classes (`new User(json)`) → typed
     interfaces + mapper functions, same field names; `x | pipe:arg` /
     `{{ x | filter:arg }}` → `fn(x, arg)`.
   - *Presentational components:* `{{x}}`/`[attr]="x"`/`ng-bind` → `{x}`/
     `attr={x}`; `class`/`style="w:4px"` → `className`/
     `style={{ width: '4px' }}`; `[ngClass]`/`ng-class` → computed
     `className`; `*ngIf`/`@if`/`ng-if` → `cond && <A/>` or ternary;
     `ng-show` → `hidden`/CSS where DOM must persist; `*ngFor`/`@for`/
     `ng-repeat` → `.map()` + stable `key`; `ngSwitch`/`ng-switch` → lookup
     object; `@Input`/`@Output`/bindings → props/`onX` callbacks;
     `<ng-content>`/`ng-transclude` → `children` or element props;
     `@ViewChild` → `useRef`.
   - *Stateful components and controllers:* `(click)`/`ng-click` →
     `onClick`; `(ngSubmit)`/`ng-submit` → `onSubmit` + `preventDefault()`;
     `[(ngModel)]`/`ng-model` → `value` + `onChange`; `FormGroup`/form
     controllers → controlled inputs (react-hook-form if large), same
     validators and messages; `ngOnInit`/`ngOnDestroy`/`ngOnChanges`/
     `$onInit`/`$onDestroy`/`$onChanges` → `useEffect` + cleanup + deps;
     `$watch` → derive or handler (effect last); `params.subscribe`/
     `$stateParams` → `useParams()` + effect keyed on the param, ignoring
     stale responses; delete `$apply`/`detectChanges`/`markForCheck`.
   - *Services, RxJS, events:* stateless service/factory → module of
     functions; stateful root service → Context + hook (or a store);
     `| async` → state set in an effect that unsubscribes;
     `switchMap`/`debounceTime` → effect cleanup (`clearTimeout`/
     `AbortController`); `$broadcast`/`$on` and `Subject` buses → lifted
     state, Context, or a small store; NgRx → Redux Toolkit with the same
     action and state shapes, or a lighter store if it was overkill.
   - *Directives:* attribute directives → hooks, wrapper components, or
     callback refs; `link`-function directives and jQuery plugins → `ref` +
     `useEffect` (destroy in cleanup); `$compile`-based dynamic templates →
     components chosen from a lookup object. Identical templates → one
     shared component with props.
   - *UI libraries:* Angular Material/CDK, UI Bootstrap, PrimeNG, etc. →
     audit every component used; map each to a React library or wrap it, and
     note behavior differences (focus trapping, overlays, keyboard handling).
4. **Port every existing test**, scenario for scenario: Jasmine/Karma (and
   `angular-mocks`/`TestBed`) → Vitest/Jest + React Testing Library;
   `HttpTestingController`/`$httpBackend` → MSW with the same fixtures;
   Protractor/Cypress e2e → Playwright or Cypress against the same flows.
   Never reduce coverage; where specs are only "should create", or a piece
   has no tests, write characterization tests against the old behavior
   before porting it.
5. **Verify after every piece, not just at the end:**
   - Automated tests pass → logic is equivalent.
   - Manual browser pass, side-by-side with the original → visual/behavioral
     parity. Screenshot-diff if the tooling supports it.
   - TypeScript build is clean, production build succeeds.
6. **Keep one variable fixed while you migrate the other.** Port styles
   (SCSS/CSS custom properties, class names) as-is in the same pass as the
   logic. Emulated view encapsulation → CSS Modules (or a shared sheet with
   the same rules); `:host` → a class on the component's root element;
   `::ng-deep` overrides → global or parent-scoped rules with the same
   effect. Angular components render a host element (`<app-foo>`) — if
   styles or selectors depend on it, reproduce it as a wrapper element.
   Redesign is a separate, later change — never framework and design
   together.

## 5. Coexistence layer (incremental migrations)

Pick the coarsest split that works; finer granularity costs more glue.

- **Route-level split** (works for every version): a reverse proxy or
  micro-frontend shell serves some URLs from React and the rest from
  Angular. Share session/auth (cookie or a shared token store) and keep the
  URL as the single source of truth across both.
- **React inside Angular (2+):** a thin wrapper component with a host
  element. Create the root once in `ngAfterViewInit`
  (`this.root = createRoot(this.host.nativeElement)`), call
  `this.root.render(<Component {...props} />)` there and in `ngOnChanges`
  (guard with `this.root?.` — the first `ngOnChanges` runs before
  `ngAfterViewInit`), and `this.root.unmount()` in `ngOnDestroy`. Callbacks from React that
  change Angular state must run inside `NgZone.run(...)` (unless the app is
  zoneless/signals-driven), or the Angular view won't update.
- **React inside AngularJS:** a `.component()` wrapper (or `react2angular`)
  that creates the root once in `$postLink`, re-renders in `$onChanges`
  (guarded — the first `$onChanges` runs before `$postLink`), and unmounts
  in `$onDestroy`. Callbacks from React that change AngularJS state
  must trigger a digest (`$scope.$applyAsync(...)`), or the view won't
  update.
- **Angular inside React** (less common, for a shell-first migration):
  Angular Elements exposes Angular components as custom elements React can
  render.
- **Shared data across the boundary:** move shared state into a
  framework-agnostic module (a plain store with `subscribe`/`getSnapshot`)
  that both sides read. On the React side use `useSyncExternalStore`; the
  snapshot must be a cached, stable reference — never build a new object in
  `getSnapshot`, or React re-renders forever. Wrapping an existing RxJS
  `BehaviorSubject` works the same way if its values are immutable. This is
  a temporary bridge, deleted once both sides of it are React.

## 6. Deprecate old code carefully, keep a rollback path

- Remove the old Angular/AngularJS version of a piece only after the React
  version has been verified (tests + visual pass) — for a live app, after
  it's proven itself in production for a while, not the moment it compiles.
- Until confident, keep a way to flip a piece back quickly (a feature flag,
  a route toggle, or simply not deleting the old code yet). This is
  deliberate overhead — pay it until you're sure you won't need it.
- Remove `@angular/*`, `zone.js`, `rxjs` (if nothing else uses it),
  `angular`, `angular-mocks`, UI libraries, and polyfills only once nothing
  references them — check globals, `index.html` script tags, and build
  config, not just imports.

## Output expectations when this skill runs

- A migration plan or PR should state explicitly: which Angular (AngularJS,
  Angular 2–15, 16+, or hybrid), rewrite vs. incremental, the coexistence
  layer chosen, and why.
- List the concept mappings actually used (subset of the tables above),
  not a generic essay.
- Include a verification section: what tests were ported, what was checked
  visually, what still needs manual QA.
- Flag anything ported "as a quirk" (e.g., an existing bug, digest- or
  Zone.js-driven timing oddity, or interceptor behavior kept for parity)
  rather than silently fixing it — scope creep during a migration hides real
  regressions.
