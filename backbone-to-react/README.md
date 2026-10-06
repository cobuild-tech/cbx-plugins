# backbone-to-react

A Claude skill by CobuildX for migrating Backbone.js apps, including Marionette, jQuery, and Underscore/Handlebars templates to React.

## What it does

The `cobuildx-ai-backbone-to-react-migration` skill guides Claude through moving a Backbone.js codebase to React. It supports both full rewrites and incremental (strangler-fig) migrations, where React and Backbone.js run side by side until the old code is retired.

## How to use

Once the plugin is installed, ask Claude to migrate your app. For example:

- "Migrate this Backbone app to React"
- "Rewrite these Marionette views as React components"
- "Replace our Handlebars templates with React incrementally"

Claude loads the skill automatically when your request matches.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install backbone-to-react@cbx-plugins
```

## Bundled MCP server

This plugin connects to [Context7](https://context7.com)'s hosted documentation server (`https://mcp.context7.com/mcp`) so Claude can check current React, React Router, and TanStack Query APIs before writing migration code. It needs no install or API key. To turn it off, disable `context7` with `/mcp` in Claude Code.

## Data handling

The skill itself contains instructions only and stores nothing. The bundled Context7 server receives library names and documentation questions (for example "React Router loader redirect"); the skill instructs Claude never to send your source code, configuration, secrets, or business data to it. Context7's handling of those queries is covered by Context7's own privacy policy (https://context7.com/privacy).

CobuildX privacy policy: https://cobuildx.ai/privacy

## License

MIT — see [LICENSE](LICENSE).
