I rewrote the project edit form as a React + TypeScript component and mounted it from the Ember route template. I haven't run or built anything. The repo has no build config, no tests and no tsconfig.

**What changed**
- **`app/react/ProjectEditForm.tsx`** (new): the form with name input, name errors, description textarea, and Save and Cancel buttons. Save is disabled while saving.
- **`app/react/mount-project-edit-form.tsx`** (new): a small modifier that creates the React root once, re-renders when its args change, and unmounts on teardown. I wrote it with `setModifierManager` because `ember-modifier` and `@ember/render-modifiers` aren't in `package.json`.
- **`app/modifiers/project-edit-form.js`** (new): a re-export so the template can call the modifier by name.
- **`app/templates/projects/edit.hbs`**: now just `<div {{project-edit-form this.formProps}}></div>`.
- **`app/controllers/projects/edit.js`**: still owns the Ember Data record and the transitions. It exposes `formProps` and callbacks for name and description changes, save and cancel.
- **`app/routes/projects/edit.js`**: untouched. Its "Discard changes?" guard still works because the React form writes every edit onto the record, so `hasDirtyAttributes` stays accurate.

**Behavior differences**
- **Transitions:** I replaced `transitionToRoute` with `router.transitionTo`. `transitionToRoute` was deprecated in Ember 3.26 and, as far as I recall, removed in 5.0, so it probably already fails on your `ember-source` 5.4. The transition target is the same.
- **Wrapper element:** there is now a `<div>` around the form, so any CSS with `>` or `:first-child` selectors on the form could break. I only had the route files to search, so I couldn't check the stylesheets.
- **Input and textarea:** they are now plain React controlled elements instead of Ember's `<Input>` and `<Textarea>`. The markup should be the same, but I didn't compare attributes such as `id`.
- **Local input state:** the inputs keep their own React state and write through to the record, to avoid cursor jumps from asynchronous re-rendering. If something else changes `name` or `description` on the record while the form is open, the form won't show it. Nothing in the repo does that today.
- **Quirks kept for parity:**
  - The route adds a new `routeWillChange` listener every time it is constructed and never removes it.
  - Save errors (422) are swallowed, and the form shows them through `model.errors`.
- **Not verified:** I assumed the Ember Data 5.3 model attributes and `errors.name` are tracked, so error and saving state update the form. Check this when you first run it.

**Still to do**
- Add a tsconfig and JSX build support, for example through `ember-cli-babel`'s TypeScript setup. Without them `.tsx` won't compile.
- Port any acceptance tests. None are in the repo.