# Routing in React

Read this when a unit adds or moves a route.

- Use React Router (the data router, `createBrowserRouter`) unless the
  team's framework has its own router.
- Preserve **every existing URL**, including trailing slashes, query
  param names, and hash vs. HTML5 mode (`createHashRouter` vs.
  `createBrowserRouter`). Keep a `#!` prefix if the old app used one.
- Nested routes plus an outlet become a layout route rendering
  `<Outlet/>`. Abstract or pathless parents become pathless layout routes.
- Data loading per route goes in a `loader` or a query hook in the route
  component. Choose one approach and record it in `decisions.md`.
- Redirect guards become `redirect()` in a loader, or a wrapper that
  renders `<Navigate replace/>`.
- Loading and error substates become pending UI plus `errorElement`.
- Programmatic navigation uses `useNavigate()`, links use `<Link to>`, and
  query params use `useSearchParams()` with the same defaults.
- Code-split routes use `lazy`.
- When a route param changes, key data fetching on it and ignore stale
  responses (AbortController or the query library's cancellation).

Check the installed React Router version's API before writing code. See
`library-apis.md`.
