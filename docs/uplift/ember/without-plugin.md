```tsx
// src/api/products.ts
export interface Product {
  id: string;
  title: string;
  priceCents: number;
}

interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

const API_NAMESPACE = '/api/v2';

export async function searchProducts(q: string, signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch(`${API_NAMESPACE}/products?${new URLSearchParams({ q })}`, {
    headers: { Accept: 'application/vnd.api+json' },
    signal,
  });
  if (!res.ok) throw new Error(`Product search failed: ${res.status}`);

  const body: { data: JsonApiResource[] } = await res.json();
  return body.data.map(({ id, attributes }) => ({
    id,
    title: String(attributes.title),
    // Ember Data's JSONAPISerializer maps dasherized keys to camelCase for you; fetch doesn't.
    priceCents: Number(attributes['price-cents'] ?? attributes.priceCents),
  }));
}
```

```tsx
// src/components/ProductSearch.tsx
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { searchProducts, type Product } from '../api/products';

const DEBOUNCE_MS = 300;

export default function ProductSearch() {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState<string | null>(null); // null = nothing searched yet
  const [results, setResults] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();

  // didInsertElement
  useEffect(() => {
    inputRef.current?.focus();
    return () => window.clearTimeout(timer.current);
  }, []);

  // Debounced "observer": only fires on user changes, not on mount (same as the Ember observer)
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSearchTerm(value), DEBOUNCE_MS);
  }

  useEffect(() => {
    if (searchTerm === null) return;
    const controller = new AbortController();
    searchProducts(searchTerm, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    return () => controller.abort(); // drops stale responses
  }, [searchTerm]);

  return (
    <div className="product-search">
      <input ref={inputRef} value={query} onChange={handleChange} placeholder="Search" />
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

**Things to know**

- **No Ember Data in React.** The adapter and `store.query` are replaced by a plain `fetch` to `/api/v2/products?q=…`. The `application.js` adapter has no React equivalent. Its `namespace` is now `API_NAMESPACE`.
- **Other Ember code still needs the adapter.** Keep it as is for the remaining Ember routes and components.
- **Serializer behavior is gone.** Ember Data's JSON:API serializer turned `price-cents` into `priceCents` and unwrapped `data`/`attributes`. I do that by hand in `searchProducts`, but check the real payload keys. Relationships and `included` aren't handled, since this component doesn't use them.
- **Adapter config is not carried over.** If your Ember adapter (or a parent class) adds auth headers, CSRF tokens, a `host`, or error handling, I couldn't see it in the snippet. Add those to the `fetch` call.
- **Race condition fixed.** The Ember version could show out-of-order results if responses arrived late. `AbortController` now cancels the previous request.
- **Behavior kept.** There is no search on mount. Clearing the input still searches with `q=''`. Prices are still shown as raw cents, so add formatting if you want it. `resultsCount` is now just `results.length`, with no `computed`.
- **Wrapper element.** The Classic component rendered a wrapper `<div class="product-search">`. It's now an explicit `div`, so existing CSS should still match.
- **Errors.** Errors are only logged to the console. There is no loading or error UI, as in the original.
- **Embedding in Ember.** Until the rest is migrated, mount this inside Ember with `createRoot` from `react-dom/client`. Do it in a small wrapper component or modifier, and unmount it on teardown. `{{product-search}}` call sites need to point to that wrapper.
- **Build setup.** You'll need React, a TS config with `jsx: react-jsx`, and a bundler step in the Ember build (e.g. Embroider/Vite).
