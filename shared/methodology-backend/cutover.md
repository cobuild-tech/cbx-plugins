# Cutover and removing the old system

Read this for a full-rewrite strategy, or when an incremental strategy has
moved everything.

## Full rewrite path

1. Build the Rust version separately, unit by unit, in the order in
   plan.md.
2. Every unit still passes `validation.md` against the running old system.
3. Cut over in one release with a way back ready: keep the old build
   deployable and the scheduler or proxy switch ready to flip back.

## Final cutover (any strategy)

1. Freeze changes to the old code. Confirm in `state.json` that every
   unit is `done`.
2. Run the full golden suite and a parallel run of every piece in the unit
   map, through a busy period: a month end for batch, a peak for web.
3. Switch everything to Rust, then watch errors and key totals for an
   agreed period. Watch the first year end closely; some code paths only
   run then.
4. Only after that period: remove the old programs, compare steps, proxy
   rules, and temporary bridges. Keep the old build and the last golden
   data for a quarter.
5. Remove old runtimes and packages only when nothing references them.
6. Only now change shared formats on purpose: move data off the old
   layout or character set, retire old session formats, switch to fixed
   mode. Each is its own announced change.
7. Write down the decisions: which old rules were copied, which were
   fixed, and why. Set `phase` to `"complete"` in `state.json` and add a
   closing entry to `decisions.md`.
