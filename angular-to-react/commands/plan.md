---
description: Inventory this Angular / AngularJS app and write a migration plan to React in .migration/ — strategy, units, route map, test plan, and risks. Changes no app code.
argument-hint: "[optional: path or area to plan, e.g. app/ or the billing section]"
allowed-tools: Read, Grep, Glob, Agent, Write
---

Plan a Angular → React migration for: $ARGUMENTS

If no path or area was given, plan for the whole app in the current
directory.

Run Steps 0–3 of the `cobuildx-ai-angular-to-react-migration` skill: resume or
start, Assess, choose a strategy, and Plan. Then **stop at plan approval**.
Don't run Step 4.

- Write only inside `.migration/`. Never create, edit, or delete app
  files.
- If `.migration/state.json` already exists with an approved plan, don't
  overwrite it. Show the current plan and progress, and ask whether the
  user wants to re-plan.
- End by summarizing the strategy and the unit list, and ask the user to
  approve. After approval, they say "continue the migration" to run the
  first unit.
