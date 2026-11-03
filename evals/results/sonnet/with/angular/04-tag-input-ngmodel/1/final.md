I replaced the `tagInput` UI with a React + TypeScript component and left `contact-form.html` untouched. I haven't compiled or run any of it, because Bash is disabled in this session. I also haven't run `npm install` or `tsc`.

**What changed**
- **`src/react/TagInput.tsx`** is the new React component, a controlled `{ value, onChange }` component.
  - Enter adds the trimmed text as a tag.
  - Each tag has a × link that removes it.
  - The input draft text is local state.
- **`src/react/tag-input.bridge.tsx`** is a thin AngularJS directive that is still named `tagInput`. `<tag-input name="tags" ng-model max required>` therefore keeps working in the form. It mounts the React component with `createRoot`.
  - I didn't use react2angular because it can't pass `ngModel` through.
  - The bridge keeps the old behaviour:
    - `$render`, `$setViewValue` and `$setTouched` work as before.
    - The `maxTags` validator still defaults to 5.
    - The custom `$isEmpty` is kept, so `required` still works.
    - `contactForm.tags.$error.maxTags` and `$touched` still work.
  - Two small additions: a change to `max` now re-runs validation, and the React root is unmounted when the scope is destroyed.
  - React events fire outside the Angular digest, so changes are wrapped in `scope.$apply`.
- **`tsconfig.json` and `package.json`:** I added a strict, no-emit `tsconfig.json` covering `src/react`. I added `typescript`, `@types/react` and `@types/react-dom` as devDependencies.
- **`src/tag-input.directive.js`:** I couldn't delete it without a shell, so I replaced its contents with a comment. If it stayed as it was, it would register a second `tagInput` directive. Please run `git rm src/tag-input.directive.js`.

**Still open**
- The repo has no bundler or script tags. Something needs to compile `src/react/tag-input.bridge.tsx` and load it after the `crm` module is defined, using whatever build the app already has.
- `angular` is declared as a global in the bridge, matching how the old directive used it.