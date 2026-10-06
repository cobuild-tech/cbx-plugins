# ember-to-react

A Claude skill by CobuildX for migrating Ember.js apps (Classic or Octane) to React.

## What it does

The `cobuildx-ai-ember-to-react-migration` skill guides Claude through moving a Ember.js codebase to React. It supports both full rewrites and incremental (strangler-fig) migrations, where React and Ember.js run side by side until the old code is retired.

## How to use

Once the plugin is installed, ask Claude to migrate your app. For example:

- "Migrate this Ember app to React"
- "Port our Ember Octane components to React incrementally"
- "Convert this Ember route and its template to a React page"

Claude loads the skill automatically when your request matches.

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

## License

MIT — see [LICENSE](LICENSE).
