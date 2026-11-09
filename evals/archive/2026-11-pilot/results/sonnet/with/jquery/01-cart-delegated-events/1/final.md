The cart is now a React component in TypeScript, but I couldn't build or type-check it. Bash is disabled in this session, so `npm install`, `tsc` and `vite build` never ran, and I haven't tried it in a browser. `public/js/cart.js` is also still in the repo. It's no longer loaded by the page, so you can `git rm` it. Until then it doubles as the rollback path.

**What changed**
- `src/Cart.tsx` is the new component. It holds the rows, the total, the Checkout button's disabled state, and the remove flow with a 200ms fade.
- `src/cart-main.tsx` reads the existing server-rendered rows from `#cart-root` and mounts React over them.
- `vite.config.ts`, `tsconfig.json` and `package.json` build the entry into `public/js/cart.bundle.js` as a single script. I added `build` and `typecheck` scripts and `@types/react` and `@types/react-dom`.
- `app/views/cart.html` wraps the markup in `#cart-root` and loads `cart.bundle.js` instead of `cart.js`. Class names and ids are unchanged. The script order is still jQuery, `setup.js`, cart, `analytics.js`.
- `analytics.js` and `setup.js` are untouched.

**Kept working with jQuery**
- The component still fires `$(document).trigger('cart:updated', [total])`, so `analytics.js` keeps receiving it.
- `fetch` skips the `$.ajaxSetup` in `setup.js`. The remove request sets the `X-CSRF-Token` header (read from the meta tag) and `X-Requested-With` itself, and sends a form-encoded body like `$.post` did.

**Behavior differences**
- **Initial event:** the original fired `cart:updated` once on load, before `analytics.js` was bound, so nothing received it. I skip that first event so analytics doesn't suddenly get an extra `cart_total` push.
- **Quantity changes:** a quantity change takes effect on blur or Enter, approximating the DOM `change` event rather than reacting on every keystroke.
- **Fade-out:** the fade is a CSS opacity transition, not jQuery's `fadeOut`. The row is dropped after 200ms. Unlike `fadeOut`, the row isn't set to `display:none` first, so layout may differ slightly.
- **Remove request:** it only counts as success on a 2xx response. A failed or double-clicked request behaves as before, with no error handling and no double-click guard.
- **Non-numeric quantities:** they still produce `NaN` in the total, as before.