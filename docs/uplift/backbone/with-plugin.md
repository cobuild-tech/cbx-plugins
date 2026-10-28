This is snippet mode, so I converted only what you pasted. I haven't run or typechecked any of it, and I didn't create `.migration/`.

Because the rest of the app is still Marionette, the port has three parts: a React list component, a hook that reads the Backbone collection, and a small Marionette view that mounts it. The rest of the app can keep using `TodosView` as before.

```tsx
// todos/types.ts
export interface TodoAttrs {
  _id?: string;
  title: string;
  done: boolean;
  order: number;
}
export type TodoItem = TodoAttrs & { cid: string };
```

```tsx
// todos/useCollection.ts
import { useMemo, useSyncExternalStore } from 'react';
import type { Collection, Model } from 'backbone';
import type { TodoAttrs, TodoItem } from './types';

const EVENTS = 'add remove reset sort change';

function createStore(collection: Collection<Model>) {
  const compute = (): TodoItem[] =>
    collection.map((m) => ({ ...(m.toJSON() as TodoAttrs), cid: m.cid }));
  let snapshot = compute(); // cached; only replaced inside the event handler
  const listeners = new Set<() => void>();
  const onChange = () => {
    snapshot = compute();
    listeners.forEach((l) => l());
  };
  return {
    subscribe(l: () => void) {
      if (listeners.size === 0) {
        collection.on(EVENTS, onChange);
        onChange(); // catch changes between render and subscribe
      }
      listeners.add(l);
      return () => {
        listeners.delete(l);
        if (listeners.size === 0) collection.off(EVENTS, onChange);
      };
    },
    getSnapshot: () => snapshot,
  };
}

export function useCollection(collection: Collection<Model>): TodoItem[] {
  const store = useMemo(() => createStore(collection), [collection]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
```

```tsx
// todos/TodosList.tsx
import type { Collection, Model } from 'backbone';
import { useCollection } from './useCollection';

export function TodosList({ collection }: { collection: Collection<Model> }) {
  const todos = useCollection(collection);

  // Same call as the old TodoView.toggle: optimistic set + PATCH
  const toggle = (cid: string) => {
    const model = collection.get(cid);
    model?.save({ done: !model.get('done') }, { patch: true });
  };

  return (
    <>
      {todos.map((t) => (
        <li key={t.cid} className={t.done ? 'done' : ''}>
          <input type="checkbox" checked={!!t.done} onChange={() => toggle(t.cid)} />{' '}
          {t.title}
        </li>
      ))}
    </>
  );
}
```

```tsx
// todos/TodosView.tsx  (Marionette wrapper; replaces the old TodosView)
import Marionette from 'backbone.marionette';
import { createRoot, type Root } from 'react-dom/client';
import { TodosList } from './TodosList';

export const TodosView = Marionette.View.extend({
  tagName: 'ul',
  template: false,
  root: null as Root | null,

  initialize() {
    this.listenTo(App.vent, 'todos:refresh', () => { this.collection.fetch(); });
  },

  onRender() {
    this.root ??= createRoot(this.el);
    this.root.render(<TodosList collection={this.collection} />);
  },

  onBeforeDestroy() {
    this.root?.unmount();
    this.root = null;
  },
});
```

The model and collection stay in Backbone, unchanged. `Todo`, `Todos`, `idAttribute: '_id'`, `parse`, `comparator` and `fetch` all keep working. The React side only reads them.

**Things to know**
- **`done` class on the `<li>`:** The old `className` function runs only once, when the element is created. In Marionette, `modelEvents: change → render` doesn't update it, so I believe the old `done` class went stale after a toggle. The port updates it on every change, which is almost certainly what was intended. To keep the old behavior, compute the class once per item. Please confirm in the browser.
- **Optimistic saves:** `save` without `wait: true` updates the model immediately, and Backbone doesn't roll back if the PATCH fails. I kept that. It also means the PATCH response goes through `Todo.parse`, so it must still return `{ todo: … }`.
- **Wrapper element:** I kept the `<ul>` as the wrapper's `el` and render the `<li>`s straight into it, so the DOM and CSS match the old output.
- **Rendering:** Marionette used to re-render each row separately. React now re-renders the whole list on any change, and the hook takes a fresh snapshot of every model. That's fine for typical todo lists. Add `React.memo` on a row component if the lists get large.
- **`todos:refresh`:** I left the `App.vent` subscription in the Marionette wrapper. It's Backbone-side wiring, and `listenTo` cleans up when the view is destroyed. Move it into React when `App.vent` itself is migrated.
- **Deferred migration work:** The `useCollection` bridge and the wrapper are temporary. Delete them when `Todo`/`Todos` are replaced by a typed API client and TanStack Query. `TodosList` would then take plain data.
- **Typing:** The Backbone and Marionette typings are loose. I left `App` as the existing global and used `Model` generically, so you may need a `declare const App` or tighter model generics.
- **Dependencies:** Mounting needs React 18+ (`react-dom/client`).
- **Escaping:** `<%- title %>` was escaped, and JSX escapes `{t.title}` the same way.

For a whole-app migration, open the repo in Claude Code and run `/backbone-to-react:plan`.
