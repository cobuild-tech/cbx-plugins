The gallery is now a React + TypeScript component, but I haven't run, built or type-checked it. I also couldn't delete `gallery.js`, because Bash is disabled in this session.

**What changed**
- **`src/Gallery.tsx` (new):** the `Gallery` component renders the filter nav and the photo grid.
  - **Filters:** the selected tag is React state, read from `?tag=` on first render. The All/Cats/Dogs buttons mark the current tag `active`.
  - **Photos:** `photos` defaults to `window.__PHOTOS__`, and a `Photo` type declares its shape.
  - **Cards:** the `<template id="card">` is replaced by JSX `<figure>` elements.
  - **Lazy loading:** a small `LazyImage` component sets `src` once it's within 300px of the viewport, using the same `IntersectionObserver` setup as before. It cleans up on unmount.
  - **History:** clicking a filter calls `history.pushState({tag}, '', '?tag=…')`. A `popstate` listener restores the tag, falling back to `'all'` when there's no state, as before.
- **`src/main.tsx` (new):** mounts `<Gallery />` into `#root`.
- **`index.html`:** now holds `analytics.js`, `<div id="root">` and the module script for `/src/main.tsx`. The nav, grid and template markup are gone.
- **`tsconfig.json` (new):** strict mode with `jsx: react-jsx`.
- **`package.json`:** added `typescript`, `@types/react` and `@types/react-dom` as dev dependencies.

**Things to know**
- **Analytics:** I left `analytics.js` as a plain script that loads first. It wraps `history.pushState` to send the page-view beacon. The component calls `history.pushState` directly, so the beacon still fires on each filter click.
- **Photo data:** nothing in the repo sets `window.__PHOTOS__`, so it must be injected elsewhere. It has to be set before `main.tsx` runs, because the component reads it on first render. Alternatively, pass `photos` as a prop.
- **To do:** delete `gallery.js` with `git rm gallery.js`. It's no longer referenced. Then run `npm install` and `npx tsc` to check types.