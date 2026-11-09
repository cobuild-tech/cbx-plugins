The filters panel is now a React/TypeScript component under `src/react/`, mounted in AngularJS. I haven't compiled, built or run any of it, and the repo has no bundler or tests. `ResultsCtrl` is unchanged.

**What changed**
- **`src/react/FiltersPanel.tsx`** is the React component. It has the search input, the Acme/Globex/Initech checkboxes and the "In stock" checkbox. The deep `$watch` and `$timeout` are replaced by a state effect with a 300 ms debounce. The initial value is skipped, as `nv === ov` did.
- **`src/react/filtersPanel.component.tsx`** is the AngularJS wrapper, registered as `<filters-panel>`.
  - It builds the initial state from `$location.search()` and creates the React root once in `$postLink`. It unmounts the root in `$onDestroy`.
  - The debounced callback runs inside `$rootScope.$apply`. That sets `$location.search(nv)` and broadcasts `filters:changed` with `angular.copy(nv)`, so `ResultsCtrl` works as before.
- **`src/filters.html`** is now just `<filters-panel></filters-panel>`.
- **`src/filters.controller.js`** is kept, with a comment, as a rollback path. Delete it once you've checked the panel in the app.
- **`package.json` and `tsconfig.json`**: I added TypeScript and the React type packages, plus a strict `tsconfig` covering `src/react`.

**Behavior differences and things I couldn't check**
- **Unmount while a change is pending:** the debounce timer is cancelled. The old `$timeout` was not cancelled on scope destroy, so a pending change would still have fired.
- **Timing:** `$apply` runs inside the timer callback, which is close to what `$timeout` did. The 300 ms debounce is the same.
- **Brands from the URL:** `checklist-model` was given a plain string when the URL had a single `?brands=Acme`. The React version treats a non-array value as an empty list. The old behavior in that case was unspecified. Say if you want it matched exactly.
- **In stock from the URL:** it uses `!!value`, as Angular's checkbox did. `?inStock=false` therefore shows as checked, because the value is a non-empty string. I kept this quirk.
- **Extra URL keys:** they are carried through to `$location.search` and the broadcast, as before.
- **Not found in the repo:** the app module definition, the `index.html` script tags and the build are not in the repo.
  - You will need to bundle `src/react` and load it after `angular.module('catalog')` is defined.
  - `checklist-model` is no longer needed by this panel. Remove it only if nothing else uses it.
  - Other markup that used `ng-controller="FiltersCtrl"` directly would need switching to `<filters-panel>`. I found none in the repo.