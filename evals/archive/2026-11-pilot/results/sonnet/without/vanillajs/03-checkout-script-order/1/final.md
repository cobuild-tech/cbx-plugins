I rebuilt the checkout form as a React + TypeScript component in `src/`. I haven't compiled or run it, and the repo has no `tsconfig.json` or bundler yet. `checkout.js` and `checkout.html` are unchanged.

**What's new**
- `src/CheckoutForm.tsx` holds the component and the typing for `window.App`.
- `src/index.tsx` mounts the component into `#checkout-root`.

**Behaviour carried over from `checkout.js`**
- **Draft:** it is restored from `sessionStorage` on load and saved on `beforeunload`. Only email and country are saved, never the card number. The component also ignores any `card` value found in a stored draft.
- **Submit:** it calls `preventDefault`, disables the button, POSTs the `FormData` to `/pay`, and on success clears the draft and goes to `/thanks`. On failure it re-enables the button.
- **Tracking event:** it still dispatches `checkout:submit` on `document`, right after the fetch starts.
- **`window.App.checkout.prefill`:** it still fills only empty fields, so a restored draft wins over a prefill such as `country: 'DE'`.
- **`App.q`:** it drains queued functions and then swaps in an immediate-run `push`.

**Small changes beyond the original**
- A ref blocks double submits, because React state updates asynchronously and a fast second click could otherwise slip through.
- A network error now re-enables the button. The original left it disabled forever.
- Draft JSON that fails to parse is ignored instead of throwing.
- The country `<select>` takes a `countries` prop. The original had no options, so `'DE'` could never actually be selected. You'll need to pass the real list.

**To finish wiring it up**
1. Add a bundler (Vite or esbuild), a `tsconfig.json`, and the `typescript` and `@types/react*` dev dependencies.
2. In `checkout.html`, replace the form with `<div id="checkout-root"></div>` and load the bundle instead of `checkout.js`.
3. The inline script that pushes onto `App.q` still works, but the bundle must load before `tracking.js`, as `checkout.js` does today.

I couldn't check `tracking.js` because it isn't in the repo, so I can't confirm how it uses `checkout:submit` or the `App` object.