# Identifying the vanilla JS setup

Read this in the Assess step. Record in `state.json` and `assessment.md`:

- **Module system:** classic `<script>` tags sharing globals, IIFE
  modules, or ES modules. Record `"flavor": "script-tag"`, `"iife"`, or
  `"esm"`.
- **Page model:** server-rendered pages enhanced with scripts, or a page
  that builds its own markup.
- **Where state lives:** list every place. Text content, CSS classes,
  inline styles, form values read when a handler runs, attributes
  (`data-*`, `<html data-theme>`), browser storage, built markup, and
  module or global variables.
- **Reads back from the DOM:** most DOM hits write state. The ones that
  read it back, treating the DOM as a variable, are where the bugs live.
  List each one.
- **Hidden wiring:** globals and `window.*` helpers, page-wide listeners,
  custom events, scripts that must run before first paint, and inline
  config such as API keys.
- **Micro-libraries:** small helpers (lodash, date libraries, chart
  libraries) and whether React needs a wrapper for them. If jQuery does
  most of the DOM work, the `jquery-to-react` plugin fits better.
