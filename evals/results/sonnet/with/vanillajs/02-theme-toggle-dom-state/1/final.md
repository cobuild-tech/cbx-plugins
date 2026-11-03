I added a React + TypeScript version of the theme toggle under `src/`. I haven't compiled or run it. The repo has no bundler or `tsconfig.json`, so `index.html` still loads the old `theme-toggle.js`.

- **`src/ThemeToggle.tsx`** is the new `ThemeToggle` component. It has the same label text ("Dark mode" / "Light mode"), the same `aria-pressed` and the same `id`. On click it writes `data-theme`, saves it to `localStorage` under `theme`, and fires the `themechange` event that `chart.js` listens for.
- **`src/main.tsx`** mounts the component into `#theme-toggle-root`.

The component reads the theme from `document.documentElement.dataset.theme` instead of keeping its own React state. I did that because `theme-boot.js` and `chart.js` (`?hc=1` sets dark) also write that attribute. A `MutationObserver` keeps the label correct when they do. The old script only refreshed the label on click.

Before the component can replace the old script, you need to do three things:
1. Add a bundler such as Vite, plus a `tsconfig.json` and `@types/react` / `@types/react-dom`.
2. In `index.html`, replace the `<button>` with `<div id="theme-toggle-root"></div>`. Swap `<script src="theme-toggle.js">` for the bundled `src/main.tsx` entry.
3. Delete `theme-toggle.js`. I left it in place because the page needs it until step 2 is done.

I can set up Vite and do the `index.html` swap if you want.