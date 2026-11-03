I converted InboxView to React and TypeScript, but I haven't installed the new dev dependencies, type-checked, built or run any of it.

**What I added**
- **`src/react/InboxView.tsx`:** The React component. It takes `model` and `channel` props and keeps the same markup as before: `h2`, `.n` and `ul.msgs`.
  - It reads the unread count from the model's `change:unread` event.
  - On `message:new` it increments `unread` on the model and prepends the subject to the list.
  - It triggers `mail:poll` every 30 seconds, and clears the interval when the view is destroyed.
  - React escapes the subject text, which replaces the old `_.escape`.
- **`src/react/InboxViewBridge.tsx`:** A Marionette view that mounts the React component with `createRoot` on render and unmounts it on destroy. It assigns itself to `app.InboxView`, so the layout and router in `src/app.js` need no changes.
- **`tsconfig.json`:** Strict mode, `react-jsx`, and `noEmit`, covering `src/react`.
- **`package.json`:** Added `typescript`, `@types/react`, `@types/react-dom` and `@types/backbone` as dev dependencies.
- **`src/views/inbox-view.js`:** I left it in place and marked it deprecated.

**Before this works**
- **Remove the old file from the bundle:** It assigns `app.InboxView` too, so the bridge has to load after it or the old file has to go. I didn't touch the build or load order because the repo has no bundler config.
- **Run the checks:** Run `npm install` and `npx tsc` to check the types. `backbone.radio` and Marionette may need extra typings. I used `any` casts in the bridge for those.

**Behaviour changes**
- **Root class:** The old `className` was set once when the view was created. The `has-unread` class now updates as the count changes.
- **Root element:** The Marionette view's own `el` is a `div` with no class. The `.inbox` element is now a child of it.
- **Missing `unread`:** The component reads `unread` from the model the same way the old code did, so it still assumes the model has that attribute.