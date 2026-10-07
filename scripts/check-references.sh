#!/usr/bin/env bash
# Fails if a reference file is never mentioned in its SKILL.md.
# Claude only opens a reference when SKILL.md points to it, so an
# unmentioned file is dead weight.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
missing=0
for skill in "$root"/*/skills/*/SKILL.md; do
  dir=$(dirname "$skill")
  while IFS= read -r ref; do
    rel=${ref#$dir/references/}
    grep -qF "$rel" "$skill" || { echo "not referenced in ${skill#$root/}: $rel"; missing=1; }
  done < <(find "$dir/references" -name '*.md' | sort)
done
[[ $missing -eq 0 ]] && echo "every reference is routed from its SKILL.md"
exit $missing
