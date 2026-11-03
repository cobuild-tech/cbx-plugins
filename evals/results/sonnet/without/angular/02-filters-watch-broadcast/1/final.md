The filters panel is now a React and TypeScript component, but I haven't compiled it, run it or tested it. There's also no bundler config in the repo.

**New files**
- `src/react/FiltersPanel.tsx` holds the `FiltersPanel` component. It is a controlled component with the same three inputs as before: a search box, Acme/Globex/Initech checkboxes and an "In stock" checkbox.
  - Changes are debounced by 300ms, as the old `$timeout` was.
  - It doesn't fire on mount, matching the old `nv === ov` skip.
  - `normalizeFilters` turns `$location.search()` output into proper values. A single `brands` value arrives as a string and `inStock` as `"true"`, which the old code didn't handle.
  - It replaces `checklist-model`, so that dependency isn't needed for this panel.
- `src/react/reactFilters.tsx` is a small `<react-filters>` AngularJS directive that mounts the component. On a debounced change it calls `$location.search(filters)` and broadcasts `filters:changed` on `$rootScope` with a copy of the filters. It does this inside `$evalAsync`, since the change fires outside a digest. It unmounts the React root on `$destroy`.
- `tsconfig.json` is a strict config covering `src/react`.

**Edited files**
- `src/filters.html` is now just `<react-filters></react-filters>`.
- `package.json` gains `typescript`, `@types/react` and `@types/react-dom` as dev dependencies.
- `ResultsCtrl` is untouched, and it still receives `filters:changed` as before.

**What you need to do**
- I couldn't delete `src/filters.controller.js` because shell access is disabled here. Remove it with `git rm src/filters.controller.js` and drop its `<script>` tag. Nothing uses it any more, since the template no longer references `FiltersCtrl`.
- Nothing builds `.tsx` files yet. You need a bundler such as esbuild or Vite to produce a script that loads after the `catalog` module is defined. Then run `npm install` and `npx tsc` to check the types.