# Ajax and animations

Read this when a unit uses `$.ajax`, `$.getJSON`, `$.Deferred`, or jQuery
effects.

- `$.ajax` becomes `fetch` in an API module, used through TanStack Query.
  Keep the same URLs, methods, headers, and payloads. Port `$.ajaxSetup`
  defaults and global `ajaxError` handlers into the API module.
- While jQuery still runs the rest of the page, its global hooks
  (`ajaxStart`/`ajaxStop` spinners, `ajaxError` login redirects,
  `ajaxSend`) also serve the old code, so you can't just move them. Until
  they move in their own unit, either call `$.ajax` from the API module
  (so the hooks and `$.ajaxSetup` still apply) or reproduce each hook for
  React's requests. List which you chose.
- `fetch` differs from `$.ajax` in ways servers notice: no
  `X-Requested-With: XMLHttpRequest`, no form encoding unless you build
  `URLSearchParams`, no `cache: false` timestamp, and a 4xx/5xx response
  resolves instead of failing. Match each one or list it.
- `.done()` / `.fail()` callbacks that also change the page become
  rendering from the query's `data`, `isPending`, and `error`.
- `$.Deferred` and `$.when` become promises and `Promise.all`.
- `.fadeIn()`, `.slideToggle()`, and `.animate()` become a class set from
  state plus a CSS transition. Exit animations need the element to stay
  mounted until they finish; use a small library like Motion for those.
- Keep durations and easing the same for parity.
