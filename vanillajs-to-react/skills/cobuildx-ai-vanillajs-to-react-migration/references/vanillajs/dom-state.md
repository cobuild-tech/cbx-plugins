# Finding the state hiding in the page

Read this when a unit reads or writes state in the DOM.

- For each value the area writes to the page, decide where it lives now:
  React state, a query result, the URL, or storage.
- A handler that reads an input, text, or class at the moment it runs is
  reading state from the page. Store the value when the action happens
  (for example the searched city), so every part of the page agrees.
- Handlers that change several things in turn (text, `src`, classes)
  become one state change; the markup describes each case.
- If repeating an action re-ran it before (searching the same value twice
  sent a new request), keep that, for example with a request id in state.
- Text written into an element that was hidden a line earlier, or state
  left over from the previous action, are quirks. Record each one and ask
  whether to keep or fix it.
- Keep the same keyboard behavior. An Enter handler that clicked a button
  becomes `onKeyDown` calling the same function.
