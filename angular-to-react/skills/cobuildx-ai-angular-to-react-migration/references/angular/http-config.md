# Porting HTTP, interceptors, and config

Read this in the scaffold unit, and when a unit touches `HttpClient`,
`$http`, `$resource`, or interceptors. Also read
`references/react/state-data.md`.

- `HttpClient`, `$http`, and `$resource` become one `fetch` wrapper plus
  TanStack Query, with the same endpoints, payloads, and transforms.
- Every interceptor (`HTTP_INTERCEPTORS`, `$httpProvider.interceptors`)
  becomes the wrapper's behavior: auth headers, error mapping, retries,
  and loading indicators. Port the order.
- `environment.ts` and AngularJS `.constant()` config become
  `import.meta.env.VITE_*`. Never copy secret values. Flag them for
  rotation in `decisions.md`.
- `@angular/localize` and ngx-translate become react-intl or i18next with
  the same message keys.
- `@angular/animations` become CSS transitions or Framer Motion, with the
  exact same timings.
