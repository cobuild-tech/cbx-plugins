#!/usr/bin/env bash
# Usage: evals/run.sh [--case 'jquery/*'] [--models 'sonnet opus'] [--arms 'without with'] [--reps 3] [--jobs 4]
# Runs each case in a fresh git copy of its repo/ via `claude -p`, with and without the plugin.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); EV="$ROOT/evals"
CASE='*/*'; MODELS='sonnet opus'; ARMS='without with'; REPS=3; JOBS=4
while [ $# -gt 0 ]; do case $1 in
  --case) CASE=$2; shift 2;; --models) MODELS=$2; shift 2;; --arms) ARMS=$2; shift 2;;
  --reps) REPS=$2; shift 2;; --jobs) JOBS=$2; shift 2;; *) echo "unknown $1"; exit 1;; esac; done

one() { # case model arm rep
  local c=$1 m=$2 a=$3 r=$4 fw=${1%%/*}
  local out="$EV/results/$m/$a/$c/$r"
  [ -f "$out/final.md" ] && { echo "skip $out"; return; }
  mkdir -p "$out"; local w; w=$(mktemp -d)
  cp -R "$EV/cases/$c/repo/." "$w/"
  ( cd "$w" && git init -q && git add -A && git -c user.email=e@x -c user.name=eval commit -qm base )
  local args=(-p "$(cat "$EV/cases/$c/prompt.txt")" --model "$m" --setting-sources project --strict-mcp-config
              --permission-mode acceptEdits --allowedTools "Read Edit Write Glob Grep Skill"
              --disallowedTools "Bash WebFetch WebSearch Agent" --output-format stream-json --verbose)
  [ "$a" = with ] && args+=(--plugin-dir "$ROOT/$fw-to-react")
  [ "$a" = v1 ] && args+=(--plugin-dir "${V1_ROOT:?}/$fw-to-react")
  ( cd "$w" && claude "${args[@]}" > "$out/transcript.jsonl" 2> "$out/stderr.txt" ) || echo "FAIL $out"
  ( cd "$w" && git add -A && git diff --cached > "$out/changes.diff" )
  node -e '
    const fs=require("fs"),L=fs.readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>{try{return JSON.parse(l)}catch{return{}}});
    const res=L.find(x=>x.type==="result")||{}, init=L.find(x=>x.subtype==="init")||{};
    const skill=L.some(x=>x.type==="assistant"&&(x.message?.content||[]).some(b=>b.type==="tool_use"&&b.name==="Skill"));
    fs.writeFileSync(process.argv[2]+"/final.md",res.result||"");
    fs.writeFileSync(process.argv[2]+"/meta.json",JSON.stringify({model:init.model,cli:init.claude_code_version,skillInvoked:skill,cost:res.total_cost_usd,turns:res.num_turns,error:res.is_error},null,1));
  ' "$out/transcript.jsonl" "$out"
  rm -rf "$w"; echo "done $out"
}
export -f one; export EV ROOT

jobs=()
for c in $(cd "$EV/cases" && ls -d $CASE); do for m in $MODELS; do for a in $ARMS; do
  for r in $(seq 1 "$REPS"); do jobs+=("$c $m $a $r"); done; done; done; done
printf '%s\n' "${jobs[@]}" | xargs -P "$JOBS" -L 1 bash -c 'one "$@"' _
