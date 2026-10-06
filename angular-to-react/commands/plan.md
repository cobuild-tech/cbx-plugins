---
description: Inventory this Angular / AngularJS app and write a migration plan to React — strategy, coexistence layer, route map, migration order, test plan, and risks. Changes no code.
argument-hint: "[optional: path or area to plan, e.g. app/ or the billing section]"
allowed-tools: Read, Grep, Glob, Agent
---

Plan a Angular → React migration for: $ARGUMENTS

If no path or area was given, plan for the whole app in the current
directory. Follow the `cobuildx-ai-angular-to-react-migration` skill throughout. This command
**only plans** — don't create, edit, or delete any project files.

## Steps

1. **Inventory.** Delegate to the `angular-inventory` agent with the scope above. For a
   very small app (a handful of files), you may read it directly instead.
2. **Decide the strategy.** Apply section 1 of the skill: full rewrite vs.
   incremental, and the version/flavor. If you can't tell whether real users
   depend on the app in production, ask the user before choosing — don't
   assume.
3. **Check the target stack.** Read the target `package.json` if a React app
   already exists. If the `context7` MCP server is available, confirm the
   current APIs of the libraries you plan to use (React Router, TanStack
   Query, …), sending only library names and questions.
4. **Write the plan** in the format below.

## Plan format

1. **Summary** — what the app is, its size, version/flavor, the chosen
   strategy, and why.
2. **Inventory highlights** — the categories and counts from the inventory,
   plus the hidden wiring that will matter most.
3. **Target stack** — React version, router, data fetching, state, forms,
   styling, test tools, and the replacement for each framework-specific
   dependency.
4. **Coexistence layer** (incremental only) — how Angular and React will
   run side by side, how session/auth and URLs are shared, and how shared
   data crosses the boundary.
5. **Route map** — a table of every existing URL, its current handler, and
   its React route.
6. **Migration order** — numbered waves, leaves first and the most central
   pieces last, each wave small enough to verify and ship on its own.
7. **Test plan** — which tests get ported in each wave, characterization
   tests needed for untested areas, and how each wave is verified (tests,
   side-by-side browser check, `angular-parity-reviewer` review).
8. **Risks and quirks** — the risk hot spots from the inventory and how each
   is handled, plus any existing bugs to keep for parity.
9. **Rollback** — how each wave can be switched back to Angular, and when old
   code and dependencies get removed.
10. **Open questions** — anything the user needs to decide.

When the plan is done, offer to save it as `docs/migration-plan.md`. Write
the file only if the user agrees.
