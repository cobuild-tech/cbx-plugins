I converted the form to a React + TypeScript component and left a small Backbone shim in `src/views/new-item.js`. I haven't installed dependencies, type-checked, bundled or run any of it.

**What changed**
- **`src/react/NewItemForm.tsx`** (new): the form as a component, with controlled `name` and `qty` inputs. It calls `collection.create(..., { wait: true })` as before. On an error response it shows `responseJSON.errors` joined with commas in `<p className="err">`. When the save succeeds it calls an `onSaved(model)` prop.
- **`src/react/index.ts`** (new): `mountNewItemForm(el, props)` creates a React root and returns `{ render, unmount }`. It registers itself as `app.react.mountNewItemForm`.
- **`src/views/new-item.js`**: `app.NewItemView` is still a Backbone view, so `items-page.js` and the router are untouched. `render()` mounts the React form once, and `remove()` unmounts it. In the `onSaved` callback it triggers `'saved'` and then navigates to `items/<id>`, in the same order as before.
- **`package.json` and `tsconfig.json`**: I added `typescript` and the `@types` packages for react, react-dom, backbone and jquery as dev dependencies, plus a strict `tsconfig.json` covering `src/react`.

**Things to check**
- **Extra wrapper element:** the view's root is now a plain `<div>` containing `<form class="new-item">`. Before, the form was the view's root element. Any CSS or selectors that expect the `<form>` to be the direct child of the page may need a small tweak.
- **Bundling:** the repo has no build setup. `src/react/index.ts` must be bundled and loaded before `ItemsPage` renders, and it expects `window.app` to already exist.
- **Form state:** the inputs are controlled and keep their values after a successful save. The old view reset them only when `render()` re-ran. `render()` is now a no-op after the first call.
- **Client-side validation:** a model that fails client-side validation still shows no message, as before.