I couldn't install, typecheck, or build, because Bash is disabled in this session. The code is written but not compiled or run.

## What changed

**New, under `src/notifications/`:**
- `Notifications.tsx` is the dropdown component.
  - It renders `#notif-count` and `#notif-list`, keeping the same ids and `data-id`, with `read` as the class on read items.
  - It polls every 15s, plus once immediately, using the same `since` / `lastSeen` logic.
  - New items are prepended, and a click POSTs the read request and adds the `read` class.
  - The count is the list length, hidden when 0.
  - Item HTML is still injected raw through `dangerouslySetInnerHTML`.
- `api.ts` wraps `$.getJSON` and `$.post` in typed functions. I kept jQuery for these on purpose, so `global.js` still applies. That covers the CSRF header, `cache:false`, the `#spinner` show/hide, the 401 redirect to `/login`, and `X-Requested-With`. When `global.js` is migrated, switch these to `fetch`.
- `index.tsx` mounts the component into `#notifications-root`. It isn't wrapped in StrictMode, which would double-poll in dev.

**Edited:**
- `views/layout.html`: `#notif-count` and `#notif-list` are replaced by `<div id="notifications-root">`, and the script tag now points to `/js/dist/notifications.js`.
- `package.json`: added `build` (esbuild) and `typecheck` scripts, plus dev dependencies for TypeScript, esbuild, `@types/react`, `@types/react-dom` and `@types/jquery`.
- `tsconfig.json`: new, with strict mode on.

`public/js/notifications.js` is untouched and no longer referenced, so reverting is one line in the layout. Delete it once you've confirmed this works in a browser.

**Before you ship:** run `npm install && npm run typecheck && npm run build`. The build writes `public/js/dist/notifications.js`. I haven't checked `@types/jquery` ^1.10 against the typing in `api.ts`, so typecheck may need a small fix there.

## Behavior differences
- **Nested `<li>`:** if `n.html` contains its own `<li>`, the old delegated handler fired on it too (posting `/notifications/undefined/read`) and the count included it. Now only the outer item handles clicks and counts. I treated the old behavior as a bug; say if you want it kept.
- **Request timing:** each response is processed when it arrives, as before. Overlapping polls aren't cancelled, as before.
- **Failed polls:** these are silently ignored, as before. The global 401 redirect still fires.
- **Count span:** it's empty and visible until the first successful response, as before.
- **Unchanged quirk:** `n.html` is injected as raw HTML. That's an XSS risk if the server doesn't sanitize it, but I didn't change it.
- **Markup:** the two sibling elements now sit inside one wrapper `div`. Any CSS that depends on them being direct children of the body would need a look. I found no other jQuery code touching `#notif-*`.