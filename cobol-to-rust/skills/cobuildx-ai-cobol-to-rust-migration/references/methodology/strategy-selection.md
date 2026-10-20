<!-- GENERATED from shared/methodology-backend/strategy-selection.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Choosing a migration strategy

Read this once, in the Strategy step. Pick **one** strategy, then read only
that strategy's file. Record the choice and the reason in
`.migration/decisions.md`.

## Decision questions

Answer these from `.migration/assessment.md`. If an answer isn't there,
ask the user rather than assume.

1. **Should this move at all?** A stable system that rarely changes can
   be wrapped in an API instead. If the reason to move isn't clear (cost,
   nobody can change it safely, a hot path, memory), ask before planning.
2. **Do real users, clients, or downstream jobs depend on it in
   production?**
3. **How big is it?** Count programs, jobs, routes, and shared data
   layouts or tables.
4. **Can one piece be swapped while the rest keeps running?** A job step
   that reads and writes files, or a route behind a proxy.
5. **Is there a central piece everything depends on**, such as a shared
   record layout, a session store, or a database connection with its own
   rules?
6. **Does feature work have to keep shipping during the migration?**

## Strategies

| Strategy | Choose when | File |
|---|---|---|
| **Full rewrite + cutover** | Small (about ≤ 10 programs or routes), no production dependents or a tolerable freeze, low risk | `cutover.md` |
| **Strangler Fig** | Live system that can be split into job steps or routes, each swapped on its own. **This is the default for anything a business depends on.** | `strangler-fig.md` |
| **Branch by Abstraction** | A shared dependency (session store, record I/O, database access) is used everywhere and has to be swapped under running code first | `branch-by-abstraction.md` |

Every strategy is validated with `parallel-run.md`: old and new get the
same input, and the output must match. Read it in the Plan step.

Combinations are normal. Strangler Fig over job steps or routes often uses
Branch by Abstraction for sessions or record I/O. Record the **primary**
strategy in `state.json` and any secondary one in `decisions.md`. Read the
secondary strategy's file only when the unit you're working on needs it.

## Rules

- Never default to "just rewrite it" for a live system. Big-bang rewrites
  of core systems have a poor record.
- Move only the parts there's a reason to move. A partial migration that
  stops on purpose is a valid outcome; record it in `decisions.md`.
- Every strategy ends with `cutover.md` once the old system has nothing
  left. Read it only at that point.
- The choice can change. If a unit shows the strategy isn't working, stop,
  explain why, and log a new decision before continuing.
