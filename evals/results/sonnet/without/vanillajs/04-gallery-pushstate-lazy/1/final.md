I added `src/Gallery.tsx`, a React + TypeScript version of the gallery. I haven't run it or type-checked it, and I didn't wire it into the page.

**What it keeps from `gallery.js` and the markup**
- **Photos:** it reads `window.__PHOTOS__` by default, or takes a `photos` prop.
- **Filters:** the All, Cats and Dogs buttons filter by tag, and the active button gets the `active` class.
- **URL and history:** clicking a filter calls `history.pushState` with `?tag=…`. The initial tag comes from the URL, and back/forward (`popstate`) updates it.
- **Lazy loading:** each image gets its `src` only once it is within 300px of the viewport, using `IntersectionObserver`. The `<template>` is now JSX, with the same `nav#filters`, `#grid`, `figure`, `img.lazy` and `figcaption` structure.

**Small changes**
- The tag is URL-encoded when pushed to the URL.
- Each image has its own observer that disconnects once it loads, in place of the single shared one.

**Not done**
- `index.html` still loads `gallery.js` and the old markup, and I left both in place so nothing breaks.
- There is no `tsconfig.json`, `typescript` or `@types/react` yet, and no `src/main.tsx` entry point. Do you want me to add those and switch `index.html` to a Vite `#root` plus `<script type="module" src="/src/main.tsx">`, then delete `gallery.js`?
- `analytics.js` is untouched. If it relies on the old DOM, check it after the switch.