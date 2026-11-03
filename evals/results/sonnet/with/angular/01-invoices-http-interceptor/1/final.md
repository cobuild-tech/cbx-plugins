I ported `invoiceList` to React + TypeScript, but I haven't installed dependencies, type-checked, built or run it. `customer-page.html` is unchanged.

**What changed**
- `src/react/InvoiceList.tsx` is the React component. It has the same fetch-on-`customerId`-change behavior, the same loading text and the same table columns.
- `src/react/invoice-list.react.tsx` is a thin AngularJS wrapper registered under the same `invoiceList` name, with `customerId: '<'`. It creates the React root once in `$postLink`, re-renders in `$onChanges`, and unmounts in `$onDestroy`.
- `package.json` gets `build:react` (esbuild bundles to `dist/invoice-list.react.js`) and `typecheck` scripts, plus dev dependencies. A `tsconfig.json` is new.

**To finish wiring it up**
1. Run `npm i && npm run build:react`.
2. Load `dist/invoice-list.react.js` after the `billing` module is defined.
3. Stop loading `src/invoice-list.component.js`. I left it in place as the rollback path, and loading both would register `invoiceList` twice.

**Key decision:** the component calls the injected `$http`, not `fetch`. That keeps `authInterceptor` working: the Bearer and `X-Tenant` headers and the single 401 refresh-and-retry.

**Behavior differences**
- **Kept on purpose:**
  - A request failure leaves "Loading…" showing forever.
  - Stale responses aren't cancelled, so a slow earlier response can overwrite a newer one.
  - The first request goes to `/api/customers/undefined/invoices` when `customerId` is undefined.
  - The old list stays visible while a reload is in progress.
- **Filters:** I replaced them with `Intl` formatting plus small helpers.
  - `orderBy:'-issuedAt'` becomes a descending string sort with a stable tie-break.
  - `date:'mediumDate'` and `currency` are fixed to en-US and USD. Date-only strings parse as local midnight, as AngularJS does. Null or NaN values render blank.
  - Unusual inputs may still differ slightly, for example a non-ISO `issuedAt` string or an unusual currency format.
- **DOM:** I added an explicit `<tbody>`. AngularJS's HTML parser inserted one implicitly, so the DOM is the same.
- **Timing:** React doesn't wait for a digest to render. No AngularJS state changes from inside the component, so no `$applyAsync` is needed.
- **Sharing a root:** the component renders into the `<invoice-list>` element itself. Don't add other children to it.