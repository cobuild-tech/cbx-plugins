# Porting Octane (Glimmer) components

Read this when a unit contains Glimmer components.

- `{{this.x}}` and `{{@x}}` become `{x}` from state or props.
- `class="a {{if @on 'on'}}"` becomes a computed `className`.
- `{{#if}}…{{else}}` becomes a ternary. `{{#each @items key="id" as |i|}}`
  becomes `.map()` with `key`. `{{else}}` inside `{{#each}}` (the empty
  state) becomes an explicit length check.
- `{{yield}}` becomes `children`. Named blocks (`<:header>`) become element
  props, or render props when they yield values.
- `...attributes` becomes spread rest props on the same element.
- `@tracked x` becomes `useState`. Tracked getters become values derived
  in render (`useMemo` if costly).
- `{{on "click" this.f}}` and `@action` become `onClick={f}`. `{{fn
  this.f x}}` becomes `() => f(x)`.
- `{{did-insert}}`, `{{will-destroy}}`, and custom modifiers become `ref`
  plus `useEffect` with cleanup, or a callback ref.
- Glimmer components have no wrapper element. Don't add one.
