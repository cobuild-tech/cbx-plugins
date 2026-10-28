This is a snippet conversion, so I haven't touched a repo or run anything. The React code below is untested.

## `src/api/products.ts`

This replaces the adapter and the `store.query('product')` call.

```ts
export interface Product {
  id: string;
  title: string;
  priceCents: number;
}

interface ProductResource {
  id: string;
  type: 'products';
  attributes: { title: string; 'price-cents': number };
}

function normalizeProduct(r: ProductResource): Product {
  return {
    id: r.id,
    title: r.attributes.title,
    priceCents: r.attributes['price-cents'], // JSONAPISerializer dasherizes keys
  };
}

// Same URL the adapter produced: GET /api/v2/products?q=...
export async function queryProducts(params: { q: string }): Promise<Product[]> {
  const res = await fetch(`/api/v2/products?${new URLSearchParams(params)}`, {
    headers: { Accept: 'application/vnd.api+json' },
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`GET /api/v2/products failed: ${res.status}`);
  const body = (await res.json()) as { data: ProductResource[] };
  return body.data.map(normalizeProduct);
}
```

## `src/components/ProductSearch.tsx`

```tsx
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { queryProducts, type Product } from '../api/products';

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // didInsertElement focus + pending-debounce cleanup on teardown
  useEffect(() => {
    inputRef.current?.focus();
    return () => clearTimeout(timer.current);
  }, []);

  // Replaces the `query` observer: runs only when the user changes the value
  // (no search on mount), trailing debounce of 300ms.
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setQuery(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      queryProducts({ q: next }).then(setResults); // no cancellation, no catch (as before)
    }, 300);
  }

  return (
    <div className="product-search">
      <input value={query} onChange={handleChange} placeholder="Search" ref={inputRef} />
      <span className="count">{results.length}</span>
      {results.map((p) => (
        <div className="row" key={p.id}>
          {p.title} - {p.priceCents}
        </div>
      ))}
    </div>
  );
}
```

## Mounting it in the Ember app

```js
// app/components/product-search.js (replaces the Classic component and its .hbs)
import Component from '@ember/component';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductSearch } from 'my-react-app/components/ProductSearch';

export default Component.extend({
  tagName: 'div',
  didInsertElement() {
    this._root = createRoot(this.element); // create once
    this._root.render(createElement(ProductSearch));
  },
  willDestroyElement() {
    this._root.unmount();
    this._root = null;
  },
});
```

## Things to know

- **I couldn't see the `product` model or serializer.** I assumed the default JSON:API serializer, where `priceCents` arrives as `price-cents`. If the model has a custom serializer, `attrs`, or other fields, fix `normalizeProduct`. Check the model for transforms too.
- **Other adapter behavior isn't visible.** Your adapter only sets `namespace`. If auth headers or a `host` are configured elsewhere (for example an `ember-simple-auth` mixin or an initializer), `queryProducts` must send them too.
- **Kept for parity:**
  - No search runs on mount.
  - Clearing the input still searches with `q=''`.
  - Old results stay on screen while a new search is in flight.
  - Responses aren't cancelled, so the last response to arrive wins even if it is stale.
  - Rejected requests go unhandled.
- **Intentional difference:** the pending debounce is cleared on unmount. In Ember it would fire and call `set` on a destroyed component.
- **Extra wrapper `div`.** The Classic component's own `div.product-search` is now rendered by React, and the Ember wrapper adds one more `div` around it. Check CSS selectors such as `> .product-search`. You can instead put `classNames: ['product-search']` on the Ember wrapper and render a fragment in React.
- **Dropped the Ember Data identity map and cache.** Nothing else on the page can see these products through `store.peekAll('product')` anymore. If other Ember code relies on those records, tell me and I'll plan a bridge.
- **Tests:** none were provided. Before relying on this I'd add tests (Vitest, RTL, MSW) for the 300ms debounce, the request URL, and the focus on mount.

For a whole-app migration, open the repo in Claude Code and run `/ember-to-react:plan`.
