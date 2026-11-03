I moved the toast logic and the `ToastStack` UI into React and TypeScript under `app/react/toasts/`. Nothing has been run or built, so none of it is tested. The repo has no build config, no `tsconfig`, and no Ember app or routes beyond these files.

**What changed**
- **`app/react/toasts/store.ts`** (new): a store that doesn't depend on Ember. It does what the old service did: `show(text, ms = 4000)` adds a toast and schedules its dismissal, and `dismiss(t)` cancels the timer and removes it. React reads it through `useSyncExternalStore`.
- **`app/react/toasts/ToastStack.tsx`** (new): renders `<ul class="toasts">` with one `<li>` per toast. Clicking an item dismisses it. The markup and class names are the same as before.
- **`app/services/toasts.js`**: now a thin wrapper over the store. Ember routes can keep calling `this.toasts.show(...)` and `dismiss(...)`. `items` is now a plain getter, so it is no longer `@tracked`.
- **`app/components/toast-stack.{hbs,js}`**: still `<ToastStack />`, so callers don't change. It now renders a `<div>` that mounts the React component.
- **`app/modifiers/mount-toast-stack.js`** (new): creates the React root once when the element is inserted and unmounts it on teardown.
- **`package.json`**: added `ember-modifier`. Run an install before building.

**Why the timers still use Ember's run loop**
- The existing acceptance test depends on `settled()` waiting for the toast to expire. `settled()` doesn't wait for a plain `setTimeout`.
- The Ember service therefore gives the store the run loop's `later` and `cancel`, so the test behaves as before.
- The store defaults to `setTimeout`, so it works once Ember is gone.

**Behavior differences**
- The React root sits inside a `<div style="display: contents">`. This adds one wrapper element. Any CSS or test selector that uses `>` or `:first-child` against the old `ul.toasts` position could break. I found none in this repo.
- React renders asynchronously after the store changes. The acceptance test should still pass, because `settled()` polls and React flushes first, but I haven't run it. If it is flaky, wrap the updates in `flushSync`.
- The Ember service has to be created before the first toast, so that the run-loop scheduler is installed. Routes get it through injection, so this holds. If the store is used before then, it falls back to `setTimeout`, and `settled()` won't see the timer.
- The old service kept a timer handle on each toast, and the new one does too.

**Cleanup for later**
- Once no Ember code calls `toasts.show`, delete the service, the wrapper component, and the modifier.
- Callers can then import `toastStore` directly.