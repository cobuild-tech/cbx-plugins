# From handlers to state

Read this when a unit has handlers that update shared variables or the
DOM by hand. This is usually most of the work.

- Store only what the user typed or chose. Change it in one place (a
  reducer is a good fit when several inputs interact), and derive
  everything else (totals, error messages, enabled buttons) during render.
- Look for handlers that do half a job: highlight a button but never
  update the value behind it, or reset the screen but not the variables.
  Record each one as a quirk, and ask the user whether to keep or fix it.
- Watch for `NaN`, `Infinity`, and rounding that depends on the order
  inputs were filled in. A derived calculation should return nothing until
  its inputs are valid, and round once at the end.
- `.show()` adds an inline `display` style that can beat CSS rules. If
  swapping it for a class changes what's visible, match the original.
- A `.click()` on a wrapper instead of the button changes where clicks
  count. Port where the handler really was, or record the change.
- Don't port `$(...)` calls into components. Only wrapped plugins use
  jQuery, and only inside their effects.
