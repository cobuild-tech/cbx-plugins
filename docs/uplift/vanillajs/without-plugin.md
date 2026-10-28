```tsx
// NotesApp.tsx
import { useEffect, useState, type FormEvent } from 'react';

type Theme = 'light' | 'dark';

function parseNotes(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? value.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: string[]): void {
  localStorage.notes = JSON.stringify(notes);
}

export function NotesApp() {
  const [notes, setNotes] = useState<string[]>(() => parseNotes(localStorage.getItem('notes')));
  const [text, setText] = useState('');
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  // Sync notes changed in other tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'notes') setNotes(parseNotes(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = (next: string[]) => {
    saveNotes(next);
    setNotes(next);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    update([...notes, text]);
    setText('');
  };

  const removeNote = (index: number) => update(notes.filter((_, i) => i !== index));

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.theme = next;
    setTheme(next);
  };

  return (
    <>
      <button id="toggle" onClick={toggleTheme}>Theme</button>
      <ul id="notes">
        {notes.map((note, i) => (
          <li key={i} data-i={i} onClick={() => removeNote(i)}>{note}</li>
        ))}
      </ul>
      <form id="add" onSubmit={onSubmit}>
        <input name="t" value={text} onChange={(e) => setText(e.target.value)} />
      </form>
    </>
  );
}
```

```tsx
// main.tsx
import { createRoot } from 'react-dom/client';
import { NotesApp } from './NotesApp';

createRoot(document.getElementById('root')!).render(<NotesApp />);
```

Replace the old body markup and script with `<div id="root"></div>`.

**Things to know**

- **Keep the `<head>` script as is.** It sets `data-theme` before first paint, which prevents a flash of the wrong theme. React renders too late to do that. The component reads the initial theme from that attribute, so the two stay in sync.
- **Storage format is unchanged.** The keys `notes` (a JSON array) and `theme` are the same, so the remaining plain-JS code keeps working. If that code writes `localStorage.notes` directly, React won't re-render in the same tab, because `storage` events only fire in other tabs. The old code had the same limitation, but it matters more once state lives in React.
- **Two small behaviour fixes:**
  - Malformed JSON, or a cleared `notes` key in another tab (`newValue === null`), now gives an empty list. The old code would have thrown.
  - Non-string entries in storage are dropped.
- **Unchanged behaviours:**
  - Empty notes can still be added.
  - Theme changes still don't sync across tabs.
  - Notes are still deleted by clicking the `<li>`. A `<button>` inside each `<li>` would be better for keyboard and screen-reader users, but it would change the markup and CSS.
- **Index keys:** `key={i}` is deliberate. Notes are plain strings, so duplicates are allowed and there are no stable IDs.
- **Dependencies:** this needs React 18+ and `@types/react` / `@types/react-dom`.
- **Global typing:** `localStorage.notes` and `localStorage.theme` are used as in the original. TypeScript accepts this because `Storage` has a string index signature. If you'd rather not rely on that, use `getItem`/`setItem`.
- I haven't compiled or run this.
