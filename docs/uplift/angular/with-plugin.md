Since the rest of the app stays on AngularJS, this comes as two pieces: the React component and a thin AngularJS wrapper that mounts it. I haven't run either. I wrote them against the snippet only, and I can't see `authInterceptor` or your build setup.

## `OrderList.tsx`

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Order {
  id: string | number;
  total: number;
  [key: string]: unknown;
}

export interface OrderListProps {
  customerId: string | number;
  onSelect: (order: Order) => void;
  /** Supplied by the AngularJS wrapper so $http (and authInterceptor) still run. */
  fetchOrders: (customerId: string | number) => Promise<Order[]>;
  /** Increment to force a reload (replaces $scope.$on('order:updated')). */
  reloadSignal?: number;
}

const POLL_MS = 30_000;
const DEBOUNCE_MS = 250;

// AngularJS `currency` (en-US): "$1,234.50", negatives as "($1.00)", bad input -> ''
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencySign: 'accounting',
});
function currency(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'number' && typeof value !== 'string') return '';
  const n = Number(value);
  return Number.isNaN(n) ? '' : usd.format(n);
}

// AngularJS `filter:string`: case-insensitive substring match against every
// property (recursively), ignoring `$`-prefixed keys and functions.
function matches(value: unknown, needle: string): boolean {
  if (value == null || typeof value === 'function') return false;
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([k, v]) => !k.startsWith('$') && matches(v, needle),
    );
  }
  return String(value).toLowerCase().includes(needle);
}

export function OrderList({ customerId, onSelect, fetchOrders, reloadSignal = 0 }: OrderListProps) {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState(''); // debounced value used for filtering
  const [orders, setOrders] = useState<Order[]>([]);

  // ng-model-options="{debounce: 250}": input updates immediately, filter 250ms later
  useEffect(() => {
    const t = setTimeout(() => setFilter(input), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const latest = useRef({ customerId, fetchOrders });
  latest.current = { customerId, fetchOrders };
  const seq = useRef(0);

  const refresh = useCallback(() => {
    const id = ++seq.current;
    const { customerId, fetchOrders } = latest.current;
    fetchOrders(customerId).then(
      (data) => { if (id === seq.current) setOrders(data); },
      () => {}, // original ignored failures and kept the previous list
    );
  }, []);

  // load on mount, on customerId change, and on 'order:updated'
  useEffect(() => { refresh(); }, [customerId, reloadSignal, refresh]);

  // 30s poll, started once for the component's lifetime
  useEffect(() => {
    const t = setInterval(refresh, POLL_MS);
    return () => { clearInterval(t); seq.current++; }; // also drops in-flight responses on unmount
  }, [refresh]);

  const needle = filter.toLowerCase();
  const visible = needle ? orders.filter((o) => matches(o, needle)) : orders;

  return (
    <>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      {visible.map((o) => (
        <li key={o.id} onClick={() => onSelect(o)}>
          {currency(o.total)}
        </li>
      ))}
    </>
  );
}
```

## `orderList.wrapper.tsx` (replaces the old `.component` definition)

```tsx
import { createRoot, type Root } from 'react-dom/client';
import { OrderList, type Order } from './OrderList';

angular.module('app').component('orderList', {
  bindings: { customerId: '<', onSelect: '&' },
  controller: ['$element', '$http', '$scope', function (this: any, $element: any, $http: any, $scope: any) {
    const ctrl = this;
    let root: Root | null = null;
    let reloadSignal = 0;

    const fetchOrders = (id: string | number) =>
      $http.get('/api/customers/' + id + '/orders').then((r: any) => r.data as Order[]);

    const render = () =>
      root?.render(
        <OrderList
          customerId={ctrl.customerId}
          reloadSignal={reloadSignal}
          fetchOrders={fetchOrders}
          onSelect={(order) => $scope.$applyAsync(() => ctrl.onSelect({ order }))}
        />,
      );

    ctrl.$postLink = () => { root = createRoot($element[0]); render(); };
    ctrl.$onChanges = () => render();               // runs before $postLink the first time; root is null then
    ctrl.$onDestroy = () => { root?.unmount(); root = null; };

    $scope.$on('order:updated', () => { reloadSignal++; render(); });
  }],
});
```

## Things to know

- **Auth interceptor:** a plain `fetch` would not send `X-Auth-Token`, so the wrapper keeps using `$http` and `authInterceptor` still applies. Once you know where the token lives, you can move to a `fetch` wrapper. That is a separate change.
- **`order:updated`:** React can't listen to `$scope` events, so the wrapper listens and bumps `reloadSignal`. This only works if the event is `$broadcast` from `$rootScope`, or `$emit`ted from a scope below this component. It won't work if it is `$emit`ted from elsewhere.
- **Callbacks into AngularJS:** `onSelect` goes through `$applyAsync` so the parent's state updates.
- **Filter semantics:** AngularJS `filter:$ctrl.filter` matches the text against every field of the order, not just `total`. I reproduced that, so typing a customer name or ID will match.
- **Currency:** I assumed the en-US locale. If you load an `angular-locale_*` file, change the `Intl.NumberFormat` locale and currency to match.
- **Quirks I kept for parity:**
  - It fetches even when `customerId` is `undefined`.
  - It renders `<li>` with no `<ul>`.
  - `<li>` is click-only, with no keyboard access.
  - Fetch errors are silent.
  - The 30s poll doesn't restart when `customerId` changes.
- **One deliberate change:** stale responses are now discarded, so the latest request wins. The original could let an older response overwrite a newer one.
- **React version:** this needs React 18 or later (`react-dom/client`). The build must also handle `.tsx`. If the AngularJS build is Grunt/Gulp or script tags, you'll need a bundler step for the React side.
- **Not tested:** before swapping it in, write characterization tests against the old component, covering debounce timing, filtering, polling and unmount cleanup. Then run the same assertions on the port.

For a whole-app migration, open the repo in Claude Code and run `/angular-to-react:plan`.
