# Porting Angular (2+) components and directives

Read this when a unit contains Angular components, directives, or pipes.

- **Templates:** `{{x}}`/`[attr]="x"` become `{x}`/`attr={x}`. `class` and
  `style` become `className` and a style object. `[ngClass]` becomes a
  computed `className`. `*ngIf`/`@if` become `&&` or a ternary.
  `*ngFor`/`@for` become `.map()` with a stable `key` (from
  `trackBy`/`track`). `ngSwitch`/`@switch` become a lookup object.
  `@defer` becomes `lazy` + `Suspense`.
- **Inputs and outputs:** `@Input`/`input()` become props.
  `@Output`/`output()` become `onX` callback props. `[(x)]`/`model()`
  become `value` + `onChange`.
- **Content:** `<ng-content>` (including `select=`) becomes `children` or
  element props. `ng-template` + `ngTemplateOutlet` become render props.
- **DOM:** `@ViewChild`, `ElementRef`, and `Renderer2` become `useRef`
  (+ `useEffect`). `@HostListener` and `@HostBinding` go on the root
  element, or in an effect for `window`/`document`.
- **Lifecycle:** `ngOnInit`, `ngOnChanges`, `ngOnDestroy`, and
  `ngAfterViewInit` become `useEffect` with deps and cleanup.
- **Change detection:** delete `detectChanges`/`markForCheck`. `OnPush`
  has no equivalent.
- **Signals:** `signal` becomes `useState`. `computed()` becomes a value
  derived in render. `effect()` usually becomes a derived value or
  handler logic, with `useEffect` as a last resort.
- **Attribute directives** become a hook, a wrapper component, or a
  callback ref. Structural directives become components or render props.
- **Pipes** become plain functions (`useMemo` only if costly).
- **Host element:** Angular renders `<app-foo>`. Reproduce it as a
  wrapper if styles or selectors depend on it.
- **UI libraries** (Material/CDK, PrimeNG, ng-bootstrap): audit each
  component used and map it to a React library or wrap it. Note
  differences in focus trapping, overlays, and keyboard handling.
