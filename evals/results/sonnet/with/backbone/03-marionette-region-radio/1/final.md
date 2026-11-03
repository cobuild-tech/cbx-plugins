I converted InboxView to React and TypeScript, but I haven't run or built any of it. The repo has no bundler, tsconfig, HTML or tests, so nothing is type-checked or verified in a browser.

**What changed**
- **`src/react/InboxView.tsx` (new):** a React component that replaces the old view's logic and template. It renders the same markup: `<h2>Inbox (<span class="n">…</span>)</h2><ul class="msgs">`.
  - A `message:new` event on the Radio `mail` channel increments `model.unread` on the shared mailbox model and prepends the subject to the list.
  - A 30-second interval triggers `mail:poll` on the channel.
  - Unmounting removes the listener and clears the interval.
- **`src/react/inbox-view-host.tsx` (new):** a thin Marionette view that still defines `app.InboxView`. Your region `.show(...)` calls and router in `src/app.js` need no changes.
  - It has `template: false` and creates the React root once in `onRender`.
  - It unmounts the root in `onDestroy`, so cleanup runs on route swaps.
  - It keeps the original `className` function.
- **`src/views/inbox-view.js`:** left in place, unmodified. It defines the same `app.InboxView` global, so load only one of the two. Swapping the script or import to the new host file is the cutover, and reverting that swap is the rollback. Delete the old file once you've checked the new one in the app.

**Behavior differences and quirks**
- **`has-unread` class:** I kept the quirk that `className` runs once, so the class is never updated as messages arrive.
- **Shared model:** the component still calls `model.set('unread', …)`, so other `change:unread` listeners keep working. It does not subscribe to the model. The old view also ignored outside changes to `unread`, so the count only updates on `message:new`.
- **Subscription timing:** the old view subscribed and started its timer in `initialize`. React subscribes in an effect after the first render. A `message:new` fired in that gap is missed, and the first poll interval starts slightly later.
- **`msg.subject`:** it is now escaped by React instead of `_.escape`. A `null` or `undefined` subject renders as an empty string, as before. Non-string subjects could render differently.
- **Rendering:** it is asynchronous, so the DOM is filled a tick after `show()` returns. Code that queries the view's `.n` or `.msgs` right after `show()` would see them empty.
- **Repo search:** nothing else in the repo listens to `mail:poll`, `message:new` or `unread`. `app.mailbox`, `app.layout` and `app.router` are defined outside this repo, so I couldn't check them.

**Still needed:** a build setup for TSX and `@types/react` (React 18 is already in `package.json`). Once that exists, load the host file after Marionette, Backbone and `app` are defined.