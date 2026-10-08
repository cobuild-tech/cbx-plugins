# Ajax and animations

Read this when a unit uses `$.ajax`, `$.getJSON`, `$.Deferred`, or jQuery
effects.

- `$.ajax` becomes `fetch` in an API module, used through TanStack Query.
  Keep the same URLs, methods, headers, and payloads. Port `$.ajaxSetup`
  defaults and global `ajaxError` handlers into the API module.
- `.done()` / `.fail()` callbacks that also change the page become
  rendering from the query's `data`, `isPending`, and `error`.
- `$.Deferred` and `$.when` become promises and `Promise.all`.
- `.fadeIn()`, `.slideToggle()`, and `.animate()` become a class set from
  state plus a CSS transition. Exit animations need the element to stay
  mounted until they finish; use a small library like Motion for those.
- Keep durations and easing the same for parity.
