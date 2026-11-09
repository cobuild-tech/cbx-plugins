The `update-config` skill I just invoked was a mistake. It's unrelated to this task, and I changed no settings. Back to the migration.

I couldn't delete `chat.js` because I have no shell tool here. It is no longer referenced by `index.html`, so you can run `git rm chat.js`.

## Summary

I rewrote the chat widget as a React + TypeScript component in `src/`. I haven't installed dependencies, built, or run it, so it's untested.

**New files**
- `src/useChatSocket.ts` holds the WebSocket logic from `chat.js`.
  - It keeps the same `wss://<host>/chat` URL, the offline queue that flushes on open, and the exponential reconnect backoff capped at 30s.
  - Messages are now React state.
  - It now closes the socket and cancels the reconnect timer on unmount, which the original never did.
- `src/Chat.tsx` renders the log and the form.
  - The input is a controlled component.
  - The log scrolls to the bottom when new messages arrive.
  - It sets `window.Chat = { send }` so the unchanged `support-macros.js` buttons still work.
- `src/main.tsx` mounts `<Chat />` into `#chat-root`.
- `tsconfig.json` and `vite.config.ts` are new. The Vite config uses esbuild's automatic JSX, so no React plugin is needed.

**Changed files**
- `index.html` now has `<div id="chat-root">` and loads `/src/main.tsx` as a module. The macro button and `support-macros.js` are unchanged.
- `package.json` gains `dev` and `build` scripts, plus `typescript`, `@types/react` and `@types/react-dom` as dev dependencies. Run `npm install` before using them.

**Behaviour notes**
- Empty messages are still sent, as before.
- I kept `window.Chat` as a bridge. If you migrate the macro buttons to React as well, you can drop it.
- Messages are keyed by array index, which is fine for an append-only log.