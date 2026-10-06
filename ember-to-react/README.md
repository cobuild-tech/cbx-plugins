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

## Data handling

This skill contains instructions only. It doesn't collect, store, or send any data, and it doesn't call any external services.

## License

MIT — see [LICENSE](LICENSE).
