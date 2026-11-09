# November 2026 pilot (archived)

These are the results submitted with the first awesome-copilot submissions (issues #6218–#6222 and #6241). They are kept unchanged as a record. The current harness and results replace them.

Limits of this pilot, as the reviewer pointed out:

- One run per arm per case for the X-to-React plugins (three for gcp-to-aws).
- Claude Code only. No Copilot runs.
- Two arms only (without and with). No one-line-prompt baseline.
- The without-plugin baseline already passed 87–97% of criteria, so most cases could not show a difference.

**gcp-to-aws:** a without-plugin baseline was run (three runs) and scored the same as the plugin, 30/36 (83%). Commit `8f24cb1` removed those runs from the published results and reported the plugin runs alone. They are restored here under `results/sonnet/without/gcp-to-aws/`, and the original combined table is in this folder's `RESULTS.md` history (`git show 8f24cb1^:evals/RESULTS.md`).

Known regressions in this pilot (plugin arm worse than baseline):

| Case | Criterion | without → with |
|---|---|---|
| backbone/05-task-collectionview-paging | filter-sort | 1/1 → 0/1 |
| vanillajs/05-chat-websocket-global | global-api | 1/1 → 0/1 |

Criteria that failed in both arms: `angular/01 currency-format`, `angular/01 tests`, `ember/02 teardown`, `gcp-to-aws/01 multi-region-flag`, `gcp-to-aws/01 no-silent-changes`. Each of these has a matching fix in the skills (see the root README changelog).

**terraform validate:** the six PASS results here (and the "3/3 PASS" in the submission) are not valid. On macOS, Docker mounted an empty folder, Terraform reported "no Terraform configuration files", and the script counted that as a pass. The generated Terraform was never validated. `tfvalidate.sh` now resolves the real path and fails when there are no `.tf` files.
