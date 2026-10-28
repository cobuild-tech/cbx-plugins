## React component

```tsx
// OrderList.tsx
import { useEffect, useMemo, useState } from 'react';

export interface Order {
  id: string | number;
  total: number;
  [key: string]: unknown;
}

interface OrderListProps {
  customerId: string | number | undefined;
  onSelect: (order: Order) => void;
  /** Subscribe to "order updated" events. Must return an unsubscribe fn. Keep the reference stable. */
  subscribeOrderUpdated?: (listener: () => void) => () => void;
}

const POLL_MS = 30_000;
const DEBOUNCE_MS = 250;

// TODO: wire to wherever authInterceptor gets the token today.
declare function getAuthToken(): string;

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Mimics AngularJS `filter:string`: case-insensitive substring match against ANY property, deep.
const matches = (value: unknown, needle: string): boolean => {
  if (value == null) return false;
  if (typeof value === 'object') return Object.values(value).some((v) => matches(v, needle));
  return String(value).toLowerCase().includes(needle);
};

function useOrders(
  customerId: OrderListProps['customerId'],
  subscribe: OrderListProps['subscribeOrderUpdated'],
) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders([]);
    if (customerId == null) return;

    let disposed = false;
    let controller: AbortController | undefined;

    const load = async () => {
      controller?.abort(); // drop any in-flight request so stale data can't overwrite newer data
      controller = new AbortController();
      try {
        const res = await fetch(
          `/api/customers/${encodeURIComponent(String(customerId))}/orders`,
          { signal: controller.signal, headers: { 'X-Auth-Token': getAuthToken() } },
        );
        if (!res.ok) throw new Error(`GET orders failed: ${res.status}`);
        const data: Order[] = await res.json();
        if (!disposed) setOrders(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err);
      }
    };

    load();
    const timer = setInterval(load, POLL_MS);
    const unsubscribe = subscribe?.(load);

    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      unsubscribe?.();
    };
  }, [customerId, subscribe]);

  return orders;
}

export function OrderList({ customerId, onSelect, subscribeOrderUpdated }: OrderListProps) {
  const orders = useOrders(customerId, subscribeOrderUpdated);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setFilter(input), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? orders.filter((o) => matches(o, needle)) : orders;
  }, [orders, filter]);

  return (
    <>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <ul>
        {visible.map((o) => (
          <li key={o.id} onClick={() => onSelect(o)}>
            {currency.format(o.total)}
          </li>
        ))}
      </ul>
    </>
  );
}
```

## Bridge, so the AngularJS app can keep using `<order-list>`

```js
// Same component name and bindings, so existing templates don't change.
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { OrderList } from './OrderList';

angular.module('app').component('orderList', {
  bindings: { customerId: '<', onSelect: '&' },
  controller: ['$element', '$rootScope', '$scope', function ($element, $rootScope, $scope) {
    const ctrl = this;
    let root;
    // Stable reference. $on returns the deregistration function.
    const subscribe = (cb) => $rootScope.$on('order:updated', cb);

    const render = () => root.render(createElement(OrderList, {
      customerId: ctrl.customerId,
      onSelect: (order) => $scope.$evalAsync(() => ctrl.onSelect({ order })),
      subscribeOrderUpdated: subscribe,
    }));

    ctrl.$onInit = () => { root = createRoot($element[0]); render(); };
    ctrl.$onChanges = () => { if (root) render(); };
    ctrl.$onDestroy = () => root.unmount();
  }],
});
```

## Things to know

- **Auth interceptor:** `fetch` bypasses `$httpProvider.interceptors`, so I added `X-Auth-Token` by hand via a `getAuthToken()` placeholder you need to implement. If `authInterceptor` also handles 401s, refresh or redirect, or error toasts, that logic won't run here. Better to move it into a shared fetch or axios wrapper that both the Angular and React sides use.
- **`order:updated` event:** React can't see `$scope.$on`, so the bridge passes a `subscribeOrderUpdated` function. It uses `$rootScope.$on`, which catches `$broadcast` from the root and `$emit` from anywhere. Once more code moves to React, replace this with a shared event emitter.
- **Filter semantics:** Angular's `filter:string` matches the text against all fields of each order, not only the total, and I reproduced that. It also treats a leading `!` as negation, which I did not port. If you only want to search the total, simplify `matches`.
- **Currency format:** `Intl` gives `-$1.00` for negatives, while AngularJS's en-US `currency` gives `($1.00)`. Angular's `currency` also uses the app's configured locale, whereas this is hardcoded to en-US and USD.
- **Behavior changes:**
  - Stale in-flight requests are aborted, so a late response for the previous customer can't overwrite the list.
  - The list clears when `customerId` changes.
  - Nothing is fetched while `customerId` is undefined. The original would request `/customers/undefined/orders`.
  - Poll errors are logged, not swallowed.
  - Polling restarts on a `customerId` change. It uses `setInterval` instead of a chained `$timeout`.
- **`onSelect`:** in React it's `onSelect(order)`. The bridge converts that to `onSelect({order})` for Angular and runs it inside a digest.
- **Markup:** the original had `<li>` with no `<ul>`, so I added one. Clickable `<li>`s aren't keyboard accessible. Consider a `<button>` inside each `<li>`.
- **React version:** the bridge assumes React 18 or later (`createRoot`). `subscribeOrderUpdated` must have a stable identity or the effect will re-fetch on every render.
