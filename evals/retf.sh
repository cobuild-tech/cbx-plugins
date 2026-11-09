#!/usr/bin/env bash
# Re-runs terraform validate for finished runs by rebuilding the migrated repo from changes.diff.
# Usage: evals/retf.sh [results-subdir]
EV=$(cd "$(dirname "$0")" && pwd)
for d in $(find "$EV/results/${1:-}" -name changes.diff -path '*gcp-to-aws*' -exec dirname {} \;); do
  c=$(echo "$d" | sed -E 's|.*/(gcp-to-aws/[^/]+)/[0-9]+$|\1|')
  mkdir -p "$HOME/.cbx-eval-work"; w=$(mktemp -d "$HOME/.cbx-eval-work/XXXXXX")
  cp -R "$EV/cases/$c/repo/." "$w/" && (cd "$w" && git init -q && git apply --whitespace=nowarn "$d/changes.diff") && "$EV/tfvalidate.sh" "$w" "$d"
  rm -rf "$w"; echo "$(head -1 "$d/terraform.txt" 2>/dev/null) $d"
done
