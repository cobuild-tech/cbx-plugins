# jQuery → React concept map

Read this in the Plan step, and when a unit hits a concept you haven't
mapped yet. In each unit file, list only the rows you actually used.

| jQuery concept | React equivalent | Why |
|---|---|---|
| `$('#total').html(x)`, `.text()`, `.addClass()`, `.prop('disabled', …)` | JSX rendered from state | Describe the result, don't mutate the DOM |
| `.show()` / `.hide()` / `.toggle()` | Conditional render or a class from state | Watch for inline `display` styles that beat CSS rules |
| `$('.btn').click(…)`, `.on('input', …)` | `onClick` / `onChange` on the element | Handlers live on the element |
| Delegated `$(document).on('click', '.row', …)` | A handler on each row, or one on the list | No selector-based delegation across the page |
| Shared variables updated by several handlers | `useState`/`useReducer`; everything else derived during render | One source of truth, nothing to keep in sync |
| `.val()` read when a handler runs | Controlled `value` + `onChange` | The input value is state |
| `.data('id')`, `data-*` read back later | Props and state | Don't store data on elements |
| `$.ajax`, `$.getJSON`, `.done()` / `.fail()` | `fetch` in an API module + TanStack Query | Loading and error states come for free |
| `$.Deferred`, `$.when` | Native promises, `Promise.all` | Standard async |
| `.fadeIn()`, `.slideToggle()`, `.animate()` | CSS transition on a class; Motion for exit animations | Timing lives in CSS |
| jQuery plugins / jQuery UI widgets | A React library, or the plugin wrapped via `ref` + `useEffect` | Wrap first for parity; replace later as a separate change |
| `$(document).trigger('x:changed', …)` between modules | Lift state up, Context, or a small store — **only if needed** | Implicit pub/sub becomes explicit data flow |
| `$(document).ready(…)` / `$(fn)` | The React entry file, or an effect | Startup code is explicit |
| `$(window).on('resize', …)` | `useEffect` that adds and removes the listener | Pair setup and teardown |
| String-built HTML (`'<li>' + name + '</li>'`) | JSX with `key`s | JSX escapes values |

Rule of thumb: a jQuery handler asks "what do I need to change now?" A
React component asks "what should the page look like right now?" If you
find yourself syncing variables or the DOM by hand in React, stop and
derive the value instead.
