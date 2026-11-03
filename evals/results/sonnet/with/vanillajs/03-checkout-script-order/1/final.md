The checkout form is now a React + TypeScript component, but I haven't run it. I didn't run `npm install`, `tsc` or a browser, so nothing is type-checked or tested yet.

**Changes**
- **`src/CheckoutForm.tsx`** is the new component. It renders the same `<form id="checkout">` with the same fields and `Pay` button, and the form stays uncontrolled. The original read and wrote DOM values directly, and keeping that preserves the quirks below.
- **`src/main.tsx`** mounts the component into `#checkout-root` with `createRoot`.
- **`checkout.html`**: the form markup is now an empty `#checkout-root` container. The `checkout.js` script tag is replaced by `<script type="module" src="/src/main.tsx">`. The inline `App.q.push` prefill script and `tracking.js` are unchanged.
- **`package.json`, `vite.config.ts`, `tsconfig.json`** are new or updated, so the page now needs a Vite build. `package.json` gains `dev` and `build` scripts plus Vite, TypeScript and React type devDependencies.

**What I kept from the old script**
- **Draft handling:** the draft restores from `sessionStorage` before first paint. It is saved on `beforeunload` with email and country only, never the card, and cleared after a successful payment.
- **Submit:** the button is disabled and `/pay` gets a `POST` of `FormData`. A successful response redirects to `/thanks`, a failed one re-enables the button, and `checkout:submit` fires right after the fetch starts, so `tracking.js` still works.
- **Old-script bridge:** `window.App.checkout.prefill` and the `App.q` queue still work. The inline script's `prefill({country:'DE'})` still runs, and `App.q` switches to run-immediately afterwards.

**Behavior differences**
- **Mounting:** React mounts from a module script, in document order with the deferred scripts. The layout effect runs the draft prefill and the queued callbacks before first paint. This is equivalent to before, but I haven't confirmed it in a browser.
- **Button disabling:** the button is disabled through React state rather than directly on the DOM. It happens on the next render instead of synchronously, so two submits in the same tick could in theory both go through.
- **Prefill lookup:** it uses `form.elements.namedItem(k)` instead of `form[k]`. The old form also matched properties like `form.action`, so a prefill key such as `action` no longer behaves the same. No caller does this today.
- **Strict Mode:** the queue flush is guarded with `Array.isArray`. Without the guard, React Strict Mode's second effect run would have thrown on `App.q.forEach`.

**Old quirks kept on purpose**
- The country `<select>` has no options, so `prefill({country:'DE'})` does nothing and the saved country is always `''`.
- A network failure on `/pay` never re-enables the button.
- `JSON.parse` of a corrupt draft throws.

**Things for you to do**
- I have no delete tool, so `checkout.js` is still in the repo, but it is no longer loaded. Delete it with `git rm checkout.js` after you've checked the page. Until then it is also the rollback path.
- Run `npm install && npm run build`, then `npm run dev` and open `/checkout.html`.
- Check by hand that the draft restores and that submit works, including `/pay` returning an error and the `/t` beacon being sent.