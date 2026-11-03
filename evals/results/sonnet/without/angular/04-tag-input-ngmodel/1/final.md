I replaced the AngularJS tag input with a React + TypeScript one, but I haven't compiled, type-checked or run it. This session had no shell, so I couldn't install packages or run `tsc`.

**What changed**
- **`src/react/TagInput.tsx`** (new): the UI as a React component. It shows the tags as `.tag` spans with a `×` remove link, plus an input where Enter adds a trimmed, non-empty tag. It takes `value` and `onChange` props and knows nothing about Angular.
- **`src/react/tag-input.directive.tsx`** (new): a thin AngularJS directive that mounts the React component. I kept a directive here on purpose. `react2angular` can't plug into `ngModel`, so a plain component would have lost the form's validation and touched tracking.
- **`contact-form.html`**: unchanged. `<tag-input ng-model max required>` and the `contactForm.tags.$error.maxTags`, `$touched` and `required` checks work as before.
- **Old behaviour preserved**: `maxTags` validation (default limit 5, 3 in the form), the empty check for `required`, `$touched` after an add or remove, and re-validation when `max` changes.
- **`tsconfig.json`** (new) and **`package.json`**: I added a strict TypeScript config for `src/react` and dev dependencies for `typescript`, `@types/angular`, `@types/react` and `@types/react-dom`.

**What you need to do**
- **Delete the old file:** `src/tag-input.directive.js` is now only a comment stub, because I couldn't delete it. Remove it with `git rm`.
- **Bundler:** the repo has none, so `.tsx` files need compiling and bundling (esbuild, webpack or similar). Swap the script that loads the old `.js` file for the bundled output, and make sure the `crm` module is defined first. I didn't see where scripts are loaded, so I left that alone.
- **Install and check:** run `npm install` and `npx tsc -p .`. I used `any` for the Angular scope and `ngModel` types in the directive, which you may want to tighten.