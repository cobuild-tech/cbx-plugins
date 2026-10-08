# Identifying the jQuery setup

Read this in the Assess step. Record in `state.json` and `assessment.md`:

- **jQuery version**, and whether jQuery Migrate is loaded. Calls that
  only old browsers needed (`'propertychange'`, `$.browser`) are dead
  code; list them.
- **How jQuery is loaded:** a CDN `<script>` tag with the global `$`, or a
  bundler import. Record `"flavor": "script-tag"` or `"flavor": "bundled"`.
- **Page model:** server-rendered pages (Rails, Django, PHP, JSP)
  enhanced with jQuery, or a single page that builds its own markup.
  Server-rendered pages usually migrate one page or area at a time.
- **Plugins:** each plugin and jQuery UI widget, where it is created and
  destroyed, and whether a good React replacement exists. Count plugins
  separately; they take the most effort.
- **Shared variables:** variables at the top of a file that several
  handlers change. These are where the bugs live.
- **Hidden wiring:** `$(document).ready`, delegated `.on(` handlers,
  custom `.trigger(` events, `$.ajaxSetup` and global Ajax handlers,
  `$.fn.` extensions, `.data(`, and `window.*` globals.
- **Not really jQuery:** if Backbone or Marionette is present, the
  `backbone-to-react` plugin fits better. Tell the user.
