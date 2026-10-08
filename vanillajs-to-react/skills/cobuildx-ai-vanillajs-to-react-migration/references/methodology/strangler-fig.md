<!-- GENERATED from shared/methodology/strangler-fig.md by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->

# Strangler Fig

Old and new run side by side. Each unit moves one route (or route group)
from the old app to React. Repeat until the old app serves nothing.

## Set up once (this is the first unit in plan.md)

1. Scaffold the React app and get it building, testing, and deploying
   with one empty page before any feature code.
2. Put a routing layer in front of both apps: a reverse proxy (nginx,
   CDN rules), a micro-frontend shell, or the dev server proxy locally.
   The **URL is the single source of truth**: one path is served by
   exactly one app at a time.
3. Share session and auth across both apps (a cookie, or a token store
   both sides read). A user must never log in twice.
4. Share styles. Both apps load the same CSS so moved pages look the same.
5. Add a per-route toggle (a flag or proxy rule) so a moved route can be
   sent back to the old app in one change.

Coexistence details for this framework are in `references/react/coexistence.md`
and the framework folder.

## Each unit

- Move leaves first: read-only pages and pages with few shared
  dependencies. Leave the app shell, navigation, and session for last.
- Cross-app links are full page loads. That's expected; don't build a
  client-side bridge for them.
- Data shared by both apps goes through the API or a framework-agnostic
  store, never through one framework's internals.
- A unit is done only when it passes `validation.md`, including the
  rollback toggle being tested.

## Done when

The proxy sends every path to React. Then read `cutover.md` to remove the
old app.
