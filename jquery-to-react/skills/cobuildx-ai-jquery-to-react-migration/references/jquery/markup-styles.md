# Markup, templates, and styles

Read this when a unit moves markup, templates, or CSS.

- Keep every class name and id. The original CSS then works as is, and
  tests can use the same selectors on both versions.
- Fix only markup React rejects or that is invalid (for example block
  elements inside `<button>`), and add CSS so it looks identical.
- React's root element sits between the page and your markup. If the
  layout styles direct children of `<body>` or another parent, add
  `#root { display: contents }`.
- Server-rendered pages: React can take over one area of the page, with
  data passed in through a `data-*` attribute or a JSON `<script>` tag.
- String-built HTML becomes JSX. Audit anything that inserted raw HTML;
  `dangerouslySetInnerHTML` needs a reason.
