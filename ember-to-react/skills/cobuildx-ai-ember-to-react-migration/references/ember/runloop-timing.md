# Porting run-loop timing

Read this when a unit contains `run.next`, `run.later`, `schedule(`,
`next(`, `later(`, `debounce(`, or `throttle(`.

Run-loop calls often encode ordering the app depends on. Port the
**intent**, then test the timing.

| Ember | React intent |
|---|---|
| `schedule('afterRender', …)` / `next` to touch DOM | `useEffect` / `useLayoutEffect` with a `ref` |
| `run.later(fn, ms)` | `setTimeout` in an effect, cleared in cleanup |
| `run.debounce` / `run.throttle` | Explicit debounce/throttle with the same wait and leading/trailing settings |
| `next` to wait for a binding to propagate | Usually not needed; set state in the handler and derive |

If a timing oddity is kept for parity, list it as a quirk in the unit file.
