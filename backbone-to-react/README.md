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

## Data handling

This skill contains instructions only. It doesn't collect, store, or send any data, and it doesn't call any external services.

## License

MIT — see [LICENSE](LICENSE).
