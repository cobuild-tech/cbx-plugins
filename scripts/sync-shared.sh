#!/usr/bin/env bash
# Copies shared/<dir> into every plugin's skill references, so each plugin
# ships complete on its own. Edit shared/, never the generated copies.
#
#   scripts/sync-shared.sh          write the copies
#   scripts/sync-shared.sh --check  exit 1 if any copy is out of date
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
check=false
[[ "${1:-}" == "--check" ]] && check=true

shared_dirs=(methodology react)
plugins=(ember-to-react angular-to-react backbone-to-react)
header='<!-- GENERATED from shared/%s/%s by scripts/sync-shared.sh. DO NOT EDIT; edit shared/ and re-run. -->'

render() { # render <dir> <file> -> stdout
  printf "$header\n\n" "$1" "$2"
  cat "$root/shared/$1/$2"
}

stale=0
for plugin in "${plugins[@]}"; do
  skill_dir=$(find "$root/$plugin/skills" -mindepth 1 -maxdepth 1 -type d | head -1)
  for dir in "${shared_dirs[@]}"; do
    dest="$skill_dir/references/$dir"
    if $check; then
      for src in "$root/shared/$dir"/*.md; do
        f=$(basename "$src")
        if ! diff -q <(render "$dir" "$f") "$dest/$f" >/dev/null 2>&1; then
          echo "out of date: ${dest#$root/}/$f"; stale=1
        fi
      done
      for out in "$dest"/*.md; do
        [[ -e "$out" && ! -e "$root/shared/$dir/$(basename "$out")" ]] && { echo "orphan: ${out#$root/}"; stale=1; }
      done
    else
      rm -rf "$dest" && mkdir -p "$dest"
      for src in "$root/shared/$dir"/*.md; do
        f=$(basename "$src")
        render "$dir" "$f" > "$dest/$f"
      done
      echo "synced ${dest#$root/}"
    fi
  done
done

if $check; then
  [[ $stale -eq 0 ]] && echo "shared references are in sync" || { echo "run scripts/sync-shared.sh"; exit 1; }
fi
