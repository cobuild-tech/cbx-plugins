# With/without-plugin evals

Measures what each X-to-React skill adds to a migration: the same model, the same repo, and the same prompt, with and without the plugin.

## Layout

- `cases/<framework>/<NN-name>/repo/` — a small multi-file legacy app. Only this folder is given to the model.
- `cases/<framework>/<NN-name>/prompt.txt` — the user request. It doesn't hint at what can go wrong.
- `cases/<framework>/<NN-name>/checks.json` — pass/fail criteria, written before any run. The model never sees them.
- `results/<model>/<arm>/<case>/<run>/` — transcript, diff, final message, metadata, and grade (generated). gcp-to-aws and aws-to-gcp runs also get `terraform.txt`.

Arms: `without` (no plugin) and `with` (the plugin in this repo).

## Running

```bash
bash evals/run.sh --case 'jquery/*' --models sonnet --arms 'without with' --reps 3 --jobs 2
node evals/grade.mjs --judge sonnet        # grades new runs and writes evals/RESULTS.md
```

- Each run uses `claude -p` in a fresh git copy of `repo/`, with only file tools (no shell or web).
- Nothing from user settings or MCP is loaded (`--setting-sources project --strict-mcp-config`), so the baseline has no migration skill. The `with` arm adds `--plugin-dir`. Whether the skill triggers is up to the model; `meta.json` records it.
- The grader sees the original repo, the diff, and the final message. Plugin names and lines mentioning the skill are removed, so it can't tell which arm it is grading.
- Runs that already have a `final.md` are skipped, so a batch can be stopped and resumed.

## gcp-to-aws

- `cases/gcp-to-aws/<NN-name>/repo/` is a small GCP app (Terraform, Python, BigQuery SQL). Runs load `gcp-to-aws/`: `bash evals/run.sh --case 'gcp-to-aws/*' --arms with`. Results are in [RESULTS-gcp-to-aws.md](RESULTS-gcp-to-aws.md).
- No cloud account is needed. After each run, `tfvalidate.sh` runs `terraform init -backend=false && terraform validate` on the generated `aws/` folder, using a local `terraform` or the `hashicorp/terraform` Docker image, and writes `terraform.txt` (first line PASS, FAIL, or SKIP). This proves the Terraform is well-formed, not that it applies; a LocalStack `apply` would be the next step.
- The plugin's bundled AWS Knowledge MCP is not loaded (`--strict-mcp-config`), so results reflect the skill and its references only.

## aws-to-gcp

- `cases/aws-to-gcp/<NN-name>/repo/` is a small AWS app (Terraform, Python, Athena SQL), the mirror of the gcp-to-aws case. Runs load `aws-to-gcp/`: `bash evals/run.sh --case 'aws-to-gcp/*' --arms with`. Results are in [RESULTS-aws-to-gcp.md](RESULTS-aws-to-gcp.md).
- `tfvalidate.sh` validates the generated `gcp/` folder the same way (offline, `google` provider, no credentials). It mounts the whole run folder (configs may read `../app/...`), stubs build artifacts like `worker.zip`, and fails when the folder has no `.tf` files. Run folders are created under `$HOME`, because Docker Desktop on macOS mounts a `mktemp` folder under `/var/folders` as empty, which earlier produced false PASS results.

## Scope

- Each case converts one area of a repo in a single session (the skill's Direct mode). The multi-session project workflow (inventory, plan, parity review, `.migration/` state) is described in each plugin's README.
- Each run folder holds the diff, the final message, the grade with a one-sentence reason per criterion, and run metadata, so every score can be checked against what the model actually did.
