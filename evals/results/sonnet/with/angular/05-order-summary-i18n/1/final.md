`OrderSummaryComponent` now renders through a React + TypeScript component, and `checkout.component.html` is unchanged. I haven't built it, run it, or tested it. The repo has no tsconfig, build setup or tests.

**What changed**
- **`src/react/OrderSummary.tsx` (new):** a React component with the same markup as the old template: `h3`, the placed-date `p`, `p.total`, and the one-item or N-items `p`. It takes `order`, `locale` and a `t` function.
- **`src/app/order-summary.component.ts`:** now a thin Angular wrapper that keeps the `app-order-summary` selector and the `[order]` input. It creates the React root once in `ngAfterViewInit`, re-renders in `ngOnChanges`, and unmounts in `ngOnDestroy`. `checkout.component.html` still uses `<app-order-summary [order]="order$ | async">`.
- **Translations:** the wrapper passes `TranslateService.instant` into React as `t`. It re-renders on `onLangChange`, `onTranslationChange` and `onDefaultLangChange`, so runtime language switching still works.
- **Locale:** the wrapper passes `LOCALE_ID` (`de-DE`) to React, which formats the date and currency with `Intl` using that locale.
- **`package.json`:** added `@types/react` and `@types/react-dom` as dev dependencies. They aren't installed yet.

**Behavior differences**
- **Null order:** the old template read `order.placedAt` while the async pipe's first value was `null`, which would throw. React renders nothing until the order arrives.
- **Formatting:** `Intl` is used in place of Angular's `date` and `currency` pipes. For `de-DE` the output should match, including the non-breaking space before `€`, but I haven't compared them. Date-only strings (`yyyy-MM-dd`) are parsed as local dates to match Angular's pipe. Check unusual currencies and date formats.
- **Zone and change detection:** the React output is not driven by Angular change detection. Nothing flows from React back to Angular, so `NgZone` isn't needed.
- **Host element:** `<app-order-summary>` is still the host, and the React content is rendered inside it. The DOM is the same as before.
- **Build:** the project needs a JSX-capable build (`"jsx": "react-jsx"`) before `.tsx` compiles. The wrapper uses `createElement` so it doesn't depend on that.

I kept the Angular wrapper because the rest of the app is Angular. I didn't remove any old code, so the previous version is available in git as a rollback.