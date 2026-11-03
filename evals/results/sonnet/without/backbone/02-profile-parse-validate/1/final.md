I wrote the React component, but I couldn't delete the old Backbone view because Bash is disabled in this session. Nothing has been run, type-checked or rendered.

**What I added:** `src/react/ProfileForm.tsx`, a function component, `ProfileForm({ model, headerSelector? })`.
- **`app.Profile`:** I didn't touch it. The component takes an `app.Profile` instance as the `model` prop and calls `model.save(...)` on it. It only needs `get`, `save`, `on` and `off`, so I defined a small `ProfileModel` interface instead of adding `@types/backbone`.
- **Old view behaviour I kept:**
  - Submitting saves `displayName` and `website`.
  - An `invalid` event shows the validation message in `.error`.
  - A `sync` event clears the error and shows `.saved` for 1.5 seconds. This replaces jQuery's `fadeOut`, so the "Saved" text now disappears abruptly instead of fading.
  - A `change:displayName` event updates `#header .name`. You can change that selector with the `headerSelector` prop.
- **Event listeners:** they are added in an effect and removed on unmount, as `listenTo` did in the old view.
- **Markup:** the old view attached to an existing `#profile` element and read its inputs, but React has to render the form itself. I wrote that markup (two inputs, a Save button, and the `.error` and `.saved` spans) without having seen your original HTML. Check that it matches what you expect, including the "Saved" text and the CSS hooks.

**Still to do:**
- **Old view:** `src/views/profile-form.js` is still there. Nothing else in the repo references `app.ProfileForm`, so you can delete it with `git rm src/views/profile-form.js` once you've mounted the new component.
- **Build setup:** the repo has no `tsconfig` or bundler, so I didn't add either. `react` and `react-dom` are already in `package.json`, but you'll need `typescript` and `@types/react`.
- **Mounting:** wherever the old view was created with `new app.ProfileForm({model})`, render `<ProfileForm model={profile} />` with `createRoot` instead.