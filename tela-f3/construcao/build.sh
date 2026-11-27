#!/usr/bin/env bash
# Uso: bash build.sh <rotulo>  — build limpo da ala pnip-f3 no worktree (sem dist/ e sem .angular/), Node 16.20.2 explícito.
set -e
cd "/f/Dev Nath/TCC/.tmp-eval/pnip-mock-f3-wt"
rm -rf dist .angular
export MSYS_NO_PATHCONV=1
"/c/Users/Natty Dev/AppData/Local/nvm/v16.20.2/node.exe" --version
"/c/Users/Natty Dev/AppData/Local/nvm/v16.20.2/node.exe" mock-tools/build-mock.mjs --base-href /pnip-f3/ --output-path dist/pnip-f3 > "/f/Dev Nath/TCC/.tmp-eval/pnip-f3-construcao/$1.log" 2>&1
echo "build $1 ok"
git status --short
