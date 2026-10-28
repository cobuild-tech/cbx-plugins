The code below assumes the table, `#total`, `#checkout` and `#ship-date` all move into one React-owned container. I haven't seen your Rails view, so check that assumption against the markup. No `.migration/` was created.

```tsx
// cart/main.tsx
import { createRoot } from 'react-dom/client';
import { Cart, type CartItem } from './Cart';

const container = document.getElementById('cart-root');
if (container) {
  // Rails emits: <script type="application/json" id="cart-data">[{"id":1,"name":"…","price":9.5,"qty":2}]</script>
  const items: CartItem[] = JSON.parse(document.getElementById('cart-data')!.textContent ?? '[]');
  createRoot(container).render(<Cart items={items} />);
}
```

```tsx
// cart/api.ts
const csrfToken = () =>
  document.querySelector<HTMLMetaElement>('meta[name=csrf-token]')?.content ?? '';

// Same endpoint, form-encoded body and headers that $.post + $.ajaxSetup sent.
export async function removeFromCart(id: number): Promise<void> {
  const res = await fetch('/cart/remove', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken(),
      'X-Requested-With': 'XMLHttpRequest', // jQuery adds this; Rails' request.xhr? relies on it
    },
    body: new URLSearchParams({ id: String(id) }),
  });
  if (!res.ok) throw new Error(`Remove failed: ${res.status}`);
}
```

```tsx
// cart/Cart.tsx
import { useEffect, useRef, useState } from 'react';
import { removeFromCart } from './api';
import { ShipDate } from './ShipDate';

export interface CartItem { id: number; name: string; price: number; qty: number }
interface Row { item: CartItem; qty: string; removing: boolean }

const FADE_MS = 200;

export function Cart({ items }: { items: CartItem[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((item) => ({ item, qty: String(item.qty), removing: false })),
  );
  const timers = useRef(new Set<number>());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Derived, never stored. Number('') === 0, matching +$(...).val().
  const total = rows.reduce((t, r) => t + r.item.price * Number(r.qty), 0);

  const setQty = (id: number, qty: string) =>
    setRows((rs) => rs.map((r) => (r.item.id === id ? { ...r, qty } : r)));

  const remove = (id: number) => {
    removeFromCart(id).then(
      () => {
        setRows((rs) => rs.map((r) => (r.item.id === id ? { ...r, removing: true } : r)));
        const t = window.setTimeout(() => {
          timers.current.delete(t);
          setRows((rs) => rs.filter((r) => r.item.id !== id));
        }, FADE_MS);
        timers.current.add(t);
      },
      () => {}, // original had no .fail(): errors are silent
    );
  };

  return (
    <>
      <table className="cart">
        <tbody>
          {rows.map(({ item, qty, removing }) => (
            <tr key={item.id} className={removing ? 'removing' : undefined}>
              <td>{item.name}</td>
              <td>
                <input className="qty" value={qty} onChange={(e) => setQty(item.id, e.target.value)} />
              </td>
              <td>
                <a href="#" className="remove" onClick={(e) => { e.preventDefault(); remove(item.id); }}>
                  Remove
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span id="total">{total.toFixed(2)}</span>
      <button id="checkout" disabled={total === 0}>Checkout</button>
      <ShipDate />
    </>
  );
}
```

```css
/* replaces .fadeOut(200) */
.cart tr.removing { opacity: 0; transition: opacity 200ms; }
```

```tsx
// cart/ShipDate.tsx — wraps the jQuery UI datepicker (no React replacement yet)
import { useEffect, useRef } from 'react';

export function ShipDate() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const $ = window.jQuery; // CDN global; needs @types/jquery and @types/jqueryui
    const $el = $(ref.current!);
    $el.datepicker({ minDate: 1, beforeShowDay: $.datepicker.noWeekends });
    return () => { $el.datepicker('destroy'); }; // Strict Mode mounts twice in dev
  }, []);
  // Uncontrolled on purpose: the plugin owns the input's value.
  return <input ref={ref} id="ship-date" name="ship_date" type="text" />;
}
```

**Things to know**

- **Delete the old jQuery in the same change.** Remove the `.cart .remove` and `.cart .qty` handlers, `updateTotal`, and the `#ship-date` init. The delegated `$(document).on('click', '.cart .remove')` would also fire on React's rows, and jQuery must not touch anything inside `#cart-root`.
- **Keep `$.ajaxSetup`.** The rest of the page still needs it. React reads the CSRF meta tag itself.
- **Rails view changes.** Replace the server-rendered table, total, button and date input with `<div id="cart-root">` plus the JSON `<script>` tag. I invented the field names (`name`, `price`, `qty`) and `name="ship_date"`, so match them to your Rails view. If the inputs sit inside a `<form>`, render the form in React or keep the field names identical. If those elements live in different parts of the page, use several mount points.
- **Quirks kept:**
  - A failed remove does nothing.
  - Rows count toward the total until the 200ms fade ends.
  - Non-numeric quantities give `"NaN"` and an enabled checkout button, because `NaN === 0` is false.
  - There is no guard against double-clicking Remove.
- **Behavior differences:**
  - The total now updates on every keystroke. jQuery's `change` event fired only on blur. Say so if you want blur-only.
  - The total is computed on first render, where jQuery left the server's value until the first edit. They should match.
- **Turbolinks/Turbo:** if the Rails app uses it, mount on `turbo:load` and unmount on `turbo:before-cache`. Otherwise the root is created on a stale element.
- **Untested.** I haven't run this. Before removing the jQuery version, write characterization tests against the current page (remove, quantity, total, disabled checkout, weekends and past dates blocked). The original class names and ids are kept, so the same selectors work on both.
- **Next steps:** `$.datepicker` can later be replaced by a React date picker as its own change. For a whole-app migration, open the repo in Claude Code and run `/jquery-to-react:plan`.
