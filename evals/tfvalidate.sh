#!/usr/bin/env bash
# Usage: evals/tfvalidate.sh <workdir> <outdir>
# If the run produced Terraform in aws/, validates it offline (no cloud credentials) and writes terraform.txt.
# Uses a local terraform, else the hashicorp/terraform Docker image. First line of terraform.txt: PASS / FAIL / SKIP.
w=$1; out=$2; [ -d "$w/aws" ] || exit 0
if command -v terraform >/dev/null; then tf() { (cd "$w/aws" && terraform "$@"); }
elif docker info >/dev/null 2>&1; then tf() { docker run --rm -v "$w/aws:/w" -w /w hashicorp/terraform:1.9 "$@"; }
else echo "SKIP (no terraform or docker)" > "$out/terraform.txt"; exit 0; fi
log=$( { tf init -backend=false -input=false -no-color && tf validate -no-color; } 2>&1 )
if [ $? -eq 0 ]; then echo PASS; else echo FAIL; fi > "$out/terraform.txt"
printf '%s\n' "$log" | tail -40 >> "$out/terraform.txt"
rm -rf "$w/aws/.terraform" "$w/aws/.terraform.lock.hcl"
