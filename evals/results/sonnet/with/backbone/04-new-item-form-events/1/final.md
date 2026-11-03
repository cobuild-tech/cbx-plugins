`NewItemView` is now a React + TypeScript form, and `ItemsPage` and the router are unchanged. Nothing has been built, run or tested. The repo has no bundler, no `tsconfig` and no test setup, and `@types/react`, `@types/react-dom`, `@types/backbone` and `@types/jquery` aren't in `package.json`.

**What changed**
- **`src/react/NewItemForm.tsx` (new):** the form component. It renders the same markup as before (`form.new-item` with the name and qty inputs, the Add button and `p.err`).
  - It takes the shared `app.items` collection as a prop and calls `collection.create(..., { wait: true })` on it, as before.
  - On success it calls `onSaved`. On error it shows the server's errors joined with `", "`.
- **`src/react/NewItemView.tsx` (new):** a temporary Backbone shell so `ItemsPage` works as it did.
  - It creates the React root once and unmounts it in `remove()`.
  - It triggers `saved` and then calls `Backbone.history.navigate('items/<id>', { trigger: true })`, in the same order as before.
  - It still sets `app.NewItemView`.
- **`src/views/new-item.js`:** the old view is replaced by a comment with the rollback command.
- **`src/views/items-page.js`:** one comment added. The `saved` handler (toast and `app.stats.increment`) is untouched.

**Behavior differences**
- **Extra wrapper element:** the view's `el` is now a `<div>` containing `form.new-item`, where `el` used to be the form itself. A React `onSubmit` can't be attached to the container element, so the form is a child. CSS that targets the form as a direct child of the page, or `ItemsPage` code that uses `form.el` as the form, would notice.
- **Controlled inputs:** values live in React state. The qty value is still converted with `+`, so an empty field becomes `0`, as before.
- **Quirks kept on purpose:**
  - The error text is never cleared on resubmit.
  - The form isn't reset after a successful save.
  - Double submits aren't guarded.
- **Rendering:** the first `render()` now draws asynchronously (React 18 batching) instead of synchronously. Calling `form.render().el` and then querying inside it straight away would see an empty element.
- **Script loading:** `new-item.js` no longer defines the view, so the page needs the compiled `NewItemView.tsx` bundle loaded before `ItemsPage` is constructed. That setup is still to do.

Before shipping: add the bundler and `tsconfig`, then add tests for the success, error and unmount paths.