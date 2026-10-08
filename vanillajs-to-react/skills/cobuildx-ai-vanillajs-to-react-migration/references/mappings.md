# Vanilla JS → React concept map

Read this in the Plan step, and when a unit hits a concept you haven't
mapped yet. In each unit file, list only the rows you actually used.

| Vanilla JS concept | React equivalent | Why |
|---|---|---|
| `el.textContent = x`, read back later | JSX rendered from state | The page is no longer the state |
| `classList.add/remove/toggle` for visibility or "active" | `className` or conditional render from state | Describe the result |
| `style.display = 'block'` | Conditional render | Same visible result, no inline toggling |
| `input.value` read inside a handler | Controlled `value` + `onChange`, or the value stored when the action ran | Handlers stop re-reading the page |
| `data-*` attributes used as storage | Props and state | Don't store data on elements |
| `innerHTML` / template strings | JSX | JSX escapes values; raw HTML needs a reason |
| `createElement` + `appendChild` loops | A pure data function + `.map()` with stable `key`s | Split working out the data from drawing it |
| `addEventListener` on an element | `onClick` / `onChange` / `onKeyDown` on the element | Handlers live on the element |
| Event delegation on a parent | A handler on each item, or one on the list | No selector matching |
| Listeners on `window` / `document` | `useEffect` that adds and removes them | Pair setup and teardown |
| `setTimeout`, `setInterval`, `requestAnimationFrame`, observers | `useEffect` with cleanup | No leaks on unmount |
| `fetch` + manual loading/error DOM updates | API module + TanStack Query | Loading and error states come for free |
| Globals and `window.App` helpers | ES module imports | Explicit dependencies |
| Modules sharing state through globals or custom events | Lift state up, Context, or a small store — **only if needed** | Explicit data flow |
| `localStorage` read at startup | A hook that reads it once; pre-paint values stay in a `<head>` script | Keep values that must apply before first paint outside React |

Rule of thumb: if a handler reads the page back as if the DOM were a
variable, that value is state. Store it once, and render everything else
from it.
