<!-- GENERATED from shared/react/architecture.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# React target architecture

Read this in the first unit (scaffold), or when you're unsure where a
ported piece should live.

## Scaffold

- Vite + React + TypeScript, unless the team already uses a framework
  (Next.js, Remix). Match the existing repo's package manager and lint
  setup.
- Get it building, testing, and deploying with one empty page before any
  feature code.
- Move config to `import.meta.env.VITE_*` or config modules. **Never copy
  secret values.** Flag them for rotation in `decisions.md`.
- Turn global setup (initializers, run/config blocks, app globals) into
  explicit code at the entry point (`main.tsx`) or in app-root providers.

## Where things go

```
src/
├── main.tsx            entry: providers, router, global setup
├── routes/             one module per route (component + loader)
├── components/         presentational and stateful components
├── hooks/              custom hooks (ported mixins, behaviors, services)
├── api/                one fetch client + per-resource functions + normalizers
├── state/              Context providers / small stores for app-wide singletons
└── lib/                plain functions (ported helpers, pipes, filters, formatters)
```

## Rules

- Don't rebuild the old framework's mechanisms: its DI container, resolver,
  observer system, run loop, digest, event bus, or ORM. They solved
  problems React doesn't have, or ones a small library already solves.
- Store only what can't be derived. Compute derived values during render,
  and use `useMemo` only when the computation is measurably expensive.
- `useEffect` is for synchronizing with things outside React (DOM, timers,
  subscriptions). It is not for reacting to your own state changes. Put
  that logic in the event handler that caused the change.
- Keep the same file and component boundaries as the original where you
  reasonably can. That keeps parity review and rollback easy.
