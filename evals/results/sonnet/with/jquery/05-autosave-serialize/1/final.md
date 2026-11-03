I rewrote the editor form as a React + TypeScript component, but I haven't built, type-checked or run it. I had no shell, so I couldn't install the new dev dependencies or run `npm run build` or `npm run typecheck`.

**Changes**
- **`src/PostEditForm.tsx`:** the form and autosave logic. It uses the same markup, ids and class names, with uncontrolled inputs.
- **`src/main.tsx`:** mounts the component into `#post-form-root`.
- **`views/edit_post.html`:** now holds the empty container. It no longer loads `autosave.js` and loads `/js/edit-post.js` instead. jQuery and `leave-guard.js` stay.
- **`package.json` and `tsconfig.json`:** added `build` (esbuild into `public/js/edit-post.js`) and `typecheck` scripts, plus the TypeScript, esbuild and `@types/react*` dev dependencies. I picked esbuild myself, since the repo had no bundler.
- **`public/js/autosave.js`:** not deleted. It is unreferenced now, so run `git rm public/js/autosave.js` once you've checked the page. Restoring the old script tag and form is the rollback.

**Things I kept working**
- **`leave-guard.js`:** it checks `form.dirty` in the DOM, so React sets the `dirty` class on the form.
- **Server params:** the PATCH body is URL-encoded Rails-style (`post[title]`, `post[tags][]`), which is what `posts_controller.rb` expects. It also sends the `X-Requested-With: XMLHttpRequest` header that jQuery adds.
- **Failure handling:** a 4xx or 5xx response counts as "Not saved", as it did with `$.ajax`.
- **Global hooks:** nothing else in the repo uses `$.ajaxSetup` or the global ajax hooks, so no other behaviour was lost.

**Behavior differences and quirks**
- **Original quirks kept:**
  - Both `input` and `change` events trigger a save. `change` also fires on blur, so a blur after a save has finished causes a redundant save. I used native listeners on the form to keep this.
  - "Saved" and "Not saved" never clear when you edit again.
  - Requests aren't cancelled. An earlier request finishing can clear `dirty` while newer edits are still waiting to save.
- **Form encoding:** `URLSearchParams(FormData)` replaces `.serialize()`. Output should be the same for these fields, but I haven't compared real requests.
- **Unmount cleanup:** the component now clears its timer and ignores late responses on unmount. The original had no teardown.
- **Fields start empty:** the form has no initial values, as before. If the server later pre-fills them, the component will need `defaultValue` props.
- **Not tested:** I didn't port or add any tests. No test setup exists in the repo.