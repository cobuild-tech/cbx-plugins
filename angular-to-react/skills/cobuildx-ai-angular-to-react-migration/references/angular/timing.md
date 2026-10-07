# Porting Zone.js and digest timing

Read this when a unit contains `setTimeout(…, 0)`, `NgZone`, `$timeout`,
`$evalAsync`, or code that waits for the view.

Angular code often depends on Zone.js re-rendering after any timer or
promise. `setTimeout(() => …, 0)` waiting for the view, or `$timeout`
waiting for a digest, often encodes ordering the app depends on. Port the
**intent** (`useEffect`/`useLayoutEffect`, refs, `requestAnimationFrame`)
and test the timing. If a timing oddity is kept for parity, list it as a
quirk in the unit file.
