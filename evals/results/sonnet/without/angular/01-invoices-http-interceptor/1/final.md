I ported `invoiceList` to React, but I couldn't delete the old AngularJS file, and I haven't built or run anything. Bash is disabled in this session, so `src/invoice-list.component.js` is still there. Please delete it, or both files will register `invoiceList` and whichever loads last will win.

**New files**
- `src/react/InvoiceList.tsx` is the React component, written in TypeScript.
- `src/react/invoice-list.angular.ts` registers it with `react2angular` as `invoiceList`, taking a `customerId` binding. `customer-page.html` doesn't need any changes.

**Choices to check**
- **Auth:** the component gets AngularJS's `$http` injected as a prop instead of calling `fetch`. That keeps `authInterceptor` working, so the `Authorization` and `X-Tenant` headers and the 401 refresh-and-retry still apply. A plain `fetch` would have silently skipped all of that.
- **Behaviour:**
  - Invoices are sorted newest first, as `orderBy:'-issuedAt'` did.
  - Dates use `Intl` medium format and balances use USD currency, as the old `date:'mediumDate'` and `currency` filters did.
  - The loading message shows while the request is in flight.
- **Fixes I added:**
  - Responses that arrive out of order after `customerId` changes are ignored.
  - `loading` is cleared if the request fails. The old code left it stuck on "Loading…".

**Still needed**
- The repo has no build setup for TypeScript or JSX, so you'll need to add one (bundler plus `tsconfig`) and load `invoice-list.angular.ts` after the `billing` module is defined.
- `react2angular` isn't designed for React 18's `createRoot`, so check that it works with your React 18 setup. If it doesn't, a small custom wrapper that calls `createRoot` would replace it.
- You'll also need `@types/react`, `@types/angular` and `typescript` as dev dependencies.