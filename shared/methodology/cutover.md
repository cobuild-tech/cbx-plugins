# Cutover and removing the old app

Read this for a full-rewrite strategy, or when an incremental strategy has
moved everything.

## Full rewrite path

1. Build the React app separately, unit by unit, in the order in plan.md.
2. Every unit still passes `validation.md` against the running old app.
3. Cut over in one release with a rollback ready: keep the old build
   deployable and the DNS or proxy switch ready to flip back.

## Final cutover (any strategy)

1. Freeze changes to the old code. Confirm in `state.json` that every
   unit is `done`.
2. Run the full ported test suite and a side-by-side pass of every route
   in the route map.
3. Switch all traffic to React, then watch errors and key metrics for an
   agreed period.
4. Only after that period: delete the old app, the coexistence wrappers,
   the proxy rules, and the temporary bridges.
5. Remove old-framework dependencies only when nothing references them.
   Check globals, `index.html` script tags, and build config, not just
   imports.
6. Set `phase` to `"complete"` in `state.json` and add a closing entry to
   `decisions.md`.
