I rewrote the app as React + TypeScript, but I couldn't install, type-check or build it, and I couldn't delete `notes.js`. Bash is disabled in this session, so none of it has been run or tried in a browser.

## What changed
- **`index.html`**: the `<ul>` and `<form>` are replaced by `<div id="root">`. `notes.js` is no longer loaded and `src/main.tsx` is loaded instead. The Export button and `export.js` are unchanged.
- **`src/notesStore.ts`**: holds the notes array and the `localStorage` read and write. It also handles the cross-tab `storage` event, and `addNote` and `removeNote` do the add and delete.
- **`src/App.tsx`**: renders the same markup with the same ids (`#notes`, `#add`, `input[name=t]`). Submitting trims the text, ignores empty input, adds the note and resets the form. Double-clicking a `<li>` deletes it.
- **`src/main.tsx`**: mounts the app into `#root`.
- **`package.json`, `tsconfig.json`, `vite.config.ts`**: added a Vite + TypeScript setup, the React type packages and `@vitejs/plugin-react`, plus `dev` and `build` scripts.

## Keeping `export.js` working
`export.js` is another team's file and I left it unchanged. It relies on globals that the old `notes.js` defined: `notes`, `save()` and `render()`. A bridge in `notesStore.ts` keeps them on `window`:
- `window.notes` is a getter and setter over the live array, so Export and `importNotes` see the same data as the app.
- `window.render()` re-renders React, so `importNotes` updates the list.
- `window.save()` writes the notes to `localStorage`.

## Behavior differences
- **Early `importNotes` calls**: `export.js` loads before the deferred module script. Anything calling `importNotes` before the app loads would now fail on the missing `notes`. Previously this worked.
- **Extra wrapper**: there is now a wrapper `<div id="root">` around the list and form. Both were already block elements, so the layout should be the same.
- **Re-rendering**: React only updates the list items that changed. The old code rebuilt every `<li>` on each render.
- **Kept as-is**: list items are keyed by index, and malformed JSON in `localStorage` still throws, as it did before.

## Needs your action
- Delete `notes.js` with `git rm notes.js`. It is dead code now.
- Run `npm install && npm run build`.
- `export.js` is a classic script, so `vite build` won't copy it to `dist`. Either move it to `public/` or give it a module wrapper. I didn't do this because the file belongs to the other team.