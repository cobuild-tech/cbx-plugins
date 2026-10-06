# cbx-plugins

Claude plugins by CobuildX.

| Plugin | Description |
|---|---|
| [ember-to-react](ember-to-react) | Migrate Ember.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |
| [angular-to-react](angular-to-react) | Migrate Angular (2+) and AngularJS (1.x) apps to React — full rewrites or incremental strangler-fig migrations of any size, including hybrid ngUpgrade apps. |
| [backbone-to-react](backbone-to-react) | Migrate Backbone.js apps to React — full rewrites or incremental strangler-fig migrations of any size. |

## Install in Claude Code

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install ember-to-react@cbx-plugins
/plugin install angular-to-react@cbx-plugins
/plugin install backbone-to-react@cbx-plugins
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
```
