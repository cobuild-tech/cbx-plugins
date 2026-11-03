The cart is now a React component in TypeScript, but I haven't installed dependencies, typechecked or built it. I also couldn't delete `public/js/cart.js` because I have no shell access here. Nothing references it any more, so run `git rm public/js/cart.js`.

**What changed**
- `src/Cart.tsx` is the new component. It holds the items and quantities in state and derives the total and the Checkout button's disabled state from them. Remove posts to `/cart/remove`.
- `src/main.tsx` mounts the component into `#cart-root`.
- `app/views/cart.html` now has the mount div, with the items passed as JSON in a `data-items` attribute. The hard-coded rows and `cart.js` script tag are gone. jQuery, `setup.js` and `analytics.js` still load as before, followed by the bundle.
- `vite.config.ts` builds the bundle to `public/js/dist/cart.js`. I added `tsconfig.json`, the `@types/react` and `@types/react-dom` dev dependencies, and `build` and `typecheck` scripts to `package.json`.

**Two interactions with the jQuery side**
- **Analytics event:** `analytics.js` (growth team) listens for a jQuery `cart:updated` event, and a native event wouldn't reach it. The component fires the event through `window.jQuery(document).trigger(...)`, so `analytics.js` is untouched.
- **CSRF header:** `setup.js` adds `X-CSRF-Token` through `$.ajaxSetup`, which only applies to jQuery requests. The component's `fetch` reads the token from the meta tag and sends it itself.

**Differences from the old behaviour**
- The old script's initial `updateTotal()` ran before `analytics.js` registered its listener, so the first total was never reported. I kept that by not emitting on mount.
- Removed rows disappear immediately instead of fading out over 200ms.
- The total now updates as you type in a quantity field, not only when the field loses focus.
- A row is removed only if the server responds OK. The old code only checked that the request didn't fail.

To try it, run `npm install && npm run build`.