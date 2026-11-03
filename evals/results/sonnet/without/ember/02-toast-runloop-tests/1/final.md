I'm wrapping up. One loose end: I have no delete tool, so I blanked the old Ember component file instead of removing it.

I converted the toast system to React and TypeScript under `app/react/toasts/`. I haven't run or type-checked any of it, because the repo has no TypeScript config, no build setup and no test runner I could use.

**New files**
- `store.ts` holds a `ToastStore` class that is independent of React and Ember. It has `show(text, ms = 4000)`, `dismiss(toast)`, `subscribe` and `getSnapshot`. Timers use `setTimeout` and are cleared on dismiss.
- `useToasts.ts` is a hook built on `useSyncExternalStore`.
- `ToastStack.tsx` renders `<ul class="toasts">` with a clickable `<li>` per toast. The markup matches the old template.

**Changed files**
- `app/services/toasts.js` is now a thin bridge that delegates `show` and `dismiss` to the React store. Ember routes can keep calling `this.toasts.show(...)` with no changes.
- `tests/acceptance/save-profile-test.js` now uses `waitUntil` instead of `settled()`. The old service used Ember's run-loop `later`, which `settled()` waits for. The new store uses `setTimeout`, which it doesn't. The `waitUntil` timeout is 6 seconds.

**What you need to do**
- **Delete the old component:** `app/components/toast-stack.js` is now empty, and `toast-stack.hbs` is still there and still references the removed `this.toasts`. Run `git rm app/components/toast-stack.{js,hbs}`.
- **Mount `ToastStack`:** nothing in the repo renders it yet, because there is no application template or React root. Until you mount it, the acceptance test will fail.
- **Add tooling:** `package.json` has `react` and `react-dom` but no `typescript`, `@types/react` or `@types/react-dom`. It also has no build step that compiles `.ts` or `.tsx` under `app/react/`.