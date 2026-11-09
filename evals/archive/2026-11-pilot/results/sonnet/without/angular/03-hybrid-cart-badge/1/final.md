I replaced the Angular `CartBadgeComponent` with a React + TypeScript one. I haven't built it or run it in a browser, because the repo has no build config, tsconfig or tests.

- **React component:** `src/react/CartBadge.tsx` renders the same `<a href="/cart" class="badge">` link as before, with the `empty` class when the count is 0. It subscribes to a `count$` observable and unsubscribes when it unmounts.
- **AngularJS wrapper:** `src/react/cart-badge.directive.tsx` registers a `cartBadge` directive that mounts the React component into the element. It gets `cartService` injected and unmounts the React root when the element is destroyed.
- **Header:** `src/legacy/header.html` still has `<cart-badge></cart-badge>`, so the badge stays in the header unchanged.
- **Module cleanup:** `src/app/app.module.ts` no longer declares or downgrades the Angular component. It now imports the directive file and still downgrades `CartService`.

**Things to know:**
- **Count fix I added:** `CartService.count$` had a placeholder `pipe(/* map to total qty */)`, so it emitted the item array rather than a number. I added the `map` that sums `qty`, because the badge would otherwise have rendered the array. Revert that if it was intentional.
- **Old file is blank, not deleted:** I had no delete tool, so `src/app/cart-badge.component.ts` is now an empty file. Please run `git rm src/app/cart-badge.component.ts`.
- **Build setup still needed:** `package.json` already lists `react` and `react-dom`. You'll still need `@types/react`, `@types/react-dom`, and a bundler or tsconfig with `"jsx": "react-jsx"`. The directive file imports React explicitly, so classic JSX also works.