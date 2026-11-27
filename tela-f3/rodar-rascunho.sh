#!/usr/bin/env bash
# Tela F3 — refaz o rascunho e todas as conferências, na ordem. Builds servidos antes: semeado em $1, sem semente em $2
# (node tela-f3/servir.mjs <árvore> <porta>). Node pelo caminho explícito.
set -e
cd "$(dirname "$0")/.."
N="/c/Users/Natty Dev/AppData/Local/nvm/v25.2.1/node.exe"
tsx() { "$N" node_modules/tsx/dist/cli.mjs "$@"; }
"$N" tela-f3/sortear-conformes-f3.mjs
"$N" tela-f3/montar-referencia.mjs --forcar
tsx tela-f3/estratos.mjs
"$N" tela-f3/criterios.mjs
tsx tela-f3/validar-criterios.ts
"$N" tela-f3/conferir-ids-base.mjs | head -1
"$N" tela-f3/conferir-referencia.mjs "$1" tela-f3/conferir-referencia-semeada.log | tail -2
"$N" tela-f3/conferir-referencia.mjs "$2" tela-f3/conferir-referencia-sem-semente.log | tail -1 || true
"$N" tela-f3/conferir-construcao.mjs
