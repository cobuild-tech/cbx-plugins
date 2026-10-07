# Porting RxJS

Read this when a unit contains `Observable`, `Subject`, `.subscribe(`, or
`| async`.

- `| async` becomes state set in an effect that unsubscribes in cleanup.
- `BehaviorSubject` state becomes `useState`, or `useSyncExternalStore`
  over the subject if it is shared with Angular during coexistence. Its
  values must be immutable.
- `switchMap` becomes effect cleanup with an AbortController (latest
  wins). `debounceTime` becomes `setTimeout` + `clearTimeout` with the
  same wait. `distinctUntilChanged` becomes the effect deps.
- `Subject` event buses become lifted state, Context, or a small store.
- Keep RxJS only where streams are real (websockets, complex event
  composition). Record that in `decisions.md`.
- `params.subscribe` becomes `useParams()` plus an effect keyed on the
  param that ignores stale responses.
