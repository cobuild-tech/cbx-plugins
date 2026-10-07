# Identifying which Angular this is

Read this in the Assess step. The four kinds migrate very differently.
Record the result in `state.json` as `"flavor"`.

- **`angularjs`** (1.x): `angular.module(...)`, controllers, `$scope`,
  directives, the digest cycle, `ng-*` attributes, often ui-router. Look
  for 1.5+ `.component()` usage. Component-style code maps to React far
  more cleanly than controllers that lean on `$scope`.
- **`angular`** (2–15): TypeScript classes with decorators, NgModules,
  RxJS everywhere, change detection driven by Zone.js.
- **`angular-signals`** (16+): may also use signals (`signal`,
  `computed`, `effect`, `input()`, `model()`), standalone components,
  `inject()`, and the built-in control flow (`@if`, `@for`, `@switch`,
  `@defer`).
- **`hybrid`** (ngUpgrade): AngularJS and Angular in one app. Migrate
  both halves directly to React. Never finish the AngularJS → Angular
  upgrade first just to leave Angular afterwards.

Versions come from `package.json` (`@angular/core`, `angular`).
