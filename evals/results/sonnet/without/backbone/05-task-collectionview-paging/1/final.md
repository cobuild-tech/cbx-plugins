I ported `TasksView` and `TaskRow` to React and TypeScript under `src/react/`, but nothing has been type-checked, built or run. I had no shell for `npm install`, `tsc` or a git command. I also couldn't delete `src/views/tasks.js`, so it's still in the repo.

**What's in `src/react/`**
- **`TaskRow.tsx`**:
  - It renders the `<li>` with the title span and priority `<em>`.
  - It re-renders on any model `change` event. The original only re-rendered on `change:priority`.
  - It sets up the Bootstrap tooltip on mount and calls `tooltip('dispose')` on unmount, replacing `TooltipBehavior`.
- **`TasksView.tsx`**:
  - It hides archived tasks and sorts by priority, highest first.
  - It shows "No open tasks" when the list is empty.
  - It keeps the 250 ms throttled infinite scroll: fetch the next page with `remove: false` when within 200px of the bottom. The scroll listener is removed on unmount.
  - It re-renders on `add`, `remove`, `reset`, `sort`, `change:archived` and `change:priority`.
- **`useBackbone.ts`**: a small hook that re-renders a component when a Backbone model or collection fires the given events.
- **`mountTasksView.tsx`**:
  - A Marionette `View` adapter that mounts the React tree with `createRoot` and unmounts it on destroy.
  - It sets `window.app.TasksView`, so the shell's regions keep working.
  - It uses the shared `app.tasks` collection unless you pass a `collection` option.
- **`types.ts`**: task and collection types, plus a `$.fn.tooltip` typing.

I also added `tsconfig.json` and the `underscore`, `typescript` and `@types/*` packages to `package.json`.

**What you need to do**
- Delete `src/views/tasks.js`, and `src/behaviors/tooltip.js` if nothing else uses it. The old file defines `app.TasksView` too, so whichever script loads last wins.
- Run `npm install` and `tsc -p .`. Expect to fix a few typing issues, especially the `Marionette.View.extend` typing in the adapter.
- The repo has no bundler or entry point, so you'll need to load `mountTasksView.tsx` wherever the old script was loaded.