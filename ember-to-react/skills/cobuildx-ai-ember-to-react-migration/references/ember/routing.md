# Porting Ember routes

Read this when a unit adds or moves a route. Also read
`references/react/routing.md`.

- `Router.map`: `this.route('post', { path: '/posts/:id' })` becomes
  `<Route path="/posts/:id">` (or the matching route object).
- Nested routes with `{{outlet}}` become a layout route rendering
  `<Outlet/>`.
- `model()` becomes a `loader` or a query hook in the route component.
- `beforeModel` and `afterModel` redirects become `redirect()` in a
  loader, or a wrapper rendering `<Navigate/>`.
- `{{link-to}}` and `<LinkTo @route>` become `<Link to>`. Resolve route
  *names* to *paths*.
- `transitionTo` and `router.transitionTo` become `useNavigate()`.
- Controller `queryParams` become `useSearchParams()` with the **same
  names and defaults**. Ember drops params that equal their default from
  the URL. Reproduce that, or record the difference as a quirk.
  `refreshModel: true` means refetch when that param changes.
- `loading` and `error` substates (templates or routes) become pending UI
  and `errorElement`.
- Controllers have no React counterpart. Their state lives in the route
  component.
