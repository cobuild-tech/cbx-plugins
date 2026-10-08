# Bundling jQuery first

Read this for the scaffold unit.

- Before adding React, move to a bundler (Vite) and write
  `import $ from 'jquery'` in each file that uses it. Nothing changes for
  users, and you can now see which files still depend on jQuery.
- Plugins that expect a global `$` need `window.$ = window.jQuery = $`
  set in one module loaded before them. Remove it at the end.
- On an old jQuery version, upgrade with jQuery Migrate turned on and
  treat its warnings as a to-do list. Remove Migrate before the end.
- Move configuration (API keys, base URLs) out of the source and into
  environment variables. Anything in a frontend bundle is public.
- Keep the old page deployable until the cutover.
