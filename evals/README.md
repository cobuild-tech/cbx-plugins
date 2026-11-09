# Evals

Measures what each plugin adds over the same agent without it. The question is not "does the plugin score well" but "does it change the outcome compared with no plugin, and compared with a one-line prompt".

## Arms

| Arm | What the agent gets |
|---|---|
| `without` | The repo and the prompt. No plugin. |
| `prompt` | The same, plus one line: *"Preserve the existing behaviour exactly, and end your summary with a list of every behaviour difference between the old and new code."* This is the cheapest alternative to the plugin. |
| `with` | The repo, the prompt, and the plugin from this repo. |

A plugin is only useful if `with` beats **both** other arms.

## Layout

- `cases/<plugin>/<NN-name>/repo/`: the legacy app. Only this folder is given to the agent.
- `cases/<plugin>/<NN-name>/prompt.txt`: the user request. It doesn't hint at what can go wrong.
- `cases/<plugin>/<NN-name>/checks.json`: pass/fail criteria, committed before any run. `kind` is `targeted` (written alongside the skill's checklist) or `held-out` (committed before any run; the skill is not edited in response to its results). Results report the two separately.
- `cases/<plugin>/<NN-name>/verify.mjs` (optional): deterministic checks on the migrated repo. They can only **veto** a criterion the code clearly fails, and they override the judge.
- `results/<agent>-<model>/<arm>/<plugin>/<case>/<run>/`: diff, final message, metadata, vetoes, grade, and (gcp-to-aws) `terraform.txt`. Transcripts are kept locally and git-ignored.
- `archive/2026-11-pilot/`: the earlier single-run, two-arm pilot, kept unchanged, with its limits listed.

## Running

Copilot CLI (the target for awesome-copilot):

```bash
npm i -g @github/copilot
export COPILOT_GITHUB_TOKEN=$(gh auth token)       # or a fine-grained PAT with Copilot Requests
bash evals/run.sh --agent copilot --models 'claude-sonnet-5.5' --case 'gcp-to-aws/*' --reps 5 --jobs 3
node evals/grade.mjs --judge opus                    # grades new runs, writes RESULTS.md
```

Claude Code:

```bash
bash evals/run.sh --agent claude --models sonnet --case 'gcp-to-aws/*' --reps 5 --jobs 3
```

- Each run starts from a fresh git copy of `repo/`, with file tools only (no shell, no web).
- Claude Code runs load no user settings or MCP servers (`--setting-sources project --strict-mcp-config`). Copilot runs use a fresh, empty `COPILOT_HOME`, `--no-custom-instructions`, and `--disable-builtin-mcps`. So the baseline has no migration skill; the `with` arm adds `--plugin-dir`. Whether the skill triggers is up to the agent and is recorded in `meta.json`.
- The judge sees the original repo, the diff, and the final message, with plugin names and lines mentioning a skill removed, so it can't tell which arm it is grading.
- Runs that already have `final.md` are skipped, so a batch can be stopped and resumed.
- gcp-to-aws: `tfvalidate.sh` runs `terraform init -backend=false && terraform validate` on the generated `aws/` folder (local `terraform` or the `hashicorp/terraform` Docker image). That proves the Terraform is well formed, not that it behaves the same; the criteria and vetoes cover behaviour.

## Reporting rules

- Every run is published, in every arm, including regressions and runs where the skill didn't trigger. `RESULTS.md` has a Regressions section listing each criterion where `with` passed fewer runs than another arm.
- Results come from the exact plugin version that is submitted; `meta.json` records it.
- If a plugin does not beat both other arms, the results say so.

## Scope

Each case converts one area of a repo in a single session (the skill's Direct mode). The multi-session project workflow (inventory, plan, parity review, `.migration/` state) is not yet measured.
