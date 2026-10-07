# Porting Ember Concurrency tasks

Read this when a unit contains `task(`, `@task`, or `perform`.

| Modifier | Port |
|---|---|
| (none) | `async` function; concurrent calls all run |
| `restartable` | AbortController — abort previous call when a new one starts |
| `drop` | In-flight guard — ignore calls while one is running |
| `enqueue` | Promise chain — run calls one after another |
| `keepLatest` | In-flight guard + remember the last pending args |
| `maxConcurrency(n)` | Counter / small queue |

- `task.isRunning` becomes `isPending` state (or the query or mutation
  status).
- `timeout(ms)` inside a task becomes an abortable delay, so cleanup
  cancels it.
- A task cancels when its component is destroyed. The port must abort in
  effect cleanup.
- Test every modifier's behavior explicitly with fake timers.
