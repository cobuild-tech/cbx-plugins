#!/usr/bin/env bash
# Usage: evals/tfvalidate.sh <workdir> <outdir>
# If the run produced Terraform in aws/ or gcp/, validates it offline (no cloud credentials) and writes terraform.txt.
# Uses a local terraform, else the hashicorp/terraform Docker image. First line of terraform.txt: PASS / FAIL / SKIP.
w=$1; out=$2
for d in aws gcp; do [ -d "$w/$d" ] && break; done; [ -d "$w/$d" ] || exit 0
ls "$w/$d"/*.tf >/dev/null 2>&1 || { echo "FAIL (no .tf files in $d/)" > "$out/terraform.txt"; exit 0; }
# Stub build artifacts (zips) the config references but the run can't build, so validate checks the config, not the build.
grep -ohE '[A-Za-z0-9_./-]+\.zip' "$w/$d"/*.tf | sort -u | while read -r z; do z=${z#./}; z=${z#\$\{path.module\}/}; [ -e "$w/$d/$z" ] || { mkdir -p "$(dirname "$w/$d/$z")"; touch "$w/$d/$z"; }; done
if command -v terraform >/dev/null; then tf() { (cd "$w/$d" && terraform "$@"); }
elif docker info >/dev/null 2>&1; then tf() { docker run --rm -v "$w:/w" -w "/w/$d" hashicorp/terraform:1.9 "$@"; }
else echo "SKIP (no terraform or docker)" > "$out/terraform.txt"; exit 0; fi
log=$( { tf init -backend=false -input=false -no-color && tf validate -no-color; } 2>&1 )
if [ $? -eq 0 ]; then echo PASS; else echo FAIL; fi > "$out/terraform.txt"
printf '%s\n' "$log" | tail -40 >> "$out/terraform.txt"
rm -rf "$w/$d/.terraform" "$w/$d/.terraform.lock.hcl"
