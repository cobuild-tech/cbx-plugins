# Running React inside Angular or AngularJS

Read this when the strategy is Vertical slice or Strangler Fig, or when a
unit crosses the boundary. Also read `references/react/coexistence.md`.

- **React inside Angular (2+):** use a thin wrapper component with a host
  element. Create the root once in `ngAfterViewInit`
  (`this.root = createRoot(this.host.nativeElement)`). Call
  `this.root.render(<Component {...props} />)` there and in `ngOnChanges`,
  guarded with `this.root?.`, because the first `ngOnChanges` runs before
  `ngAfterViewInit`. Call `this.root.unmount()` in `ngOnDestroy`.
  Callbacks from React that change Angular state must run inside
  `NgZone.run(...)` unless the app is zoneless, or the view won't update.
- **React inside AngularJS:** use a `.component()` wrapper (or
  `react2angular`). Create the root once in `$postLink`, re-render in
  `$onChanges` (guarded, because the first `$onChanges` runs before
  `$postLink`), and unmount in `$onDestroy`. Callbacks that change
  AngularJS state must call `$scope.$applyAsync(...)`.
- **Hybrid (ngUpgrade):** mount React wrappers in whichever half owns the
  screen. Don't upgrade AngularJS code to Angular first.
- **Angular inside React** (shell-first migrations): Angular Elements
  exposes Angular components as custom elements React can render.
- **Shared data:** use a framework-agnostic store. Wrapping a
  `BehaviorSubject` works if its values are immutable.
- **Route split:** see `references/methodology/strangler-fig.md`.
- **Removing Angular:** remove `@angular/*`, `zone.js`, `rxjs` (if unused),
  `angular`, `angular-mocks`, UI libraries, and polyfills only when
  nothing references them. Check `index.html` script tags and build
  config, not just imports.
