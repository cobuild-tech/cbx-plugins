I added the React version of `ProfileForm` in `src/react/ProfileForm.tsx`. I haven't run, type-checked or built it, and there's no `tsconfig` or bundler setup in the repo.

I couldn't delete the old Backbone view, `src/views/profile-form.js`, because I have no way to delete files here. Nothing else in the repo references it. You can remove it once you've mounted the React version.

`app.Profile` is unchanged. The component takes the existing model as a `model` prop and leaves validation and saving to it. Each part of the old view maps over like this:
- **Save:** submitting the form calls `model.save({ displayName, website })`. The inputs are now controlled React state instead of values read from the DOM.
- **Errors:** the model's `invalid` event shows the error text, and `sync` clears it.
- **Saved indicator:** `sync` shows a "Saved" label that fades out over 1500ms. It uses a CSS opacity transition in place of jQuery's `fadeOut`.
- **Header name:** `change:displayName` still updates `#header .name`, which sits outside the component. It now uses `document.querySelector`.
- **Cleanup:** the model listeners and the fade timer are removed when the component unmounts.

The old view bound to markup that already existed in the page at `#profile`, and I couldn't see that markup. The React version renders its own form: two inputs, a Save button, and the error and saved spans. Check it against your page, and add any labels or classes the page needs.

To mount it:

```ts
createRoot(document.getElementById('profile')!).render(<ProfileForm model={profile} />);
```

I typed the model with a small `ProfileModel` interface rather than importing Backbone types.