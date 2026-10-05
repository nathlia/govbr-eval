#!/usr/bin/env bash
# Prova local do T4: "roda a partir de checkout limpo em Linux, sem o computador da autora".
#
#   bash scripts/ci/ensaio-linux.sh            (no host: Git Bash no Windows, ou Linux com Docker)
#   ENSAIO_TELA=vistorias bash scripts/ci/ensaio-linux.sh   (a mesma prova na tela B; padrão: solicitacao)
#
# Monta um Linux de verdade ao lado do Docker local: um Docker Engine nativo (docker:28-dind, como o
# do runner do GitHub) e um controlador Debian com Node 24.21.0 (a base das imagens) rodando como
# usuário NÃO-root (uid 1001, como o `runner` do GitHub, com sudo para o apt do Playwright). No
# controlador: `git clone` dos repositórios locais (o govbr-eval com as mudanças ainda não commitadas
# aplicadas num commit SÓ do clone), um govbr-resultados "remoto" vazio (repositório bare) e o
# emulador (scripts/ci/emular-workflow.ts), que roda os passos do PRÓPRIO workflow, job a job, cada um
# numa pasta nova: modo `roteirizado` (sem modelo), tela A (ou a de ENSAIO_TELA), braço sem, coleta + linha de base +
# arquivamento + anexo (dublê do `gh`) + push. Depois restaura do arquivo e procura os tokens.
#
# Nada sai daqui: sem GitHub, sem provedor, tokens falsos. Volumes e contêineres criados são
# removidos no fim (inclusive em falha). Disco: ~4 GB temporários no Docker.
set -euo pipefail

if [ "${1:-host}" = "host" ]; then
  export MSYS_NO_PATHCONV=1
  aqui="$(cd "$(dirname "$0")/../../.." && pwd)"
  win() { if command -v cygpath > /dev/null; then cygpath -m "$1"; else echo "$1"; fi; }
  BASE="node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6"
  limpar() {
    docker rm -f t4-controlador t4-dind > /dev/null 2>&1 || true
    docker volume rm t4-work t4-dind-lib > /dev/null 2>&1 || true
  }
  trap limpar EXIT
  limpar
  docker volume create t4-work > /dev/null
  docker volume create t4-dind-lib > /dev/null
  docker run -d --privileged --name t4-dind -e DOCKER_TLS_CERTDIR= -v t4-work:/work -v t4-dind-lib:/var/lib/docker \
    docker:28-dind dockerd --host=unix:///var/run/docker.sock --host=tcp://127.0.0.1:2375 --tls=false > /dev/null
  for _ in $(seq 1 60); do
    if docker exec t4-dind docker -H tcp://127.0.0.1:2375 info > /dev/null 2>&1; then break; fi
    sleep 2
  done
  docker exec t4-dind sh -c 'mkdir -p /work/bin && cp /usr/local/bin/docker /usr/local/libexec/docker/cli-plugins/docker-buildx /work/bin/'
  docker cp "$(win "$aqui/govbr-eval/scripts/ci/ensaio-linux.sh")" t4-dind:/work/ensaio-linux.sh
  monta=()
  for r in govbr-eval govbr-telas govbr-ds-validator govbr-corpus; do monta+=(-v "$(win "$aqui/$r"):/host/$r:ro"); done
  docker run --rm --name t4-controlador --network container:t4-dind -v t4-work:/work "${monta[@]}" \
    -e DOCKER_HOST=tcp://127.0.0.1:2375 -e ENSAIO_TELA="${ENSAIO_TELA:-solicitacao}" "$BASE" bash /work/ensaio-linux.sh controlador
  exit $?
fi

