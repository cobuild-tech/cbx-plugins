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
- React must not render anything inside the plugin's element. That part
  of the DOM belongs to the plugin.
- Replacing a wrapped plugin with a React library is a separate unit, with
  its own parity check.
