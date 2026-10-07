<!-- GENERATED from shared/methodology/strategy-selection.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Choosing a migration strategy

Read this once, in the Strategy step. Pick **one** strategy, then read only
that strategy's file. Record the choice and the reason in
`.migration/decisions.md`.

## Decision questions

Answer these from `.migration/assessment.md`. If an answer isn't there,
ask the user rather than assume.

1. **Do real users or a business depend on the app in production?**
2. **How big is it?** Count routes, components, and data-layer pieces.
3. **Can the deploy put a proxy or shell in front of the app?** In other
   words, can some URLs go to React and others to the old app?
4. **Is there a central piece everything depends on**, such as a session
   service, a root store, or a data layer that every screen reads?
5. **Does feature work have to keep shipping during the migration?**

## Strategies

| Strategy | Choose when | File |
|---|---|---|
| **Full rewrite + cutover** | Small (about ≤ 15 routes/components), no production dependents or a tolerable freeze, low risk | `cutover.md` |
| **Strangler Fig** | Live app, routes can be split by URL, and feature work must continue. **This is the default for anything a business depends on.** | `strangler-fig.md` |
| **Branch by Abstraction** | A shared internal dependency (data layer, session, event bus) is used everywhere and has to be swapped under running code before or during the UI migration | `branch-by-abstraction.md` |
| **Vertical slice** | Live app where the URL can't be split (single route or embedded widget host), but React can mount inside the old framework's components | `vertical-slice.md` |

Combinations are normal. Strangler Fig at the route level often uses Branch
by Abstraction for the data layer. Record the **primary** strategy in
`state.json` and any secondary one in `decisions.md`. Read the secondary
strategy's file only when the unit you're working on needs it.

## Rules

- Never default to "just rewrite it" for a live app. Never freeze feature
  work for months to do a big-bang rewrite.
- Every strategy ends with `cutover.md` once the old app has nothing left.
  Read it only at that point.
- The choice can change. If a unit shows the strategy isn't working, stop,
  explain why, and log a new decision before continuing.
