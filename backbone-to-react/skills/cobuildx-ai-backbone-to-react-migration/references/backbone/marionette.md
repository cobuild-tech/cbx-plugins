# Porting Marionette

Read this when the app uses Marionette.

- Regions and LayoutViews become child components in JSX, or a layout
  route with `<Outlet/>`.
- CollectionView and CompositeView become `.map()` with a stable `key`.
  `emptyView` becomes an explicit empty state.
- Behaviors and `_.extend` mixins become custom hooks.
- `Marionette.Application` start-up code becomes explicit setup in
  `main.tsx`.
- `Backbone.Radio` channels: see `event-bus.md`.
