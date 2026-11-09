I added `src/ThemeToggle.tsx` as a React + TypeScript version of the toggle. I haven't type-checked or run it, and nothing in `index.html` uses it yet.

**What the component does**
- It exports `ThemeToggle` (named and default) and a `Theme` type (`'light' | 'dark'`).
- It keeps the same behaviour as `theme-toggle.js`:
  - A click flips `document.documentElement.dataset.theme`.
  - It saves the new value to `localStorage['theme']`.
  - It dispatches a `themechange` `CustomEvent` with the new theme as `detail`.
  - The button label ("Dark mode" / "Light mode") and `aria-pressed` follow the current theme.
- The first render reads its state from the `data-theme` attribute that `theme-boot.js` sets.
- It keeps `id="theme-toggle"` and adds `type="button"`.

**Also changed**
- `package.json` now has `typescript`, `@types/react` and `@types/react-dom` as devDependencies. The original only listed `react` and `react-dom`.

**Not done**
- `index.html` and `theme-toggle.js` are unchanged, so the page still uses the old script. I left it because the repo has no bundler or `tsconfig.json`.
- To switch over, you'd need a build step and an entry file that renders `<ThemeToggle />` into a mount point. Then remove the `<button>` and the `theme-toggle.js` script tag from `index.html`, and delete `theme-toggle.js`. If you want that setup (for example Vite), I can add it.