I replaced the jQuery UI tabs with a React + TypeScript component, but I haven't built or run any of it. The shell was disabled, so I couldn't install packages, run `tsc`, or bundle.

**What's new**
- `src/Tabs.tsx` is the tabs component. It uses `role="tablist"`, `tab` and `tabpanel`, and supports arrow, Home and End keys. Panels stay mounted and are hidden rather than unmounted. Their server-rendered HTML is never re-applied, so `billing.js` can still do `$('#billing').load(...)` without React overwriting it.
- `src/main.tsx` reads the existing `#tabs` markup (the links and panel contents) and mounts React into it. The initial tab comes from `location.hash`. On a user-initiated switch it calls `history.replaceState` and fires the jQuery `account:tab` event with the panel id. This matches the old behaviour, so `billing.js` is unchanged.
- `tsconfig.json` is new. `package.json` gains `build` (esbuild, output `public/js/tabs.bundle.js`) and `typecheck` scripts, plus `typescript`, `esbuild` and the React type packages as dev dependencies.

**What I changed**
- `views/account.html` no longer loads jQuery UI or `tabs.js`. It loads `/js/tabs.bundle.js` instead. jQuery itself stays, because `billing.js` and `help-widget.js` use it.
- `public/js/help-widget.js` called `$('#tabs').tabs('option','active')`, which no longer exists. It now reads the selected tab's `aria-controls` from the DOM and returns the same ids (`profile`, `billing`, `security`). Its comment calls it a third-party widget, so check whether you actually own that file.

**What you need to do**
1. Run `npm install && npm run build && npm run typecheck`.
2. Delete `public/js/tabs.js` (`git rm`). I couldn't, and nothing references it any more.
3. Decide whether to commit the generated `tabs.bundle.js` or build it at deploy time.

**Behaviour notes**
- Like the original, the `account:tab` event doesn't fire for the initially selected tab. `billing.js` already handles `#billing` on load itself.
- The markup is now buttons inside `div.tabs` rather than `ul/li/a`. Any CSS that targeted the jQuery UI classes (`ui-tabs-*`) will need updating.