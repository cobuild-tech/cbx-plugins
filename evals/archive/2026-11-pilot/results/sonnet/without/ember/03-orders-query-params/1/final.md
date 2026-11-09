The orders page UI now lives in a React + TypeScript component under `app/react/orders/`. I haven't built, type-checked or run any of it.

The repo has no `ember-cli-build.js`, no TypeScript or JSX tooling, and only `package.json` for deps. `@types/react` and `@types/react-dom` aren't in it. The TS/TSX files will need a build step that can compile them, for example `ember-cli-typescript` with Babel's React preset or an Embroider and Vite setup.

**React side (`app/react/orders/`)**
- `OrdersPage.tsx` replaces the template. It has the status `<select>`, the table and the Next button. The `sorted` logic (descending by the sort key) moved here from the controller and runs in a `useMemo`.
- `OrdersTable.tsx` is a placeholder I wrote. The original `<OrdersTable>` isn't defined anywhere in this repo (probably an addon), and I guessed its columns as `id`, `date` and `status`. Swap in the real one.
- `types.ts` holds the `Order` and `OrdersPageProps` types.
- `mount.tsx` exports `mountOrdersPage(el, props)`, which returns `{ update, unmount }` built on `createRoot`.

**Ember side (routing stays in Ember)**
- `routes/orders.js` is unchanged. It still owns the query params and `store.query`.
- `controllers/orders.js` now holds only the `status`, `page` and `sort` query params plus `setStatus`, `setPage` and `setSort` actions. The `sorted` getter is gone.
- `templates/orders.hbs` is now a single `<ReactOrdersPage>` call. It passes in the model, the three query params and the three setters.
- `components/react-orders-page.js` is new. It's a classic component that mounts the React root on insert and re-renders it when its arguments change. It unmounts on destroy, deferred with `queueMicrotask`.
- `tsconfig.json` is new, with the JSX setting and an `admin/*` path alias.

**Left out or changed**
- I dropped `{{#if (is-loading)}}<Spinner/>{{/if}}`. Neither `is-loading` nor `Spinner` exists in this repo. `orders-loading.hbs` still shows the spinner while the route reloads, because `status` and `page` use `refreshModel`. If you want an in-page spinner, pass an `isLoading` prop.
- The `<select>` is now controlled, so it reflects `status` instead of always showing "open" as the old uncontrolled one did.