if [ "$1" = "controlador" ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq > /dev/null && apt-get install -y -qq git sudo ca-certificates > /dev/null
  cp /work/bin/docker /usr/local/bin/docker
  mkdir -p /usr/local/libexec/docker/cli-plugins && cp /work/bin/docker-buildx /usr/local/libexec/docker/cli-plugins/
  useradd -m -u 1001 -s /bin/bash runner
  echo 'runner ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/runner
  chown -R 1001:1001 /work
  echo "controlador: $(node --version), $(git --version), Docker $(docker version --format '{{.Server.Version}} ({{.Server.Os}})'), usuário runner uid 1001"
  exec runuser -u runner -- env DOCKER_HOST="$DOCKER_HOST" ENSAIO_TELA="${ENSAIO_TELA:-solicitacao}" HOME=/home/runner PATH="$PATH" bash /work/ensaio-linux.sh runner
fi

# ───────────────────────────────────────────────── como `runner` (uid 1001)
set -x
git config --global safe.directory '*'
git config --global user.name ensaio-t4
git config --global user.email ensaio-t4@local
git config --global init.defaultBranch main
F=/work/fontes
mkdir -p "$F"
for r in govbr-telas govbr-ds-validator govbr-corpus; do git clone -q "/host/$r" "$F/$r"; done
# PENDÊNCIA DA AUTORA (achada por esta prova): data/knowledge/versions/*/reports/ do validador está fora
# do git (o padrão `reports/` do .gitignore pega a pasta), mas o oráculo lê conflicts.json e
# official-package-audit.json dela em tempo de execução, e o dataSha256 travado inclui os 8 arquivos.
# Um checkout limpo não reproduz o oráculo travado. A prova simula a correção — os MESMOS bytes,
# num commit SÓ deste clone; nada é commitado na origem.
(cd /host/govbr-ds-validator && git --no-optional-locks ls-files --others --ignored --exclude-standard data) | while read -r f; do
  mkdir -p "$F/govbr-ds-validator/$(dirname "$f")"; cp "/host/govbr-ds-validator/$f" "$F/govbr-ds-validator/$f"
done
(cd "$F/govbr-ds-validator" && git add -f data && git commit -qm "ensaio T4: data/…/reports no git (simula a correção pendente)")
git clone -q /host/govbr-eval "$F/govbr-eval"
# mudanças ainda não commitadas na origem: viram um commit SÓ deste clone (nada é commitado na origem)
(cd /host/govbr-eval && git --no-optional-locks diff HEAD --binary) | (cd "$F/govbr-eval" && git apply --whitespace=nowarn)
(cd /host/govbr-eval && git --no-optional-locks ls-files --others --exclude-standard) | while read -r f; do
  mkdir -p "$F/govbr-eval/$(dirname "$f")"; cp "/host/govbr-eval/$f" "$F/govbr-eval/$f"
done
(cd "$F/govbr-eval" && git add -A && git commit -qm "ensaio T4 local (não publicado)")
git init -q --bare "$F/govbr-resultados.git"
git clone -q "$F/govbr-resultados.git" /work/semente && (cd /work/semente && echo "# govbr-resultados (ensaio)" > README.md && git add README.md && git commit -qm inicial && git push -q origin HEAD:main)
rm -rf /work/semente
set +x

git clone -q "$F/govbr-eval" /work/emulador/govbr-eval
(cd /work/emulador/govbr-eval && npm ci --ignore-scripts --no-audit --no-fund > /dev/null)
SHA=$(git -C "$F/govbr-eval" rev-parse HEAD)
LEITURA="github_pat_ENSAIO_LEITURA_$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
ESCRITA="github_pat_ENSAIO_ESCRITA_$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
node -e '
const [sha, f, telas, val, l, e] = process.argv.slice(1);
const cfg = { workflow: "/work/emulador/govbr-eval/.github/workflows/execucao-isolada.yml", raiz: "/work/emul", self: "nathlia/govbr-eval", sha,
  fontes: { "nathlia/govbr-eval": f + "/govbr-eval", "nathlia/govbr-telas": f + "/govbr-telas", "nathlia/govbr-ds-validator": f + "/govbr-ds-validator",
    "nathlia/govbr-corpus": f + "/govbr-corpus", "nathlia/govbr-resultados": f + "/govbr-resultados.git" },
  inputs: { modo: "roteirizado", tela: process.env.ENSAIO_TELA || "solicitacao", braco: "sem", modelo: "", esforco: "high", limite_min: "10", campanha: "t4-ensaio-linux", slot: "slot-01",
    par: "par-01", tentativa: "1", repeticao: "1", telas_sha: telas, validator_sha: val, etapas: "coleta+linha-de-base", refazer_linha_de_base_de: "", motivo_refazer: "" },
  secrets: { GOVBR_LEITURA_TOKEN: l, GOVBR_RESULTADOS_TOKEN: e }, saida: "/work/relatorio-emulacao.json" };
require("fs").writeFileSync("/work/config.json", JSON.stringify(cfg, null, 2));
' "$SHA" "$F" "$(git -C "$F/govbr-telas" rev-parse HEAD)" "$(git -C "$F/govbr-ds-validator" rev-parse HEAD)" "$LEITURA" "$ESCRITA"

inicio=$(date +%s)
set +e
(cd /work/emulador/govbr-eval && npx --no-install tsx scripts/ci/emular-workflow.ts --config /work/config.json)
emul=$?
set -e
echo "== emulação: código $emul em $(( $(date +%s) - inicio )) s"

echo "== conferência pós-execução (só pelo arquivo remoto e pelo anexo)"
git clone -q "$F/govbr-resultados.git" /work/verificacao
git -C /work/verificacao log --oneline | head -5
node -e '
const i = require("/work/verificacao/indice/indice.json");
for (const e of i.entradas) console.log(JSON.stringify({ chave: e.chave, tipo: e.tipo, natureza: e.natureza, caminho: e.caminho, estado: e.estado, motivo: e.motivo, evidencias: e.evidencias && { estado: e.evidencias.estado, sha256: e.evidencias.sha256 } }));
'
ok=0
cd /work/emulador/govbr-eval
for chave in $(node -e 'for (const e of require("/work/verificacao/indice/indice.json").entradas) console.log(e.chave)'); do
  anexo=$(node -e '
const e = require("/work/verificacao/indice/indice.json").entradas.find(x => x.chave === process.argv[1]);
if (e.evidencias && e.evidencias.anexo) console.log(`/work/emul/gh-releases/nathlia__govbr-resultados/${e.evidencias.release}/${e.evidencias.anexo}`);' "$chave")
  args=(--arquivo /work/verificacao --chave "$chave" --saida "/work/restaurado/$chave")
  if [ -n "$anexo" ]; then args+=(--anexo "$anexo"); fi
  npx --no-install tsx scripts/restaurar-execucao.ts "${args[@]}" || ok=1
done
echo "== tokens falsos em algum byte do arquivo, dos pacotes restaurados ou dos artefatos?"
if grep -rlaF -e "$LEITURA" -e "$ESCRITA" /work/verificacao /work/restaurado /work/emul/artefatos 2> /dev/null; then echo "VAZOU"; ok=1; else echo "nenhum"; fi
echo "== .git/config dos checkouts sem credencial?"
if grep -rlaE "extraheader|github_pat_" /work/emul/jobs/*/ws/*/.git/config 2> /dev/null; then echo "CREDENCIAL GUARDADA"; ok=1; else echo "nenhuma"; fi
echo "== gabarito no disco do job da coleta?"
if ls /work/emul/jobs/coleta/ws/govbr-eval/ground-truth*.json /work/emul/jobs/coleta/ws/govbr-eval/tela-a 2> /dev/null; then echo "PRESENTE"; ok=1; else echo "ausente (checkout esparso)"; fi
echo "== validador no disco do job da coleta (braço sem)?"
if [ -e /work/emul/jobs/coleta/ws/govbr-ds-validator ]; then echo "PRESENTE"; ok=1; else echo "ausente"; fi
echo "== resultado: emulação $emul, conferências $ok"
[ "$emul" = 0 ] && [ "$ok" = 0 ]
