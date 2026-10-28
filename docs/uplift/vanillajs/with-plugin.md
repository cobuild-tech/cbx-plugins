## React + TypeScript

**Head script: leave it exactly as it is.** It has to run before first paint to avoid a theme flash, so it stays inline in `<head>` outside React.

**Body:** replace the old markup and the old `<script>` block with a mount point:

```html
<div id="root"></div>
<script type="module" src="/src/notes.tsx"></script>
```

**`src/notes.tsx`**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';

function parseNotes(raw: string | null): string[] {
  return JSON.parse(raw || '[]');
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('theme', next);
}

function Notes() {
  const [notes, setNotes] = useState<string[]>(() =>
    parseNotes(localStorage.getItem('notes')),
  );

  // Other tabs only: the storage event doesn't fire in the tab that wrote.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'notes') setNotes(parseNotes(e.newValue));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function save(next: string[]) {
    localStorage.setItem('notes', JSON.stringify(next));
    setNotes(next);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const value = new FormData(form).get('t') as string;
    form.reset();
    save([...notes, value]);
  }

  return (
    <>
      <button id="toggle" onClick={toggleTheme}>Theme</button>
      <ul id="notes">
        {notes.map((n, i) => (
          <li key={i} data-i={i} onClick={() => save(notes.filter((_, j) => j !== i))}>
            {n}
          </li>
        ))}
      </ul>
      <form id="add" onSubmit={onSubmit}>
        <input name="t" />
      </form>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Notes />);
```

## Things to know

- **Ids, `data-i`, and the markup order are unchanged**, so CSS and any test selectors keep working.
- **Remove the old script entirely.** React now owns the button, list, and form. Nothing else on the page should touch `#notes`, `#toggle`, or `#add`.
- **The theme toggle still reads `data-theme` from the DOM when clicked**, as the original did. This keeps it correct if other plain-JS code changes the theme. The head script and the toggle are the only theme code, and nothing in React renders from the theme, so no React state is needed. Once the rest of the app is migrated, move this into a small hook.
- **`notes` is still a plain `localStorage` key shared with old code.** If other legacy scripts write `localStorage.notes` or use the global `notes` array or `render()`, they'll no longer update the UI. The old globals `notes`, `render`, and `save` are gone. Check the rest of the app for references. If you find any, I can add a small shared store for the transition.
- **`<li key={i}>` uses the index as the key.** That is safe here because items are stateless text. It matches the original, which rebuilt the list each time.
- **Quirks kept for parity:**
  - Empty or whitespace notes can be added.
  - Corrupt JSON in `localStorage.notes` throws on load.
  - A `storage` event with `newValue === null` (for example another tab calling `localStorage.clear()`) throws, because `JSON.parse(null)` returns `null` and `null.forEach` fails. In the original it threw in `render()`. In React the throw happens during render and unmounts the tree. Say if you want a guard such as `?? []`.
  - The theme is not synced across tabs, only notes.
- **Strict Mode:** the storage listener cleans up properly, so dev double-mounting is safe.
- **Setup:** this needs a bundler (Vite is the easiest, since it serves plain HTML pages) plus `react`, `react-dom`, and `@types/react*`. For a whole-app migration, open the repo in Claude Code and run `/vanillajs-to-react:plan`.
