I've finished the edits and I'm writing up the summary now. Nothing has been built or run, because I have no shell here.

## What changed

**New**
- `src/Tabs.tsx`: the React + TypeScript tabs component.
  - It renders only the `<li>`/`<a>` tab items.
  - The panels (`#profile`, `#billing`, `#security`) stay server-rendered and jQuery-owned. This is because `billing.js` does `$('#billing').load(...)`. React only shows or hides them and sets their ARIA attributes.
- `src/accountTabs.tsx`: the entry point. It reads the existing `<ul>` markup, mounts React on it, and renders synchronously so panels don't flash.
- `tsconfig.json`, plus `build` and `typecheck` scripts and dev dependencies (esbuild, typescript, `@types/react`, `@types/react-dom`) in `package.json`. The build outputs `public/js/dist/account-tabs.js`.

**Edited**
- `views/account.html`:
  - The `jquery-ui` script tag is removed. Tabs were its only use in the repo, which I found by grepping the files here.
  - `tabs.js` is swapped for `/js/dist/account-tabs.js`.
- `public/js/help-widget.js`: it called `$('#tabs').tabs('option','active')`, which would break without jQuery UI. It now reads the index of `.ui-tabs-active` instead, and `HelpWidget.context()` returns the same values.

**Left in place:** `public/js/tabs.js` is untouched as a rollback path. Delete it once you've validated the new tabs.

## Parity kept
- The initial tab comes from `location.hash` and falls back to the first tab.
- Nothing fires on init, so `billing.js` still handles `#billing` on load itself.
- A click calls `preventDefault`, then calls `history.replaceState` with the tab's href and triggers `account:tab` with the panel id. It does this through `window.jQuery(document).trigger`, because `billing.js` listens through jQuery and a `CustomEvent` wouldn't reach it. Clicking the already-active tab does nothing.
- Arrow keys (with wrap-around), Home, End, Enter and Space work, with a roving `tabindex`.

## Behavior differences
- **Not run or type-checked.** Run `npm install && npm run typecheck && npm run build`, then check the page in a browser, including `/account#billing` loading its invoices.
- **Keyboard:** jQuery UI's Ctrl+PageUp/PageDown, and its short delay before an arrow key activates a tab, are not implemented.
- **Markup:** jQuery UI's other generated attributes (`aria-expanded`, `ui-state-*`, `ui-corner-*`, `ui-widget*` classes) are not reproduced. The page loads no jQuery UI CSS and the repo has no stylesheet, so nothing here uses them. Check any stylesheet outside this repo.
- **Dependency:** `account:tab` depends on `window.jQuery` being loaded first. The script order in `account.html` ensures this.
- **Strict Mode:** the component has no side effects that Strict Mode's double mount would duplicate.

I didn't write characterization tests or Playwright checks, so there's no test coverage for the old and new versions yet.