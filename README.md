# cbx-plugins

Claude plugins by CobuildX.

| Plugin | Description |
|---|---|
| [ember-to-react](ember-to-react) | Migrate Ember.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |
| [angular-to-react](angular-to-react) | Migrate Angular (2+) and AngularJS (1.x) apps to React — full rewrites or incremental strangler-fig migrations of any size, including hybrid ngUpgrade apps. |
| [backbone-to-react](backbone-to-react) | Migrate Backbone.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |
| [jquery-to-react](jquery-to-react) | Migrate jQuery apps and pages to React — full rewrites or incremental strangler-fig migrations of any size, including jQuery plugins and jQuery UI. |
| [vanillajs-to-react](vanillajs-to-react) | Migrate vanilla JavaScript apps and pages to React — full rewrites or incremental strangler-fig migrations of any size, from script-tag pages to ES-module apps. |

## Install in Claude Code

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install ember-to-react@cbx-plugins
/plugin install angular-to-react@cbx-plugins
/plugin install backbone-to-react@cbx-plugins
/plugin install jquery-to-react@cbx-plugins
/plugin install vanillajs-to-react@cbx-plugins
```

## Install in VS Code (GitHub Copilot)

Add to your VS Code user settings, reload the window, then search `@agentPlugins` in the Extensions view:

```json
"chat.plugins.enabled": true,
"chat.plugins.marketplaces": ["cobuild-tech/cbx-plugins"]
```

## Install in GitHub Copilot CLI

```
copilot plugin marketplace add cobuild-tech/cbx-plugins
copilot plugin install ember-to-react@cbx-plugins
copilot plugin install angular-to-react@cbx-plugins
copilot plugin install backbone-to-react@cbx-plugins
copilot plugin install jquery-to-react@cbx-plugins
copilot plugin install vanillajs-to-react@cbx-plugins
```

## Install in Codex

```
codex plugin marketplace add cobuild-tech/cbx-plugins
codex plugin add ember-to-react@cbx-plugins
codex plugin add angular-to-react@cbx-plugins
codex plugin add backbone-to-react@cbx-plugins
codex plugin add jquery-to-react@cbx-plugins
codex plugin add vanillajs-to-react@cbx-plugins
```

Codex loads the migration skill. It does not run the bundled agents or the `/plan` command; the skill tells Codex to follow the agent instructions itself. For current React docs, add Context7 once:

```
codex mcp add context7 --url https://mcp.context7.com/mcp
```

## Install in Cursor

Copy each plugin into Cursor's local plugins folder, then restart Cursor:

```
git clone https://github.com/cobuild-tech/cbx-plugins /tmp/cbx-plugins
mkdir -p ~/.cursor/plugins/local
for p in ember angular backbone jquery vanillajs; do
  rsync -a --delete --exclude .claude-plugin --exclude .codex-plugin --exclude .mcp.json \
    /tmp/cbx-plugins/$p-to-react/ ~/.cursor/plugins/local/$p-to-react/
done
```

## Repository layout

```
cbx-plugins/
├── .claude-plugin/marketplace.json   Claude Code / Copilot
├── .cursor-plugin/marketplace.json   Cursor
├── .agents/plugins/marketplace.json  Codex
├── shared/                      single source of truth, never shipped directly
│   ├── methodology/             strategies, validation, .migration/ state format
│   └── react/                   React target guidance shared by every plugin
├── scripts/
│   ├── sync-shared.sh           copies shared/ into each plugin (--check to verify)
│   └── check-references.sh      every reference file must be routed from SKILL.md
└── <framework>-to-react/
    ├── .claude-plugin/plugin.json
    ├── .mcp.json                Context7
    ├── agents/                  <framework>-inventory, <framework>-parity-reviewer
    ├── commands/plan.md
    └── skills/cobuildx-ai-<framework>-to-react-migration/
        ├── SKILL.md             workflow and routing table
        └── references/
            ├── mappings.md
            ├── <framework>/       framework-specific, one file per topic
            ├── react/           generated from shared/react
            └── methodology/     generated from shared/methodology
```

Edit `shared/`, never the generated copies, then run `scripts/sync-shared.sh` and commit the result. CI fails if the copies drift or a reference is never routed.
