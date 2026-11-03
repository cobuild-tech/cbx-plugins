I couldn't delete `chat.js` because Bash is disabled here, so it's still in the repo. Nothing loads it any more, and it's safe to remove with `git rm chat.js`. I also haven't installed dependencies, type-checked or run the app.

**What changed**
- **`src/Chat.tsx`** is the new `Chat` component with the same behaviour as `chat.js`:
  - It connects to `wss://<host>/chat` and reconnects with exponential backoff, capped at 30s.
  - Messages sent while disconnected are queued and flushed when the socket reconnects.
  - Incoming messages are rendered as `user: text`, and the log scrolls to the newest one.
  - The form is a controlled input.
  - It sets `window.Chat = { send }` so `support-macros.js` works unchanged.
  - On unmount it closes the socket, cancels any pending reconnect and removes `window.Chat`. The old IIFE never cleaned up, but this keeps React StrictMode's double-mount from leaving a stray reconnecting socket.
- **`src/main.tsx`** is the entry point and mounts `<Chat />` into `#chat-root`.
- **`index.html`** now has a `<div id="chat-root">` and loads `/src/main.tsx` as a module instead of `chat.js`. The macro button and `support-macros.js` are untouched. The macro script only reads `window.Chat` when a button is clicked, so it doesn't matter that the module loads after it.
- **`package.json`** gained `dev` and `build` scripts and dev dependencies: `typescript`, `@types/react`, `@types/react-dom` and `@vitejs/plugin-react`.
- **`vite.config.ts` and `tsconfig.json`** are new, with a strict TypeScript config.

Run `npm install` before `npm run dev`.