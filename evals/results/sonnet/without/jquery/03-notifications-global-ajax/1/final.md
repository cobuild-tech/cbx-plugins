The notifications dropdown is now a React + TypeScript component under `src/`. I haven't installed dependencies, built the bundle, run the type check, or loaded it in a browser.

**New files**
- `src/notifications/Notifications.tsx` is the component.
  - **Polling:** it polls `/notifications?since=…` every 15 seconds, plus once on mount. It keeps `lastSeen` in a ref and clears the interval on unmount.
  - **Ordering and count:** new items are prepended with the last item in a batch on top, as before. The count shows the total number of items, read or not, and is hidden when there are none.
  - **Click:** clicking an item POSTs `/notifications/:id/read` and gives it the `read` class.
  - **Item HTML:** `n.html` is rendered with `dangerouslySetInnerHTML`. That is the same trust model as the old string concatenation, so the server HTML must be trusted.
- `src/notifications/index.tsx` mounts the component into `#notif-root`.
- `tsconfig.json` uses strict mode.

**Changed files**
- `package.json` adds `build` (esbuild bundles to `public/js/notifications.bundle.js`) and `typecheck` scripts. It also adds esbuild, typescript and the React type packages as dev dependencies.
- `views/layout.html` replaces `#notif-count` and `#notif-list` with a single `<div id="notif-root">`. It loads `notifications.bundle.js` instead of `notifications.js`.

**Network calls still use jQuery.** The component calls the global `$.getJSON` and `$.post` instead of `fetch`. `public/js/global.js` hooks jQuery's ajax to add the CSRF header, disable caching, show the spinner and redirect to `/login` on a 401. `fetch` would have skipped all of that. If you later move `global.js` off jQuery, swap those two calls then.

**To do on your side**
1. Run `npm install && npm run build`. The bundle isn't committed, so your deploy needs to run the build.
2. Delete `public/js/notifications.js`. It's no longer referenced, and I had no way to delete files here.