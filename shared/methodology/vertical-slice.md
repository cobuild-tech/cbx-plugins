# Vertical slice (component-level coexistence)

Use this when the URL can't be split. React mounts **inside** the old
app's components, and each unit replaces one feature slice from the top of
its subtree down to its data.

## Set up once

1. Scaffold the React app as a library or entry that the old app's build
   can import, or load as a separate bundle.
2. Write **one** wrapper per framework that mounts a React root inside a
   host element. The wrapper creates the root once, re-renders when inputs
   change, and unmounts when the host is torn down. The exact hooks for
   this framework are in the framework folder and `references/react/coexistence.md`.
3. Bridge shared state through a framework-agnostic store (see
   `branch-by-abstraction.md`). Never reach into one framework's internals
   from the other.

## Each unit

- Pick a slice, meaning a widget or panel with its own data, and replace
  the old component with the wrapper rendering the React port.
- Work from the leaves up. Containers come after their children, and the
  app shell comes last.
- Callbacks from React that change old-framework state must trigger that
  framework's update mechanism, such as the Angular zone, the AngularJS
  digest, or Backbone events.
- Keep the old component file until the slice passes `validation.md`.
  That file is the rollback.

## Done when

The old app's root renders only wrappers. Then flip it so React owns the
root, and read `cutover.md`.
