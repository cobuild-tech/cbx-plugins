# jquery-to-react

A Claude skill by CobuildX for migrating jQuery apps and pages, including jQuery plugins and jQuery UI, to React.

## What it does

The `cobuildx-ai-jquery-to-react-migration` skill guides Claude through moving a jQuery codebase to React. It supports both full rewrites and incremental (strangler-fig) migrations, where React and jQuery run side by side until jQuery is removed.

## What's included

| Component | Name | What it does |
|---|---|---|
| Skill | `cobuildx-ai-jquery-to-react-migration` | The migration workflow: assess, choose a strategy, plan, then migrate one unit per run. Detailed guidance is in reference files that load only when needed. Triggers on "migrate this app" and on "continue the migration". |
| Command | `/jquery-to-react:plan [path]` | Runs assess, strategy, and plan, writes `.migration/`, and stops for your approval. Changes no app code. |
| Agent | `jquery-inventory` | Read-only sweep of the jQuery codebase: DOM changes, handlers, delegated events, Ajax, effects, `.data()`, plugins, and shared variables. |
| Agent | `jquery-parity-reviewer` | Read-only comparison of a migrated piece against its original, listing every behavior difference. |
| MCP server | `context7` | Looks up current React, React Router, and TanStack Query docs. |

## How to use

Once the plugin is installed, ask Claude to migrate your app. For example:

- "Migrate this jQuery app to React"
- "Move our jQuery checkout page to React one section at a time"
- "Wrap this jQuery UI datepicker in a React component"

Claude loads the skill automatically when your request matches. To start with a plan, run:

```
/jquery-to-react:plan
```

In Cursor, use the same full name, `/jquery-to-react:plan`. Plain `/plan` opens Cursor's built-in Plan mode instead of this command.

## How a migration runs

The skill keeps its progress in a `.migration/` folder in your repo. Commit it, because it lets a migration continue across sessions:

```
.migration/
├── state.json      progress: strategy, phase, units and their status, next unit
├── assessment.md   inventory of the existing app
├── decisions.md    strategy and stack decisions, with reasons
├── plan.md         units in order, with dependencies (you approve this)
└── units/<id>.md   what each unit changed, validation results, quirks kept
```

1. **Assess**: inventory the app.
2. **Choose a strategy**: full rewrite, Strangler Fig, Branch by Abstraction, or vertical slice.
3. **Plan**: break the work into units and stop for your approval.
4. **Execute**: migrate and validate **one unit**, update the state, and stop. Say "continue the migration" to run the next one.

Ask "what's left to migrate?" or "why isn't Orders migrated yet?" and Claude answers from `.migration/state.json`.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install jquery-to-react@cbx-plugins
```

In VS Code with GitHub Copilot, add the marketplace to your user settings, reload the window, then search `@agentPlugins` in the Extensions view and install **jquery-to-react**:

```json
"chat.plugins.enabled": true,
"chat.plugins.marketplaces": ["cobuild-tech/cbx-plugins"]
```

In GitHub Copilot CLI:

```
copilot plugin marketplace add cobuild-tech/cbx-plugins
copilot plugin install jquery-to-react@cbx-plugins
```

## Bundled MCP server

This plugin connects to [Context7](https://context7.com)'s hosted documentation server (`https://mcp.context7.com/mcp`) so Claude can check current React, React Router, and TanStack Query APIs before writing migration code. It needs no install or API key. To turn it off, disable `context7` with `/mcp` in Claude Code.

## Data handling

The skill contains instructions only. Its only output besides your migrated code is the `.migration/` folder in your own repo, and nothing is sent anywhere else. The bundled Context7 server receives library names and documentation questions (for example "React Router loader redirect"); the skill instructs Claude never to send your source code, configuration, secrets, or business data to it. Context7's handling of those queries is covered by Context7's own privacy policy (https://context7.com/privacy).

CobuildX privacy policy: https://cobuildx.ai/privacy

## Support

Report problems or request features in [GitHub Issues](https://github.com/cobuild-tech/cbx-plugins/issues), or email hello@cobuildx.ai.

Terms of service: https://cobuildx.ai/terms

## License

MIT — see [LICENSE](LICENSE).
