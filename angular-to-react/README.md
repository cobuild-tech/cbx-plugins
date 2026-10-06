# angular-to-react

A Claude skill by CobuildX for migrating Angular and AngularJS apps to React.

## What it does

The `cobuildx-ai-angular-to-react-migration` skill guides Claude through moving a Angular/AngularJS codebase to React. It supports both full rewrites and incremental (strangler-fig) migrations, where React and Angular/AngularJS run side by side until the old code is retired.

## How to use

Once the plugin is installed, ask Claude to migrate your app. For example:

- "Migrate this Angular app to React"
- "Help me port our AngularJS dashboard to React incrementally"
- "Convert this Angular service and component to React"

Claude loads the skill automatically when your request matches.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install angular-to-react@cbx-plugins
```

## Data handling

This skill contains instructions only. It doesn't collect, store, or send any data, and it doesn't call any external services.

## License

MIT — see [LICENSE](LICENSE).
