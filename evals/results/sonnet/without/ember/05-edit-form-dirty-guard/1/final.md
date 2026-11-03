The form is now a React + TypeScript component, but I haven't built or run any of it. The repo has no build setup that compiles `.tsx`, so I couldn't test it.

**New files**
- `app/react/ProjectEditForm.tsx` is a controlled form with typed props: `name`, `description`, `nameErrors`, `isSaving`, and the callbacks `onNameChange`, `onDescriptionChange`, `onSave` and `onCancel`. It renders the same markup as the old template: the name error `<p class="err">` messages, a Save button disabled while saving, and a Cancel button.
- `app/react/mount.tsx` creates a React 18 root on an element. It returns a handle with `render` and `unmount`.
- `app/modifiers/project-edit-form.js` is a small custom Ember modifier. It mounts the React form into its element and re-renders when the arguments change. It also unmounts on teardown. I wrote it by hand because `ember-modifier` isn't a dependency.

**Changed files**
- `app/templates/projects/edit.hbs` is now a single `<div>` that applies the modifier and passes it the model fields and the controller actions.
- `app/controllers/projects/edit.js` is now thin. The submit event is gone because React handles `preventDefault`.
  - Added `setName`, `setDescription` and a `nameErrors` getter that maps `model.errors.name` to messages.
  - Kept `save` and `cancel`, which still call `transitionToRoute`.

**Unchanged**
- `app/routes/projects/edit.js` is untouched. The route and its "Discard changes?" guard still work, because React writes to the Ember model through `setName` and `setDescription`, so `hasDirtyAttributes` stays accurate.

**Still needed**
- Add a TypeScript and JSX build step for `app/react/`, for example ember-cli-babel with `@babel/preset-typescript` and the React JSX transform, or an embroider/vite setup.
- Add a `tsconfig.json` with `"jsx": "react-jsx"`, plus `@types/react` and `@types/react-dom`.
- I used the `capabilities('3.22')` modifier manager API. Check it against Ember 5.4 once the app builds.