# With/without-plugin evals

Measures whether each X-to-React skill changes migration quality, using the same model with and without the plugin.

## Layout

- `cases/<framework>/<NN-name>/repo/` — a small multi-file legacy app. Only this folder is given to the model.
- `cases/<framework>/<NN-name>/prompt.txt` — the user request. It doesn't hint at what can go wrong.
- `cases/<framework>/<NN-name>/checks.json` — pass/fail criteria, written before any run. The model never sees them.
- `results/<model>/<arm>/<case>/<run>/` — transcript, diff, final message, metadata, and grade (generated).

Arms: `without` (no plugin), `with` (the plugin in this repo), and optionally `v1` (an older checkout, set `V1_ROOT`).

## Running

```bash
bash evals/run.sh --case 'jquery/*' --models sonnet --arms 'without with' --reps 3 --jobs 2
node evals/grade.mjs --judge sonnet        # grades new runs and writes evals/RESULTS.md
```

- Each run uses `claude -p` in a fresh git copy of `repo/`, with only file tools (no shell or web).
- Nothing from user settings or MCP is loaded (`--setting-sources project --strict-mcp-config`), so the baseline has no migration skill. The `with` arm adds `--plugin-dir`. Whether the skill triggers is up to the model; `meta.json` records it.
- The grader sees the original repo, the diff, and the final message. Plugin names and lines mentioning the skill are removed, so it can't tell which arm it is grading.
- Runs that already have a `final.md` are skipped, so a batch can be stopped and resumed.

## Limits

- The cases are written by the plugin authors, and a Claude model grades Claude output. Read the transcripts, not just the scores.
- These cases test converting one area of a repo in a single session. The multi-session project workflow (inventory, plan, parity review, `.migration/` state) is not tested.
