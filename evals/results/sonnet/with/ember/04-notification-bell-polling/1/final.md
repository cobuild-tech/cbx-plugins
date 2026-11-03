I ported the bell to React + TypeScript and mounted it from a thin Ember wrapper. Nothing was run or type-checked, and I didn't port any tests. The repo has no tests, build config or tsconfig.

**What changed**
- **`app/react/NotificationBell.tsx` (new):**
  - It renders the same `<button>🔔 <b>n</b></button>`.
  - It keeps the poll loop: query, set the count, wait 20s, repeat. There is one loop per mount, matching the task's `.drop()` and single `perform()`.
  - The delay can be aborted, and unmounting stops the loop, as destroying the component did for the task.
  - Clicking calls `onRead(unread)` and then resets the count to 0.
- **`app/react/mount-notification-bell.tsx` (new):** it creates the React root once and returns an `unmount()` handle.
- **`app/components/notification-bell.js` (rewritten):**
  - It is still a Classic component with the same `<span class="bell">` wrapper and `bell--unread` class, so CSS and selectors that depend on them keep working.
  - It mounts React in `didInsertElement` and unmounts in `willDestroyElement`.
  - It passes `store.query('notification', …)` in as a callback, so the records still land in the Ember Data store for any other code that peeks it.
  - It reads `session.currentUser.id` on each poll, as before.
  - It passes `Ember.testing` through as `singleIteration`, so tests still run one iteration.
- **`app/templates/components/notification-bell.hbs`:** emptied, because React renders the button. `application.hbs` is unchanged.

**Behavior differences and quirks**
- **Pre-existing bug, kept:** `application.hbs` uses `(action "logRead")`, and no controller or route in the repo defines it. This will fail at render, and I didn't change it.
- **Pre-existing bug, kept:** a failed query stops the poll loop. The error is now an unhandled promise rejection rather than an ember-concurrency error.
- **Timing:**
  - The 20s delay is now a plain `setTimeout` instead of `timeout()` on the run loop, so `settled()` no longer waits on it. Normal tests never reached it, because the loop exits after one iteration under `Ember.testing`.
  - The query result is now set from a React callback, not inside the run loop. Ember Data still tracks the query itself.
- **Count updates:** the `bell--unread` class now follows the count through an `onUnreadChange` callback. React state is the source of truth, so the class updates one effect tick after the count changes.
- **DOM:** the button is now rendered by React inside the wrapper span, so the same selectors match, but the button is a React-managed node.
- **Setup still needed:** the repo has no TypeScript or JSX build config, no tsconfig and no bundler setup for `app/react/`, and `react-dom/client` imports need that wiring. I didn't add it, as it is outside this unit.