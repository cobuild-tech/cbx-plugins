I've moved ProductSearch's logic into React, but I haven't run or built any of it. There's no build setup for `.tsx` or a tsconfig, and I didn't check that the dependencies resolve.

**What changed**
- **`app/react/ProductSearch.tsx`:** new React component. It debounces input by 250ms and calls `store.query('product', { filter: { q } })`. A new keystroke cancels the previous search, and unmounting cancels any pending one. This mirrors the old `restartableTask`.
- **`app/components/product-search.js` and `.hbs`:** now a thin Ember shell. The template is a single `<div class="product-search">`, so `.sidebar > .product-search` in `search.css` still matches. It injects the store and registers a test waiter.
- **`app/modifiers/mount-product-search.js`:** new modifier that creates the React root on insert and unmounts it on teardown.
- **`app/react/ProductRow.tsx`:** a placeholder (see below).
- **`package.json`:** added `ember-modifier` and `@ember/test-waiters`, plus TypeScript and the React type packages as dev dependencies. Run an install.

**Coupling I kept working**
- **Compare tray:** `CompareTray` reads `store.peekAll('product')`. React gets the real Ember store and queries through it, so results still land there. I didn't use `fetch`, which would have left the tray empty.
- **Tests:** `settled()` doesn't wait for a plain `setTimeout` or a promise. The debounce and query are wrapped in a test waiter so it does.

**Behavior differences and open items**
1. **`ProductRow` is a placeholder.** The template used an Ember `<ProductRow>` component, but it isn't in this repo. I wrote a simple React row (name and price) that won't match the original's markup or behavior. Please send the original so I can port it.
2. **Build setup is missing.** The repo has no tsconfig and no config for compiling `.tsx` in the Ember build. You'll need to add that, for example via `ember-cli-babel` TypeScript support or an esbuild step.
3. **Stale queries aren't cancelled.** Ember Data's `store.query` can't be aborted, so an in-flight query still finishes and I discard its result. The old task behaved the same way.
4. **Kept from the original:** the input is uncontrolled, and clearing it doesn't clear the results.
5. **React elements are keyed by `id`.** Glimmer's `{{#each}}` keys by object identity. That should look the same unless records lack ids.
6. **No tests ported.** No tests exist in the repo.