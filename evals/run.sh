#!/usr/bin/env bash
# Usage: evals/run.sh [--agent claude|copilot] [--case 'jquery/*'] [--models 'sonnet'] [--arms 'without prompt with'] [--reps 5] [--jobs 4]
#
# Runs each case in a fresh git copy of its repo/, once per arm:
#   without  no plugin
#   prompt   no plugin, plus a one-line instruction to preserve behaviour and list differences
#            (the cheapest alternative to the plugin; the plugin has to beat this, not just "without")
#   with     the plugin in this repo
# Results go to results/<agent>-<model>/<arm>/<case>/<rep>/.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); EV="$ROOT/evals"
AGENT=claude; CASE='*/*'; MODELS='sonnet'; ARMS='without prompt with'; REPS=5; JOBS=4
while [ $# -gt 0 ]; do case $1 in
  --agent) AGENT=$2; shift 2;; --case) CASE=$2; shift 2;; --models) MODELS=$2; shift 2;;
  --arms) ARMS=$2; shift 2;; --reps) REPS=$2; shift 2;; --jobs) JOBS=$2; shift 2;;
  *) echo "unknown $1"; exit 1;; esac; done
case $AGENT in claude|copilot) ;; *) echo "--agent must be claude or copilot"; exit 1;; esac
command -v "$AGENT" >/dev/null || { echo "$AGENT CLI not found on PATH"; exit 1; }

BASELINE_LINE='Preserve the existing behaviour exactly, and end your summary with a list of every behaviour difference between the old and new code.'

one() { # case model arm rep
  local c=$1 m=$2 a=$3 r=$4 fw=${1%%/*}
  local out="$EV/results/$AGENT-$m/$a/$c/$r"
  [ -f "$out/final.md" ] && { echo "skip $out"; return; }
  mkdir -p "$out"; local w; w=$(mktemp -d)
  cp -R "$EV/cases/$c/repo/." "$w/"
  ( cd "$w" && git init -q && git add -A && git -c user.email=e@x -c user.name=eval commit -qm base )
  local prompt; prompt=$(cat "$EV/cases/$c/prompt.txt")
  [ "$a" = prompt ] && prompt="$prompt $BASELINE_LINE"
  local pd="$ROOT/$fw"; [ -d "$pd/.claude-plugin" ] || pd="$ROOT/$fw-to-react"   # gcp-to-aws/ or <fw>-to-react/

  if [ "$AGENT" = claude ]; then
    local args=(-p "$prompt" --model "$m" --setting-sources project --strict-mcp-config
                --permission-mode acceptEdits --allowedTools "Read Edit Write Glob Grep Skill"
                --disallowedTools "Bash WebFetch WebSearch Agent" --output-format stream-json --verbose)
    [ "$a" = with ] && args+=(--plugin-dir "$pd")
    ( cd "$w" && claude "${args[@]}" > "$out/transcript.jsonl" 2> "$out/stderr.txt" ) || echo "FAIL $out"
  else
    # Isolated COPILOT_HOME: no user plugins, skills, MCP servers, or instructions leak into the baseline.
    # Auth comes from COPILOT_GITHUB_TOKEN / GH_TOKEN (see README).
    local home; home=$(mktemp -d)
    local args=(-p "$prompt" --model "$m" --output-format json --no-ask-user --no-custom-instructions
                --disable-builtin-mcps --allow-tool write --deny-tool shell --deny-tool url)
    [ "$a" = with ] && args+=(--plugin-dir "$pd")
    ( cd "$w" && COPILOT_HOME="$home" copilot "${args[@]}" > "$out/transcript.jsonl" 2> "$out/stderr.txt" ) || echo "FAIL $out"
    rm -rf "$home"
  fi

  ( cd "$w" && git add -A && git diff --cached > "$out/changes.diff" )
  node "$EV/lib/meta.mjs" "$AGENT" "$out" "$a" "$pd"
  [ -f "$EV/cases/$c/verify.mjs" ] && node "$EV/cases/$c/verify.mjs" "$w" > "$out/auto.json"
  [ -x "$EV/tfvalidate.sh" ] && "$EV/tfvalidate.sh" "$w" "$out"
  rm -rf "$w"; echo "done $out"
}
export -f one; export EV ROOT AGENT BASELINE_LINE

jobs=()
for c in $(cd "$EV/cases" && ls -d $CASE); do for m in $MODELS; do for a in $ARMS; do
  for r in $(seq 1 "$REPS"); do jobs+=("$c $m $a $r"); done; done; done; done
printf '%s\n' "${jobs[@]}" | xargs -P "$JOBS" -L 1 bash -c 'one "$@"' _
