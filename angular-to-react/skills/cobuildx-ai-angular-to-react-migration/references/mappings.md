# Angular / AngularJS → React concept map

Read this in the Plan step, and when a unit hits a concept you haven't
mapped yet. In each unit file, list only the rows you actually used.

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

Rule of thumb: if you find yourself building scaffolding in React to copy
an Angular mechanism (a DI container, a template engine, a two-way-binding
system, a digest loop, scope inheritance, an event bus), stop. That
mechanism usually solved a problem React doesn't have, or one a small
library already solves.
