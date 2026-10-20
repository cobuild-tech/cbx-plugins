# cbx-plugins

Claude plugins by CobuildX.

| Plugin | Description |
|---|---|
| [ember-to-react](ember-to-react) | Migrate Ember.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |
| [angular-to-react](angular-to-react) | Migrate Angular (2+) and AngularJS (1.x) apps to React — full rewrites or incremental strangler-fig migrations of any size, including hybrid ngUpgrade apps. |
| [backbone-to-react](backbone-to-react) | Migrate Backbone.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |
| [jquery-to-react](jquery-to-react) | Migrate jQuery apps and pages to React — full rewrites or incremental strangler-fig migrations of any size, including jQuery plugins and jQuery UI. |
| [vanillajs-to-react](vanillajs-to-react) | Migrate vanilla JavaScript apps and pages to React — full rewrites or incremental strangler-fig migrations of any size, from script-tag pages to ES-module apps. |
| [cobol-to-rust](cobol-to-rust) | Migrate COBOL systems to Rust — full rewrites or incremental strangler-fig migrations of any size, from JCL batch jobs and copybooks to DB2 and CICS. |
| [php-to-rust](php-to-rust) | Migrate PHP apps to Rust — full rewrites or incremental strangler-fig migrations of any size, from plain PHP scripts to Laravel and Symfony routes, cron jobs, and queue workers. |

## Install in Claude Code

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install ember-to-react@cbx-plugins
/plugin install angular-to-react@cbx-plugins
/plugin install backbone-to-react@cbx-plugins
/plugin install jquery-to-react@cbx-plugins
/plugin install vanillajs-to-react@cbx-plugins
/plugin install cobol-to-rust@cbx-plugins
/plugin install php-to-rust@cbx-plugins
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
copilot plugin install cobol-to-rust@cbx-plugins
copilot plugin install php-to-rust@cbx-plugins
```

## Repository layout

```
cbx-plugins/
├── .claude-plugin/marketplace.json
├── shared/                      single source of truth, never shipped directly
│   ├── methodology/             strategies, validation, .migration/ state format (React targets)
│   ├── methodology-backend/     the same for Rust targets: job steps, routes, parallel runs
│   ├── react/                   React target guidance shared by the *-to-react plugins
│   └── rust/                    Rust target guidance shared by the *-to-rust plugins
├── scripts/
│   ├── sync-shared.sh           copies shared/ into each plugin (--check to verify)
│   └── check-references.sh      every reference file must be routed from SKILL.md
└── <source>-to-<target>/
    ├── .claude-plugin/plugin.json
    ├── .mcp.json                Context7
    ├── agents/                  <source>-inventory, <source>-parity-reviewer
    ├── commands/plan.md
    └── skills/cobuildx-ai-<source>-to-<target>-migration/
        ├── SKILL.md             workflow and routing table
        └── references/
            ├── mappings.md
            ├── <source>/        source-specific, one file per topic
            ├── react/ or rust/  generated from shared/react or shared/rust
            └── methodology/     generated from shared/methodology or shared/methodology-backend
```

Edit `shared/`, never the generated copies, then run `scripts/sync-shared.sh` and commit the result. CI fails if the copies drift or a reference is never routed.
