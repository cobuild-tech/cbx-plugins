# Porting Backbone.Router

Read this when a unit adds or moves a route. Also read
`references/react/routing.md`.

- `routes: { 'posts/:id': 'show' }` becomes `<Route path="/posts/:id">`.
  `*splat` becomes `*`. Optional `(/:page)` becomes separate routes or
  optional segments.
- A route handler that swaps views into a region becomes a layout route
  rendering `<Outlet/>`.
- `navigate(url, {trigger: true})` becomes `useNavigate()`. `<a
  href="#x">` becomes `<Link to>`.
- Preserve hash vs. pushState (`createHashRouter` vs.
  `createBrowserRouter`) and every existing URL.
