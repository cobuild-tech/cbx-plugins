`CartBadgeComponent` is now a React + TypeScript component, still rendered as `<cart-badge>` in the header. I didn't build or run anything, and the repo has no tests. I also couldn't delete the old file because shell access is disabled here. Please run `git rm src/app/cart-badge.component.ts`. Until you do, it's an undeclared Angular component that an AOT build may reject.

**What changed**
- **`src/react/CartBadge.tsx`** (new): the React component.
  - It subscribes to the `count$` observable it's given and unsubscribes on cleanup.
  - It renders `<a href="/cart" class="badge [empty]">{count}</a>`, with `empty` when the count is 0.
- **`src/react/cart-badge.mount.tsx`** (new): an AngularJS `.component('cartBadge')` wrapper.
  - It creates the React root once in `$postLink` and unmounts it in `$onDestroy`.
  - It injects the downgraded `cartService`, so React reads the same `BehaviorSubject` as `ProductCtrl`.
  - `src/legacy/header.html` is untouched.
- **`src/app/app.module.ts`**: removed the old import, the `downgradeComponent` directive and the `declarations` entry. The `cartService` downgrade stays, and the file now imports the mount module.

**Behavior differences and quirks**
- **Empty count pipe:** `CartService.count$` has an empty `pipe(/* map to total qty */)`, so it emits the items array, not a number. The old template showed that array and the React version does too. I typed the prop as `Observable<number>` to match the intent, so TypeScript won't flag it. I didn't fix it.
- **Zone and digest:** no change detection is needed because React owns its own state.
- **Class order:** the class string is `badge empty` rather than Angular's binding order. Only a selector that depends on class order would notice.
- **Build config:** there's no tsconfig or bundler config in the repo. You'll need `"jsx": "react-jsx"` and `@types/react` / `@types/react-dom` for the `.tsx` files to compile.
- **Rollback:** it's a git revert, since the old component is only removed from the working tree.