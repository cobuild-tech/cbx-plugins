The orders page now renders from a React + TypeScript component, with the Ember router still handling routing. I haven't built it or run it, and there's no test suite or build config in the repo.

**What changed**
- **`app/react/OrdersPage.tsx`** now holds the markup and the sort logic. It has the status `<select>`, the table, the "Next" button and the spinner. The sort uses the same descending comparator the controller's `sorted` getter had.
- **`app/react/types.ts`** has the prop types.
- **`app/react/OrdersTable.tsx` and `app/react/Spinner.tsx`** are placeholders. Their Ember source isn't in the repo, so I couldn't port them. They need a faithful port before this ships.
- **`app/modifiers/react-orders.js`** mounts the React root once on the element, re-renders when the tracked args change, and unmounts when the element is torn down.
- **`app/templates/orders.hbs`** is now a single `<div {{react-orders …}}>`.
- **`app/controllers/orders.js`** keeps `queryParams` and the tracked `status`, `page` and `sort`. It gained `setStatus`, `setSort` and `setPage` actions, which React calls back into. This keeps the URL in Ember.
- **`app/routes/orders.js` and `app/templates/orders-loading.hbs`** are untouched. `store.query` and `refreshModel` (on `status` and `page`, not `sort`) are unchanged, and the loading template still renders.
- **`package.json`** adds `ember-modifier` and `typescript`, `@types/react` and `@types/react-dom` as dev dependencies.

**Behavior differences and risks**
1. **Build setup:** I didn't add a `tsconfig` or any TSX build config. The repo has no `ember-cli-build.js`, so I couldn't tell how TSX would be compiled. The Ember app needs a TypeScript/JSX transform (for example `ember-cli-typescript` plus Babel's React preset) before `.tsx` files will build.
2. **Missing helpers:** The old template used `pick`, `set` and `inc`, which came from addons I couldn't see. They're replaced by the controller actions. `is-loading` is still called from the Ember template and its value is passed in as a prop. Its implementation isn't in the repo.
3. **Wrapper element:** There's now one wrapper `<div>` around the page. Any CSS or tests that depend on the old sibling structure, such as `>` selectors, could break.
4. **Select quirk kept:** The status `<select>` never bound its `value`. It still shows "open" on load even if the URL says `status=shipped`. I kept this for parity.
5. **Orders table placeholder:** The table is a stub that shows only the date column. The real columns and markup, and its `@onSort` behaviour, are untested.
6. **Order records:** React receives the Ember Data records directly, so other code that reads the same store records is unaffected. They are re-copied into a new array whenever the model array changes, so the table re-renders on array updates.
7. **Timing:** React's render timing isn't tied to the Ember run loop. `settled()` in tests may return before React has painted. If tests hit this, register a test waiter.
8. **Tests:** No tests were ported, because none exist in the repo.