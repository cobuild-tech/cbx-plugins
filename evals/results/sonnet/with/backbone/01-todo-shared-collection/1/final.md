I ported `TodoListView` to React and left `SidebarView`, `main.js` and the collection unchanged. Nothing has been built or run, because the repo has no bundler, `tsconfig` or HTML page.

**What changed**
- `src/react/TodoList.tsx` (new) is the `TodoList` component plus `mountTodoList(el, todos)`, which returns an unmount function.
  - The component subscribes to the shared `app.todos` instance with `on`/`off` and removes the listener on unmount. It does not copy the models into React state.
  - It re-renders on `add remove reset sort change:done`, the same events as before. It still ignores `change:title`.
  - Toggling a checkbox calls `save({done}, {patch: true})` and the × link calls `destroy()`, as before. The markup (`li[data-id] > input.toggle`, title text, `a.destroy`) is the same, so existing CSS still applies.
- `src/react/index.ts` (new) exposes `window.mountTodoList` for the global-script Backbone code.
- `src/views/todo-list.js` is now a thin Backbone view. It keeps `el: '#todo-list'` and the name `app.TodoListView`, mounts the React root in `initialize`, and unmounts it in `remove()`.

**Behavior differences**
- **Row updates:** React updates the existing `<li>` elements instead of replacing the whole list's HTML. Rendered output is the same, but focus and DOM identity survive a re-render.
- **Row keys:** Rows are keyed by `cid`, so unsaved models still render. `data-id` is still `t.id`, which is undefined for unsaved models, as before.
- **Titles:** Titles are escaped by React, matching `_.escape`.
- **Quirks kept:** `save` without `wait` never rolls back, so a failed PATCH leaves the checkbox changed. The initial render still happens only on the first collection event, which is the `reset` from `fetch`.
- **Not checked:** The Backbone `events` hash used delegated listeners on `#todo-list`. React's own event delegation replaces them. I found no other code that listens to events bubbling out of that element, but I only searched the five files in the repo.

**Still needed**
- **Build step:** Bundle `src/react/index.ts` and load it before `main.js`. The old files are plain globals, so this has to be added.
- **Config and types:** Add a `tsconfig` with `"jsx": "react-jsx"`. Also add `typescript`, `@types/react` and `@types/react-dom`, which `package.json` doesn't have yet.
- **Tests:** The repo has none, so none were ported.