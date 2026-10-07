# Porting AngularJS (1.x) specifics

Read this when a unit contains AngularJS code: controllers, `$scope`,
directives, factories, or filters.

- `$scope` and `controllerAs: 'vm'` fields become state, props, or locals.
  Scope inheritance (a child reading the parent's `$scope`) becomes props
  or Context.
- `.component()` bindings: `<` and `@` become props, `&` becomes a
  callback prop, and `=` becomes `value` + `onChange`.
- A directive with `link` or DOM work becomes a component with `useRef` +
  `useEffect` (destroy in cleanup). `$compile`-based dynamic templates
  become components picked from a lookup object.
- `transclude` and `ng-transclude` become `children` or element props.
- `$watch` and `$watchCollection` become a value derived in render, or
  logic moved into the handler that caused the change. Use an effect
  last.
- Delete `$digest`, `$apply`, and `$evalAsync`.
- `$timeout` and `$interval` become `setTimeout`/`setInterval` in an
  effect with cleanup.
- `$rootScope.$broadcast`, `$emit`, and `$on` become lifted state,
  Context, or a store, only where needed.
- `.factory`, `.service`, and `.provider` become a plain module, a hook,
  or Context. `.config()` and `.run()` become explicit setup in
  `main.tsx`.
- `$q` becomes a native Promise. Watch for code that relied on `$q`
  triggering a digest.
- Filters become plain functions. `ng-repeat` (`track by`) becomes
  `.map()` with a stable `key`.
- `ng-if` becomes a conditional render. `ng-show`/`ng-hide` become
  `hidden` or CSS, because they keep the DOM alive. Preserve that where
  focus, input state, or measurements depend on it.
- `ng-class` and `ng-style` become a computed `className` and style
  object.
- `ng-bind-html` and `$sce`: sanitize with DOMPurify before
  `dangerouslySetInnerHTML`. Don't lose the sanitization AngularJS
  provided.
- One-time bindings (`::x`) need nothing; render the value normally.
- Old builds (Grunt/Gulp, script-tag globals, Bower): decide early how the
  new build bridges them, and record that in `decisions.md`.
