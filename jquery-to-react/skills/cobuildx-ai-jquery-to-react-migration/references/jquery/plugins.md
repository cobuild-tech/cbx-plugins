# Wrapping jQuery plugins

Read this when a unit uses a jQuery plugin or jQuery UI widget.

- If there's no good React replacement yet, wrap the plugin. Give it an
  element through a `ref`, create it in `useEffect`, and destroy it in the
  cleanup (`$el.datepicker('destroy')`).
- The cleanup must really remove the plugin. Strict Mode mounts, unmounts,
  and mounts again in development; a plugin that can't be destroyed ends
  up there twice.
- Keep the latest callback in a ref (`onChangeRef.current = onChange`) so
  the plugin doesn't keep calling the first version.
- Push prop changes in through the plugin's own methods in a second
  effect (`datepicker('setDate', value)`), not by re-creating it.
- Call the plugin on your `ref` only. Don't call the app's shared setup
  function (`initWidgets(document)` and the like) from React; it scans
  the whole page and the cleanup can't undo it.
- Look for code that runs plugin setup again on broad selectors after
  AJAX calls or partial loads (`$(document).ajaxComplete(...)`,
  `input[id$="date"]`). It will attach a second instance to the React
  element. In the same unit, scope it to skip the React container, or
  give the element a selector it no longer matches.
- React must not render anything inside the plugin's element. That part
  of the DOM belongs to the plugin.
- Replacing a wrapped plugin with a React library is a separate unit, with
  its own parity check.
