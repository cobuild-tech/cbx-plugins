I ported `TasksView` and `TaskRow` to React + TypeScript in `src/react/`, but nothing has been type-checked, run or tested. Dependencies aren't installed, and the repo has no bundler and no test setup. The Marionette shell and the shared `app.tasks` collection are unchanged. The shell isn't in this repo, so I couldn't check how it uses `app.tasks` or the view.

## What changed
- **`TaskRow.tsx`:** renders `<li><span title={owner}>{title}</span> <em>{priority}</em></li>`.
  - It re-reads the model only on `change:priority`, as `modelEvents` did. Title or owner changes alone don't update the row.
  - The span and em are re-created on each change, as the old template re-render did.
  - The Bootstrap tooltip (`[title]`, placement top) is initialised after each render and disposed on unmount. This replaces `TooltipBehavior`.
- **`TasksView.tsx`:**
  - It reproduces the `archived` filter and the descending-priority sort (stable for ties).
  - It recomputes that list only on the collection's `add`, `remove`, `reset` and `sort` events. It subscribes to the same `app.tasks` instance rather than copying it.
  - The empty state is `<div><li class="empty">No open tasks</li></div>`, keeping the old div-inside-ul markup.
  - Infinite scroll keeps the same 200px threshold and `fetch({remove:false, data:{page:++page}})`, with a hand-written throttle that mimics Underscore's `_.throttle` at 250ms.
- **`TasksViewBridge.tsx`:** a Marionette View with a `<ul>` el. It creates one React root, renders with `flushSync`, and unmounts in `onBeforeDestroy`.
- **`index.ts`:** sets `app.LegacyTasksView = app.TasksView` and then `app.TasksView = ReactTasksView`.
- **Support files:** `throttle.ts`, `globals.d.ts`, a `tsconfig.json`, and TypeScript and `@types/*` dev dependencies plus a `typecheck` script in `package.json`.
- **Legacy code kept:** `src/views/tasks.js` and `src/behaviors/tooltip.js` are untouched. To roll back, drop the `src/react/index.ts` import.

## Behavior differences
- **Scroll listener:** it attaches when React mounts (during `render`), not on `onAttach`. The pending trailing throttle call is also cancelled on destroy. Before, it could still fire a fetch up to 250ms after destroy.
- **Tooltip cleanup:** the old row replaced its span on re-render without disposing the old tooltip. The new code disposes it first.
- **Empty view:** it appears whenever the filtered list is empty, which I assumed matches Marionette 4.1.3. I couldn't check this against Marionette's source because `node_modules` isn't installed.
- **View API:** the bridge is a plain `View`, not a `CollectionView`. Shell code that calls CollectionView methods (`children`, `addChildView`, `filter`, `reorder`) on it will break. There's none in this repo.
- **Existing quirks kept on purpose:**
  - Changing `archived` or `priority` on a model doesn't re-filter or re-sort until the next collection event.
  - The page counter restarts at 1 on each mount.
  - The div-inside-ul markup stays.
- **Request and timing mechanics:** no new requests are introduced, but the exact timing of scroll fetches is untested.

## Open items
- **Load order:** `src/react/index.ts` must load after `src/views/tasks.js` and before the shell creates the view.
- **Build:** TSX needs a bundler, and the repo has none. The `app`, `Marionette`, `$` and `_` globals also need to stay available.
- **Tests:** the repo has none to port. A Jest or Vitest test of the filter and sort order, the empty state, and the priority-change re-render would be the first thing to add.