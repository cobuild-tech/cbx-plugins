I rewrote `notes.js` as a React + TypeScript app in `src/`, but I haven't installed, built or run any of it. I had no shell in this session. `notes.js` is still in the repo, though `index.html` no longer loads it, so please run `git rm notes.js`.

**New files**
- `src/store.ts` holds the notes state and the localStorage logic from the old file. It reads and saves the same `notes` key and re-reads when another tab changes it. It also exposes `window.notes`, `window.save` and `window.render`, because `export.js` calls them as bare globals.
- `src/App.tsx` renders the same `<ul id="notes">` and `<form id="add">` markup. Submitting trims the input, ignores empty text, adds the note and resets the form. Double-clicking a note deletes it.
- `src/main.tsx` mounts the app into `#root`.
- `tsconfig.json` has strict mode on and the `react-jsx` setting.

**Changed files**
- `index.html` now has a `#root` div, the unchanged Export button, `export.js` as a plain script, and the module entry `/src/main.tsx`.
- `package.json` gains `dev` and `build` scripts, plus `@types/react` and `@types/react-dom`.

I left `export.js` unchanged, since it belongs to another team. Its Export button and `importNotes()` should still work through the `window.notes`, `window.save` and `window.render` globals described above.

To try it, run `npm install && npm run dev`.