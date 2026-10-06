# ember-to-react

A Claude skill by CobuildX for migrating Ember.js apps (Classic or Octane) to React.

## What it does

The `cobuildx-ai-ember-to-react-migration` skill guides Claude through moving a Ember.js codebase to React. It supports both full rewrites and incremental (strangler-fig) migrations, where React and Ember.js run side by side until the old code is retired.

## What's included

| Component | Name | What it does |
|---|---|---|
| Skill | `cobuildx-ai-ember-to-react-migration` | The migration method: strategy, concept mappings, process, verification, and rollback. Loads automatically when you ask to migrate. |
| Command | `/ember-to-react:plan [path]` | Inventories the app and writes a complete migration plan. Changes no code. |
| Agent | `ember-inventory` | Read-only sweep of the Ember.js codebase that returns a structured inventory. |
| Agent | `ember-parity-reviewer` | Read-only comparison of a migrated piece against its original, listing every behavior difference. |
| MCP server | `context7` | Looks up current React, React Router, and TanStack Query docs. |

## How to use

Once the plugin is installed, ask Claude to migrate your app. For example:

- "Migrate this Ember app to React"
- "Port our Ember Octane components to React incrementally"
- "Convert this Ember route and its template to a React page"

Claude loads the skill automatically when your request matches. To start with a plan, run:

```
/ember-to-react:plan
```

In Cursor, use the same full name, `/ember-to-react:plan`. Plain `/plan` opens Cursor's built-in Plan mode instead of this command.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install ember-to-react@cbx-plugins
```

## Bundled MCP server

This plugin connects to [Context7](https://context7.com)'s hosted documentation server (`https://mcp.context7.com/mcp`) so Claude can check current React, React Router, and TanStack Query APIs before writing migration code. It needs no install or API key. To turn it off, disable `context7` with `/mcp` in Claude Code.

## Data handling

The skill itself contains instructions only and stores nothing. The bundled Context7 server receives library names and documentation questions (for example "React Router loader redirect"); the skill instructs Claude never to send your source code, configuration, secrets, or business data to it. Context7's handling of those queries is covered by Context7's own privacy policy (https://context7.com/privacy).

CobuildX privacy policy: https://cobuildx.ai/privacy

## Support

Report problems or request features in [GitHub Issues](https://github.com/cobuild-tech/cbx-plugins/issues), or email hello@cobuildx.ai.

Terms of service: https://cobuildx.ai/terms

## License

MIT — see [LICENSE](LICENSE).
