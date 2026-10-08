# What stays outside React

Read this when a unit touches the theme, global CSS, third-party scripts,
or code that must run before the first paint.

- **Pre-paint state** (theme, locale): keep a tiny inline `<head>` script
  that applies it before React loads, or users see a flash. React reads
  and updates the same attribute through a small hook.
- **Stylesheets:** bring them across unchanged. React's root sits between
  `<body>` and the page; if the layout styles `<body>`'s direct children,
  add `#root { display: contents }`.
- **Third-party scripts** (analytics, chat widgets) can stay as they are,
  as long as they don't rewrite markup React owns.
- **Canvas, maps, charts:** wrap them like any imperative widget, with a
  `ref`, setup in an effect, and teardown in its cleanup.
