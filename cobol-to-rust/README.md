# cobol-to-rust

A Claude skill by CobuildX for migrating COBOL systems to Rust, from JCL batch jobs and copybooks to DB2 and CICS.

## What it does

The `cobuildx-ai-cobol-to-rust-migration` skill guides Claude through moving a COBOL codebase to Rust. It supports both full rewrites and incremental (strangler-fig) migrations, where Rust replaces one job step at a time while the rest of the job keeps running, and every step is proven byte for byte against the COBOL output.

## What's included

| Component | Name | What it does |
|---|---|---|
| Skill | `cobuildx-ai-cobol-to-rust-migration` | The migration workflow: assess, choose a strategy, plan, then migrate one unit per run. Detailed guidance is in reference files that load only when needed. Triggers on "migrate this app" and on "continue the migration". |
| Command | `/cobol-to-rust:plan [path]` | Runs assess, strategy, and plan, writes `.migration/`, and stops for your approval. Changes no app code. |
| Agent | `cobol-inventory` | Read-only sweep of the COBOL codebase: programs and `CALL`s, copybooks and the programs that share them, JCL steps and datasets, files and tables, CICS transactions, and hidden data rules (packed decimals, implied decimal points, `REDEFINES`, truncating arithmetic). |
| Agent | `cobol-parity-reviewer` | Read-only comparison of a ported program or job step against its COBOL original: record layout, arithmetic and rounding, control flow, file status handling, and output. |
| MCP server | `context7` | Looks up current rust_decimal, sqlx, and other crate docs. |

## How to use

Once the plugin is installed, ask Claude to migrate your app. For example:

- "Migrate this COBOL batch system to Rust"
- "Port the monthly interest job to Rust, one job step at a time"
- "Turn this copybook into a Rust record type with a round-trip test"

Claude loads the skill automatically when your request matches. To start with a plan, run:

```
/cobol-to-rust:plan
```

In Cursor, use the same full name, `/cobol-to-rust:plan`. Plain `/plan` opens Cursor's built-in Plan mode instead of this command.

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

1. **Assess**: inventory the system.
2. **Choose a strategy**: full rewrite, Strangler Fig, or Branch by Abstraction. Every unit is checked by a parallel run against recorded output from the original.
3. **Plan**: break the work into units and stop for your approval.
4. **Execute**: migrate and validate **one unit**, update the state, and stop. Say "continue the migration" to run the next one.

Ask "what's left to migrate?" or "why isn't the interest job migrated yet?" and Claude answers from `.migration/state.json`.

## Install

From the Claude directory, or in Claude Code:

```
/plugin marketplace add cobuild-tech/cbx-plugins
/plugin install cobol-to-rust@cbx-plugins
```

In VS Code with GitHub Copilot, add the marketplace to your user settings, reload the window, then search `@agentPlugins` in the Extensions view and install **cobol-to-rust**:

```json
"chat.plugins.enabled": true,
"chat.plugins.marketplaces": ["cobuild-tech/cbx-plugins"]
```

In GitHub Copilot CLI:

```
copilot plugin marketplace add cobuild-tech/cbx-plugins
copilot plugin install cobol-to-rust@cbx-plugins
```

## Bundled MCP server

This plugin connects to [Context7](https://context7.com)'s hosted documentation server (`https://mcp.context7.com/mcp`) so Claude can check current crate APIs before writing migration code. It needs no install or API key. To turn it off, disable `context7` with `/mcp` in Claude Code.

## Data handling

The skill contains instructions only. Its only output besides your migrated code is the `.migration/` folder in your own repo, and nothing is sent anywhere else. The bundled Context7 server receives library names and documentation questions (for example "sqlx query macros"); the skill instructs Claude never to send your source code, copybooks, data files, configuration, secrets, or business data to it. Context7's handling of those queries is covered by Context7's own privacy policy (https://context7.com/privacy).

CobuildX privacy policy: https://cobuildx.ai/privacy

## Support

Report problems or request features in [GitHub Issues](https://github.com/cobuild-tech/cbx-plugins/issues), or email hello@cobuildx.ai.

Terms of service: https://cobuildx.ai/terms

## License

MIT — see [LICENSE](LICENSE).
