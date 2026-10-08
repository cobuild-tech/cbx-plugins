# Getting onto a bundler first

Read this for the scaffold unit.

- Before adding React, move classic `<script>` tags and shared globals to
  ES modules and a bundler (Vite). Vite serves a plain HTML page, so the
  old app keeps running unchanged.
- Turn each global the other scripts rely on into an explicit export.
  Where that isn't possible yet, set it on `window` in one module and list
  it for the cleanup.
- Move configuration (API keys, base URLs) into environment variables, and
  show a plain message when a required value is missing. Anything in a
  frontend bundle is public; a real secret needs a server-side proxy.
- Keep the old page deployable until the cutover.
