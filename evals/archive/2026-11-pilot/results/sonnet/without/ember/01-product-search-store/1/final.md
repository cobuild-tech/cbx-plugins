ProductSearch is now a React + TypeScript component in `app/react/`. Nothing has been installed, built or run, so none of it is tested.

**What I changed**
- **`app/react/ProductSearch.tsx`**: the component itself. It has a 250ms debounce, and a new keystroke cancels the pending timer and drops any in-flight response, which matches the old `restartableTask`. It renders the input and the results.
- **`app/react/mount.tsx`**: a small `createRoot` helper that mounts and unmounts the component.
- **`app/modifiers/react-product-search.js`**: an Ember modifier that mounts React into an element and unmounts it on teardown.
- **`app/components/product-search.js` and `.hbs`**: the Ember component is now a thin shell. It keeps the `store` service and passes React a `search` function. The `.hbs` is just `<div {{react-product-search this.search}}></div>`.
- **`package.json`**: added `ember-modifier`, `typescript`, `@types/react` and `@types/react-dom`.

**Things to know**
- **Compare tray:** `CompareTray` (still Ember) reads `store.peekAll('product')`. So the search still runs through the Ember Data store, and the shell returns plain `{id, name, priceCents}` objects to React. React never talks to the API directly, so the tray keeps working.
- **ProductRow:** I couldn't find `ProductRow` anywhere in the repo, and an Ember component can't be rendered inside React anyway. I used a placeholder `<div class="product-row">` with the name and price. You'll need to port the real row to React, or pass a render prop from Ember.
- **Styling:** `search.css` (`.sidebar > .product-search`) still matches, because the React root renders the same `.product-search` wrapper. It's now nested one `div` deeper, so check that it still applies.
- **Build setup:** there's no `tsconfig.json` and no JSX/TS build step in the repo. You'll need to configure one, for example `jsx: react-jsx` plus the Embroider or Vite TS pipeline, and run `npm install`.
- **Empty query:** it doesn't search until the user types, same as before. Clearing the input does search for the empty string, as the old code did.