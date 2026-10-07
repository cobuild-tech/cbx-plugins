# Porting Angular routes, ui-router, and ngRoute

Read this when a unit adds or moves a route. Also read
`references/react/routing.md`.

- `Routes`, ui-router states, and `$routeProvider` become React Router
  routes.
- `routerLink`, `ui-sref`, and `href="#!/x"` become `<Link to>`.
- `router.navigate`, `$state.go`, and `$location.path` become
  `useNavigate()`.
- `redirectTo` and `otherwise` become `<Navigate replace/>`.
- Guards (`canActivate`) become a loader `redirect()`, or a wrapper
  rendering `<Navigate/>`. Resolvers and `resolve:` become a `loader`.
- `loadChildren` becomes `lazy` routes.
- A template holding `<router-outlet>`, `ui-view`, or `ng-view` becomes a
  layout route rendering `<Outlet/>`. Abstract ui-router states become
  pathless layout routes.
- `$stateParams` and `ActivatedRoute` params become `useParams()`.
- Preserve hash vs. HTML5 mode and the `#!` prefix if it's used.
