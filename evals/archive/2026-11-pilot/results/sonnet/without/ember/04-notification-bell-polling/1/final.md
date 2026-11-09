I ported the bell to React and TypeScript, but I haven't built or run any of it.

- **React component:** `app/react/NotificationBell.tsx` is new. It keeps the behaviour of the old Ember component:
  - It fetches the unread count for the user and re-polls every 20 seconds.
  - It shows `🔔` plus the count when the count is above zero, and adds the `bell--unread` class in that case.
  - Clicking the button calls `onRead(count)` and resets the count to 0.
  - The component takes `fetchUnreadCount` and `onRead` as props instead of using Ember services directly. A failed fetch keeps the previous count and retries on the next tick.
- **Ember wrapper:** `app/components/notification-bell.js` is now a thin wrapper, so `application.hbs` still uses `{{notification-bell onRead=...}}` unchanged. It mounts the React component with `createRoot` and re-renders when attributes change. It also supplies `store.query('notification', ...)` as the fetch function and passes `once: Ember.testing`, which keeps the single-poll behaviour in tests.
- **Template:** I emptied `app/templates/components/notification-bell.hbs`. I left the file in place rather than deleting it.

- **DOM change:** `span.bell` is now rendered by React inside the wrapper's own `span`. Any CSS or tests that depend on the old single-element structure may need a small adjustment.
- **Build setup is missing:** there's no `tsconfig`, TSX/Babel setup in the Ember build, or `@types/react` yet. `react` and `react-dom` are already in `package.json`. You'll need to add TypeScript support (for example `ember-cli-typescript`, or a Babel TSX preset) before this compiles.