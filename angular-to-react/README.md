# angular-to-react

A Claude skill by CobuildX for migrating Angular (2+) and AngularJS (1.x) apps to React, including hybrid ngUpgrade apps.

## What it does

The `cobuildx-ai-angular-to-react-migration` skill guides Claude through moving an Angular or AngularJS codebase to React. It supports both full rewrites and incremental (strangler-fig) migrations, where React and Angular run side by side until the old code is retired.

## How to use

Once the plugin is installed, ask Claude to migrate your app. For example:

- "Migrate this Angular app to React"
- "Help me port our AngularJS dashboard to React incrementally"
- "Convert this Angular service and component to React"
- "Migrate our hybrid AngularJS/Angular app to React"

Claude loads the skill automatically when your request matches.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install angular-to-react@cbx-plugins
```

## Bundled MCP server

This plugin connects to [Context7](https://context7.com)'s hosted documentation server (`https://mcp.context7.com/mcp`) so Claude can check current React, React Router, and TanStack Query APIs before writing migration code. It needs no install or API key. To turn it off, disable `context7` with `/mcp` in Claude Code.

## Data handling

The skill itself contains instructions only and stores nothing. The bundled Context7 server receives library names and documentation questions (for example "React Router loader redirect"); the skill instructs Claude never to send your source code, configuration, secrets, or business data to it. Context7's handling of those queries is covered by Context7's own privacy policy (https://context7.com/privacy).

CobuildX privacy policy: https://cobuildx.ai/privacy

## License

MIT — see [LICENSE](LICENSE).
