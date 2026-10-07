# Porting Angular styles

Read this when a unit has component styles.

- Port SCSS, CSS custom properties, and class names as they are, in the
  same pass as the logic.
- Emulated view encapsulation becomes CSS Modules, or a shared sheet with
  the same rules.
- `:host` becomes a class on the component's root element.
- `::ng-deep` overrides become global or parent-scoped rules with the
  same effect.
- Redesign is a separate, later change. Never change framework and design
  together.
