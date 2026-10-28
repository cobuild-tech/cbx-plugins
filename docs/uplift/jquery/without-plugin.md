```tsx
// cart.tsx
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface CartItem { id: number; name: string; price: number; qty: number }
type Row = { id: number; name: string; price: number; qty: string; removing: boolean };

const csrfToken = () =>
  document.querySelector<HTMLMetaElement>('meta[name=csrf-token]')?.content ?? '';

async function removeFromCart(id: number): Promise<void> {
  const res = await fetch('/cart/remove', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-CSRF-Token': csrfToken(),
      'X-Requested-With': 'XMLHttpRequest', // jQuery sends this; Rails' request.xhr? relies on it
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: new URLSearchParams({ id: String(id) }),
  });
  if (!res.ok) throw new Error(`Remove failed: ${res.status}`);
}

export function Cart({ initial }: { initial: CartItem[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((i) => ({ ...i, qty: String(i.qty), removing: false })),
  );
  const inFlight = useRef(new Set<number>());

  // Derived, so it can't drift out of sync like the old updateTotal() calls.
  const total = rows.reduce((sum, r) => sum + r.price * (Number(r.qty) || 0), 0);

  const setQty = (id: number, qty: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, qty } : r)));

  const remove = async (id: number) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    try {
      await removeFromCart(id);
    } catch (err) {
      inFlight.current.delete(id);
      console.error(err);
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, removing: true } : r)));
    window.setTimeout(() => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      inFlight.current.delete(id);
    }, 200);
  };

  return (
    <>
      <table className="cart">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              style={{ opacity: r.removing ? 0 : 1, transition: 'opacity 200ms' }}
            >
              <td>{r.name}</td>
              <td>
                <input
                  className="qty"
                  type="number"
                  min={0}
                  value={r.qty}
                  onChange={(e) => setQty(r.id, e.target.value)}
                />
              </td>
              <td>
                <button type="button" className="remove" onClick={() => remove(r.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span id="total">{total.toFixed(2)}</span>
      <button id="checkout" disabled={total === 0}>Checkout</button>
    </>
  );
}

// ---------------------------------------------------------------------------
// jQuery UI datepicker wrapper (needs @types/jquery + @types/jqueryui)
export function ShipDate({ name }: { name: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const initialised = useRef(false);

  // Callback ref so init/destroy follow the element's lifecycle (StrictMode-safe).
  const setRef = (el: HTMLInputElement | null) => {
    if (el && !initialised.current) {
      $(el).datepicker({ minDate: 1, beforeShowDay: $.datepicker.noWeekends });
      initialised.current = true;
    } else if (!el && ref.current) {
      $(ref.current).datepicker('destroy');
      initialised.current = false;
    }
    (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };

  // Uncontrolled on purpose: the datepicker writes the value itself and
  // the Rails form reads it on submit.
  return <input id="ship-date" name={name} type="text" ref={setRef} />;
}

// ---------------------------------------------------------------------------
// Entry point
const cartEl = document.getElementById('cart-root');
const dataEl = document.getElementById('cart-data');
if (cartEl && dataEl) {
  createRoot(cartEl).render(<Cart initial={JSON.parse(dataEl.textContent ?? '[]')} />);
}
const shipEl = document.getElementById('ship-date-root');
if (shipEl) createRoot(shipEl).render(<ShipDate name="order[ship_date]" />);
```

Rails side: render `<div id="cart-root"></div>` plus `<script type="application/json" id="cart-data"><%= raw @cart_items.to_json(only: %i[id name price qty]) %></script>`. Use `json_escape` or `ERB::Util.json_escape` on that JSON so it can't break out of the script tag. Replace the server-rendered cart table with these elements.

**Things to know**

- **Keep `$.ajaxSetup` for now.** The rest of the app still depends on that global CSRF header. The React code reads the meta tag itself and sends the token, so nothing is lost when you delete the jQuery version later.
- **The React cart needs the data as JSON.** React owns the table, total and checkout button, so `data-id`, `data-price` and the `.qty` value must come from JSON, as in the mount code above. Anything outside `#cart-root` that touched `.cart`, `#total` or `#checkout` through jQuery will conflict with React and should be migrated or removed. I kept the class and id names so existing CSS still applies.
- **Behavior changes:**
  - The total is now derived from state. It is correct on first render, whereas the old code only recalculated after a change or removal.
  - The fade is a CSS transition. The row stays in the total until the fade ends, as before.
  - Double-clicking Remove is guarded.
  - A failed POST leaves the row in place and logs to the console. The old code also did nothing, so add user-facing error UI if you want it.
  - An empty or invalid quantity counts as 0. The old code produced `NaN`.
  - Remove is a `<button>` instead of a link, which is better for accessibility. Restyle it if the link look mattered.
- **Datepicker:**
  - jQuery UI's datepicker still does the work, because there is no native equivalent of `noWeekends`. The wrapper is uncontrolled and cleans up on unmount. Drop it and use your React date library when you do the real migration.
  - It needs `@types/jquery` and `@types/jqueryui`. Both jQuery and jQuery UI must load before this bundle.
  - Validate weekday and minimum date on the server. The client check is only UI.
- **Money:** `price * qty` in floats can give odd cents in edge cases. If it ever matters, compute in integer cents. Only the server total should be trusted for charging.
- **Request format:** I send form-encoded `id=…` with `X-Requested-With`, matching `$.post`, so your Rails controller needs no change.
- **Setup:** I haven't run this. You'll need React 18+ (`react-dom/client`) and a bundler that can serve a TS entry alongside the CDN jQuery.
