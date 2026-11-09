I rewrote the editor as a React + TypeScript component, but I haven't installed dependencies, built the bundle or run the typecheck. I also couldn't delete `public/js/autosave.js` because I have no delete tool here, so run `git rm public/js/autosave.js`. Nothing references it any more.

**New files**
- `src/PostEditor.tsx` holds the form (title, body, News/Tips checkboxes, save status) as a controlled component.
  - **Autosave:** edits are debounced by 1s, then sent as `PATCH /posts/:id/autosave`.
  - **Request format:** the body is form-encoded with the same `post[title]`, `post[body]` and `post[tags][]` keys that `$.serialize()` produced, so `posts_controller.rb` needs no changes.
  - **Status:** the span shows "Saved" or "Not saved" as before.
  - **Dirty flag:** the form gets the `dirty` class while there are unsaved edits, because `leave-guard.js` reads `form.dirty`.
- `src/index.tsx` mounts the component into `#post-editor-root`.
- `tsconfig.json` sets strict mode.

**Changed files**
- `views/edit_post.html` now has a mount `<div data-post-id="42">` and loads `/js/editor.js`. It still loads jQuery and `leave-guard.js`, since you said the guard stays jQuery.
- `package.json` gains `build` (esbuild bundles to `public/js/editor.js`) and `typecheck` scripts. It also gains devDependencies for typescript, esbuild and the React types. You didn't mention a bundler, so esbuild is my choice and is easy to swap.

**Behaviour changes**
- A new edit cancels the pending timer and aborts any in-flight save.
- If you keep typing while a save is in flight, the form stays dirty rather than being marked clean.
- The old code cleared `dirty` on any successful save, so the leave warning could be skipped when edits arrived mid-save.

**Open items**
- The post id is still hardcoded to 42 in the view, as in the original.
- The form starts empty because the original markup had no initial values. If the server should prefill it, pass `initial` to `PostEditor`.

Next steps: `npm install && npm run build && npm run typecheck`.