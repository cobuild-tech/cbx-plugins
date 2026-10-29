# cbx-plugins

Migration plugins by CobuildX: five framework-to-React plugins and one cloud migration plugin (GCP to AWS).

| Plugin | Description |
|---|---|
| [ember-to-react](ember-to-react) | Migrate Ember.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |
| [angular-to-react](angular-to-react) | Migrate Angular (2+) and AngularJS (1.x) apps to React — full rewrites or incremental strangler-fig migrations of any size, including hybrid ngUpgrade apps. |
| [backbone-to-react](backbone-to-react) | Migrate Backbone.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |
| [jquery-to-react](jquery-to-react) | Migrate jQuery apps and pages to React — full rewrites or incremental strangler-fig migrations of any size, including jQuery plugins and jQuery UI. |
| [vanillajs-to-react](vanillajs-to-react) | Migrate vanilla JavaScript apps and pages to React — full rewrites or incremental strangler-fig migrations of any size, from script-tag pages to ES-module apps. |
| [gcp-to-aws](gcp-to-aws) | Migrate Google Cloud (GCP) workloads to AWS — compute, GKE, serverless, big data, and storage — from single snippets to full phased migrations. |

## Open source, independent of CobuildX services

These plugins are free, MIT-licensed open source, and each complete on its own. They are not a trial, demo, or lead-in for any paid offering: they have no upsell, sign-up, license key, usage limit, or "contact us" step, and nothing in them collects contact details or calls CobuildX servers. CobuildX also offers migration consulting as a separate business, and these plugins do not reference or depend on it.

## Install in Claude Code

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install ember-to-react@cbx-plugins
/plugin install angular-to-react@cbx-plugins
/plugin install backbone-to-react@cbx-plugins
/plugin install jquery-to-react@cbx-plugins
/plugin install vanillajs-to-react@cbx-plugins
/plugin install gcp-to-aws@cbx-plugins
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
copilot plugin install gcp-to-aws@cbx-plugins
```

## Install in Codex

```
codex plugin marketplace add cobuild-tech/cbx-plugins
codex plugin add ember-to-react@cbx-plugins
codex plugin add angular-to-react@cbx-plugins
codex plugin add backbone-to-react@cbx-plugins
codex plugin add jquery-to-react@cbx-plugins
codex plugin add vanillajs-to-react@cbx-plugins
codex plugin add gcp-to-aws@cbx-plugins
```

Codex loads the migration skill. It does not run the bundled agents or the `/plan` command; the skill tells Codex to follow the agent instructions itself. For current React docs, add Context7 once:

```
codex mcp add context7 --url https://mcp.context7.com/mcp
```

For `gcp-to-aws`, add the AWS Knowledge server instead (or as well):

```
codex mcp add aws-knowledge --url https://knowledge-mcp.global.api.aws
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
rsync -a --delete --exclude .claude-plugin --exclude .codex-plugin --exclude .mcp.json \
  /tmp/cbx-plugins/gcp-to-aws/ ~/.cursor/plugins/local/gcp-to-aws/
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

gcp-to-aws/                      same plugin shape; its references are its own
├── agents/                      gcp-inventory, aws-parity-reviewer
├── .mcp.json                    AWS Knowledge MCP
└── skills/cobuildx-ai-gcp-to-aws-migration/references/
    ├── mappings.md, compute.md, serverless.md, big-data.md, big-data-sql.md, storage.md
    ├── iam-identity.md, networking.md, cost-limits.md
    └── methodology/             phases, state format, validation, cutover (not synced from shared/)
```

Edit `shared/`, never the generated copies, then run `scripts/sync-shared.sh` and commit the result. CI fails if the copies drift or a reference is never routed.
