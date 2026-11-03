I rewrote `OrderSummaryComponent` as a React + TypeScript component. I haven't compiled it, run it, or tested it. The repo has no `tsconfig` or build config, so the `.tsx` file has nothing to build it yet.

- **`src/react/OrderSummary.tsx` (new):** the React component. It renders the heading, the "placed on" line, the total, and the singular or plural item count.
- **`src/app/order-summary.component.ts`:** now a thin Angular host that mounts the React component. It keeps the `app-order-summary` selector, so `checkout.component.html` is unchanged and still uses `<app-order-summary [order]="order$ | async">`. I did this because the rest of the app stays Angular and needs to keep using the component the same way.
- **Translations and runtime language switch:** the host passes in a `t` function that calls ngx-translate's `instant`. It re-renders when `onLangChange` fires, so switching language at runtime still works.
- **Locale, date and currency formatting:** the host passes in Angular's `LOCALE_ID`, which is `de-DE`. React formats the date and currency with `Intl.DateTimeFormat` (`dateStyle: 'long'`) and `Intl.NumberFormat`. This replaces Angular's `date: 'longDate'` and `currency` pipes, so output may differ slightly in edge cases.
- **Null order:** the component renders nothing while `order$ | async` is still `null`. The old template would have thrown in that case.

To make it work in the app you still need to:
- Enable JSX in the TypeScript config (`"jsx": "react-jsx"`).
- Add `@types/react` and `@types/react-dom`.

If you'd rather change `checkout.component.html` to mount React directly instead of going through the host component, I can do that.