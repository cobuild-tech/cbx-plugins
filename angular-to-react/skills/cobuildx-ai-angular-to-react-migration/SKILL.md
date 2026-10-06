---
name: cobuildx-ai-angular-to-react-migration
description: "Use when the user asks to migrate, port, rewrite, or modernize an Angular (or AngularJS) app to React — full rewrites or incremental/strangler-fig migrations of any size."
metadata:
  version: "1.0.0"
---

# Angular → React Migration

Port an Angular app to React with no behavioral or visual regression. Do not
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

Don't skip this decision or default to "just rewrite it" — the size/risk
call changes everything downstream (tooling, micro-frontend shell, rollback
plan).

## 2. Read the whole existing app before writing anything

Every component, service, template, style file. You cannot correctly map
what you haven't fully understood. For anything non-trivial, do this
exploration before touching the new codebase, not in parallel with it.

## 3. Map concepts before syntax

This is the core translation table — internalize it, don't re-derive it per project:

| Angular concept | React equivalent | Why |
|---|---|---|
| Template (`.html`) + component class | JSX in the component function | Markup and logic merge into one file |
| Two-way binding (`[(ngModel)]`) | Controlled input (`value` + `onChange`) | Explicit over implicit — every state change is visible in code |
| `@Input()` / `@Output()` | Props / callback props | No decorators, no metadata layer |
| Injectable service + DI container | Plain functions, imported directly | Most services are just grouped functions — don't rebuild Angular's DI in React |
| Component state + DI-shared services | `useState` locally, custom hook for shared logic | Extract the "brain" into a hook, keep the component focused on rendering |
| `trackBy` in `*ngFor` | `key` prop in `.map()` | Same purpose: stable identity across re-renders |
| Angular Router | React Router (or a framework's router) | Concept unchanged — URL maps to screen |
| NgRx / large shared state via services | Context, or Redux/Zustand — **only if actually needed** | Don't reach for a state library before you feel the pain of not having one |

Rule of thumb: if you're building scaffolding in React to replicate an
Angular mechanism (a DI container, a template engine, a two-way-binding
system), stop — that mechanism usually solved a problem React doesn't have.

## 4. Process

1. **Scaffold and verify tooling first.** Get the new project building,
   testing, and (if incremental) deploying — even with one empty page —
   before writing feature code. Port `environment.ts` → `import.meta.env.VITE_*`
   now (never copy secrets; flag them for rotation), and write the one `fetch`
   wrapper that replaces `HttpClient` + interceptors (auth headers, errors).
2. **Map the routes.** Angular `Routes` → React Router: `routerLink` → `<Link to>`,
   `router.navigate` → `useNavigate()`, `redirectTo` → `<Navigate replace/>`,
   guard → wrapper rendering `<Navigate/>`, resolver → `loader`. A component
   holding `<router-outlet>` becomes a layout route rendering `<Outlet/>`.
   **If incremental:** this is also where the shell/route-level split lets
   Angular and React pages coexist — set it up before any real feature.
3. **Migrate bottom-up**, translating each layer as you reach it. Save the
   most central piece for last; top-down touches everything at once.
   - *Models, pipes, utils:* classes (`new User(json)`) → typed mapper
     functions, same field names; `x | pipe:arg` → `pipe(x, arg)`.
   - *Presentational components:* `{{x}}`/`[attr]="x"` → `{x}`/`attr={x}`;
     `class`/`style="w:4px"` → `className`/`style={{ width: '4px' }}`;
     `[ngClass]` → computed `className`; `*ngIf`/`@if` → `cond && <A/>` or
     ternary; `*ngFor`/`@for` + `trackBy` → `.map()` + stable `key`;
     `ngSwitch` → lookup object; `@Input`/`@Output` → props/`onX` callbacks;
     `<ng-content>` → `children` or element props; `@ViewChild` → `useRef`.
   - *Stateful components:* `(click)` → `onClick`; `(ngSubmit)` → `onSubmit`
     + `preventDefault()`; `[(ngModel)]` → `value` + `onChange`; `FormGroup`
     → controlled inputs (react-hook-form if large); `ngOnInit`/`ngOnDestroy`/
     `ngOnChanges` → `useEffect` + cleanup + deps; `params.subscribe` →
     `useParams()` + effect keyed on the param, ignoring stale responses.
   - *Services and RxJS:* stateless service → module of functions; stateful
     root service → Context + hook; `| async` → state set in an effect that
     unsubscribes; `switchMap`/`debounceTime` → effect cleanup
     (`clearTimeout`/`AbortController`). Identical templates → one shared
     component with props.
4. **Port every existing test**, scenario for scenario (Jasmine/Karma →
   Vitest/Jest + React Testing Library). Never reduce coverage; where specs
   are only "should create", add behavior tests for what the piece does.
5. **Verify after every piece, not just at the end:**
   - Automated tests pass → logic is equivalent.
   - Manual browser pass, side-by-side with the original → visual/behavioral
     parity. Screenshot-diff if the tooling supports it.
   - TypeScript build is clean, production build succeeds.
6. **Keep one variable fixed while you migrate the other.** Port styles
   (SCSS/CSS custom properties, class names) as-is in the same pass as the
   logic; component-scoped CSS → CSS Modules or a shared sheet, same rules.
   Redesign is a separate, later change — never framework and design together.

## 5. Deprecate old code carefully, keep a rollback path

- Remove the old Angular version of a piece only after the React version has
  been verified (tests + visual pass) — for a live app, after it's proven
  itself in production for a while, not the moment it compiles.
- Until confident, keep a way to flip a piece back to Angular quickly (a
  feature flag, a route toggle, or simply not deleting the old code yet).
  This is deliberate overhead — pay it until you're sure you won't need it.

## Output expectations when this skill runs

- A migration plan or PR should state explicitly: rewrite vs. incremental,
  and why.
- List the concept mappings actually used (subset of the table above),
  not a generic essay.
- Include a verification section: what tests were ported, what was checked
  visually, what still needs manual QA.
- Flag anything ported "as a quirk" (e.g., an existing bug or oddity kept
  for parity) rather than silently fixing it — scope creep during a
  migration hides real regressions.
