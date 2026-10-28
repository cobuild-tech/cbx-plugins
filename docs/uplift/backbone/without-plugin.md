```tsx
// todos.tsx
import { useCallback, useEffect, useState } from 'react';

export interface Todo {
  _id: string;
  title: string;
  done: boolean;
  order: number;
}

// App.vent is still a Backbone.Events object. Only the methods we need are typed.
declare const App: {
  vent: {
    on(event: string, cb: () => void, ctx?: unknown): void;
    off(event: string, cb?: () => void, ctx?: unknown): void;
  };
};

const byOrder = (a: Todo, b: Todo) => a.order - b.order;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await api<{ items: Todo[] }>('/api/todos', { signal });
      setTodos([...r.items].sort(byOrder));
      setError(null);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e as Error);
    }
  }, []);

  // Initial load, aborted on unmount
  useEffect(() => {
    const ctrl = new AbortController();
    void refresh(ctrl.signal);
    return () => ctrl.abort();
  }, [refresh]);

  // Bridge to the Backbone event bus
  useEffect(() => {
    const handler = () => void refresh();
    App.vent.on('todos:refresh', handler);
    return () => App.vent.off('todos:refresh', handler);
  }, [refresh]);

  const toggle = useCallback(async (todo: Todo) => {
    const done = !todo.done;
    const apply = (patch: Partial<Todo>) =>
      setTodos((prev) =>
        prev.map((t) => (t._id === todo._id ? { ...t, ...patch } : t)).sort(byOrder),
      );

    apply({ done }); // optimistic, like Backbone's save() without {wait: true}
    try {
      const r = await api<{ todo: Todo }>(`/api/todos/${todo._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done }),
      });
      apply(r.todo); // server response wins, like Model.parse
    } catch (e) {
      apply({ done: todo.done }); // roll back
      setError(e as Error);
    }
  }, []);

  return { todos, error, toggle };
}

function TodoItem({ todo, onToggle }: { todo: Todo; onToggle: (t: Todo) => void }) {
  return (
    <li className={todo.done ? 'done' : ''}>
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo)} /> {todo.title}
    </li>
  );
}

export function TodosView() {
  const { todos, toggle } = useTodos();
  return (
    <ul>
      {todos.map((t) => (
        <TodoItem key={t._id} todo={t} onToggle={toggle} />
      ))}
    </ul>
  );
}
```

**Things to know**

- **Mounting inside Marionette:** the rest of the app is still Backbone, so render this with `createRoot(el).render(<TodosView />)`. Do that from a thin Marionette `View` in `onAttach`, and call `root.unmount()` in `onBeforeDestroy`. Otherwise the root and the `App.vent` listener will leak.
- **`App.vent` bridge:** `App.vent` is not part of React. The hook subscribes and unsubscribes through the `useEffect` cleanup. The `declare const App` is a minimal type. Replace it with a real import or typing once you have one.
- **State is no longer shared:** other Backbone code that holds the same `Todos` collection or `Todo` models won't see changes made here, and the reverse also holds. If other views depend on that collection, either keep it as the source of truth and subscribe React to it, or have those views listen for `todos:refresh` and refetch.
- **`Backbone.sync` behavior is not carried over.** Check whether your app configures any of these globally, and add them to `api()` if so:
  - CSRF or auth headers set through `$.ajaxSetup` or `Backbone.sync` overrides
  - `emulateHTTP` or `emulateJSON`
  - a custom `sync` or error handler
- **Optimistic update:** Backbone's `save()` applies the change immediately and doesn't roll back on failure. I added a rollback, which is a behavior change, and it sets `error`. Nothing displays that error yet, so render it however you like.
- **Re-render on every change:** Marionette re-rendered the whole item on any `change`. Here React re-renders per item. Wrap `TodoItem` in `React.memo` if the lists are large.
- **Sorting:** this replicates the `order` comparator with an explicit sort on each update. Backbone's `comparator: 'order'` also kept the collection sorted automatically, which isn't automatic here.
- **Escaping:** `<%- title %>` is handled by React's default escaping, so don't use `dangerouslySetInnerHTML`.
- **Untested:** I haven't compiled or run this. I assumed the `Todo` fields (`title`, `done`, `order`, `_id`) from your template and comparator. Adjust the interface if the model has more.
- **Possible follow-up:** if you adopt React Query or SWR, `useTodos` collapses to a `useQuery` plus a mutation. The `todos:refresh` handler would then call `invalidateQueries`.
