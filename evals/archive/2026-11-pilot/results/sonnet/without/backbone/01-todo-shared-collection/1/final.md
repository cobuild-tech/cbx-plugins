`TodoListView` is now a React + TypeScript component, but I haven't compiled, type-checked or run it. The old Backbone file is also still in the repo, because I couldn't delete it.

- **Component:** `src/react/TodoListView.tsx` holds `TodoListView`. It renders the same `<li data-id>` markup, with a checkbox and a `×` link. It re-renders on the same collection events as before: `add remove reset sort change:done`.
- **Behavior:** Toggling still calls `save({done}, {patch: true})`, and the `×` link still calls `destroy()`. The old event-delegation code is gone. React also escapes the title, so the manual `_.escape` isn't needed.
- **Backbone bridge:** The file sets `window.app.mountTodoList(el)`, which mounts the component with `createRoot` on the existing element. `src/main.js` now calls `app.mountTodoList(document.getElementById('todo-list'))` in place of `new app.TodoListView()`.
- **Untouched:** `SidebarView`, the `todos` collection and the rest of the Backbone code are unchanged. Because the sidebar listens to `all` on the collection, it still updates when the React list changes models.
- **Tooling:** I added `tsconfig.json` (strict, `react-jsx`, `noEmit`) and dev dependencies for `typescript`, `@types/react` and `@types/react-dom` in `package.json`. The Backbone model and collection types in the component are minimal hand-written stand-ins.

**Still to do**
- **Delete the old view:** `src/views/todo-list.js` is dead code now, so run `git rm src/views/todo-list.js`. I only had file tools, no shell.
- **Add a build step:** The repo has no bundler. `.tsx` can't be loaded directly by a `<script>` tag. Something like esbuild or Vite needs to bundle `src/react/TodoListView.tsx` into a script that loads before `main.js`. I didn't pick one for you.