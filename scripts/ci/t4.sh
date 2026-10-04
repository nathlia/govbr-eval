#!/usr/bin/env bash
# Passos do workflow `execucao-isolada` (T4). Cada `run:` do YAML chama UMA fase daqui; as entradas
# chegam por variável de ambiente (nunca interpoladas no shell pelo YAML) e foram validadas pela fase
# `entradas` do job `preparar`. O emulador local (scripts/ci/emular-workflow.ts) roda estas mesmas
# fases, na ordem do YAML, a partir de clones limpos.
#
# Layout: $WS (= $GITHUB_WORKSPACE) com govbr-eval, govbr-telas, govbr-ds-validator, govbr-corpus e
# govbr-resultados lado a lado — o mesmo layout irmão que o instrumento espera (TCC_ROOT = $WS).
set -euo pipefail

fase="${1:?fase}"
WS="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE}"
TMP="${RUNNER_TEMP:?RUNNER_TEMP}"
EVAL="$WS/govbr-eval"
tsx() { (cd "$EVAL" && npx --no-install tsx "$@"); }
saida() { if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1" >> "$GITHUB_OUTPUT"; fi; echo "$1"; }

case "$fase" in
  instalar-eval)
    # dependências travadas; sem scripts de instalação (o navegador do host só é baixado onde é usado)
    (cd "$EVAL" && npm ci --ignore-scripts --no-audit --no-fund)
    ;;
  entradas)
    tsx scripts/pipeline-t4.ts entradas
    ;;
  compilar-validador)
    (cd "$WS/govbr-ds-validator" && npm ci --ignore-scripts --no-audit --no-fund && npm run build)
    ;;
  manifesto)
    mkdir -p "$TMP/manifesto"
    args=(build --out "$TMP/manifesto/manifesto-coleta.json" --tela "$TELA" --campanha "$CAMPANHA" --slot "$SLOT" --par "$PAR"
      --braco "$BRACO" --modo "$MODO" --limite-min "$LIMITE_MIN" --tentativa "$TENTATIVA" --repeticao "$REPETICAO")
    if [ "$MODO" = "real" ]; then args+=(--modelo "$MODELO" --esforco "$ESFORCO"); fi
    tsx scripts/manifesto-coleta-isolada.ts "${args[@]}"
    corpus=$(node -e 'const m=require(process.argv[1]);process.stdout.write(String(m.origin?.corpus?.commit??""))' "$WS/govbr-telas/site-manifest.json")
    saida "corpus_sha=$corpus"
    ;;
  imagens)
    # Imagens construídas nesta VM (ids não se reproduzem entre máquinas); as VERSÕES medidas de dentro
    # delas têm de ser as travadas no lock commitado. O lock desta VM fica fora do checkout.
    export GOVBR_RUNNER_LOCK="$TMP/lock/images.lock.json"
    mkdir -p "$TMP/lock"
    (cd "$EVAL" && npm run --silent runner:imagens -- --so "$IMAGENS")
    tsx scripts/pipeline-t4.ts conferir-imagens --travado runner/images.lock.json --construido "$GOVBR_RUNNER_LOCK" --imagens "$IMAGENS"
    ;;
  conferir-ambiente)
    # antes da coleta: nenhum token de GitHub/publicação no passo nem guardado nos checkouts
    tsx scripts/pipeline-t4.ts conferir-ambiente --checkouts "$WS/govbr-eval,$WS/govbr-telas,$WS/govbr-ds-validator"
    ;;
  coleta)
    export GOVBR_RUNNER_LOCK="$TMP/lock/images.lock.json"
    mkdir -p "$TMP/pacote"
    args=(--tela "$TELA" --braco "$BRACO" --agente "$AGENTE" --egress "$EGRESS" --modelo "$MODELO" --esforco "$ESFORCO"
      --limite-seg "$LIMITE_SEG" --campanha "$CAMPANHA" --slot "$SLOT" --par "$PAR" --tentativa "$TENTATIVA" --repeticao "$REPETICAO"
      --saida "$TMP/pacote/execucao")
    if [ "$MODO" = "real" ]; then args+=(--permitir-modelo); fi
    if [ "$MODO" = "duble" ]; then args+=(--cenario honesto); fi
    set +e
    (cd "$EVAL" && npx --no-install tsx runner/run-once.ts "${args[@]}")
    codigo=$?
    set -e
    saida "codigo=$codigo"
    # 0 passed · 3 failed/interrupted · 4 not-run: resultados a arquivar, não erro do pipeline.
    # 1 erro de uso · 2 pacote inválido: o job falha (o pacote, se houver, sobe e é arquivado mesmo assim).
    case "$codigo" in 0|3|4) exit 0 ;; *) exit "$codigo" ;; esac
    ;;
  conferir-ambiente-pacote)
    cred="nenhuma"
    if [ "$MODO" = "real" ]; then cred="CLAUDE_CODE_OAUTH_TOKEN"; elif [ "$MODO" = "duble" ]; then cred="*"; fi
    tsx scripts/pipeline-t4.ts conferir-ambiente --pacote "$TMP/pacote/execucao" --credencial-permitida "$cred"
    ;;
  resumo-coleta)
    tsx scripts/pipeline-t4.ts resumo-coleta --pacote "$TMP/pacote/execucao"
    ;;
  instalar-navegador)
    (cd "$EVAL" && npx --no-install playwright install --with-deps chromium)
    ;;
  linha-de-base)
    mkdir -p "$TMP/lb-bruta"
    node "$WS/govbr-telas/server.mjs" --port 3300 --host 127.0.0.1 > "$TMP/lb-bruta/servidor.log" 2>&1 &
    servidor=$!
    trap 'kill $servidor 2>/dev/null || true' EXIT
    for _ in $(seq 1 30); do
      if node -e 'fetch("http://127.0.0.1:3300/").then(()=>process.exit(0),()=>process.exit(1))' 2>/dev/null; then break; fi
      sleep 1
    done
    set +e
    (cd "$EVAL" && APP_URL="http://127.0.0.1:3300" npx --no-install tsx scripts/run-baselines-flow.ts --tela "$TELA" \
      --out "$TMP/lb-bruta/bruta.json" --collection-manifest "$TMP/manifesto/manifesto-coleta.json" --site-manifest "$WS/govbr-telas/site-manifest.json")
    codigo=$?
    set -e
    saida "codigo=$codigo"
    if [ ! -f "$TMP/lb-bruta/bruta.json" ]; then echo "linha de base não gravou o bruto"; exit 1; fi
    args=(registrar-linha-de-base --bruta "$TMP/lb-bruta/bruta.json" --manifesto "$TMP/manifesto/manifesto-coleta.json" --saida "$TMP/linha-de-base")
    if [ -n "${REFAZER_DE:-}" ]; then args+=(--rerun-of "$REFAZER_DE" --motivo "$MOTIVO_REFAZER"); fi
    set +e
    tsx scripts/arquivar-execucao.ts "${args[@]}"
    registro=$?
    set -e
    # 3 = registrada mas não utilizável (motivo em problemas.json): sobe e é arquivada mesmo assim
    case "$registro" in 0|3) exit 0 ;; *) exit "$registro" ;; esac
    ;;
  resumo-linha-de-base)
    tsx scripts/pipeline-t4.ts resumo-linha-de-base --dir "$TMP/linha-de-base"
    ;;
  arquivar)
    args=(execucao --arquivo "$WS/govbr-resultados" --evidencias-saida "$TMP/anexos" --saida-json "$TMP/arquivamento.json" --segredos GOVBR_RESULTADOS_TOKEN)
    [ -f "$TMP/entrada/manifesto/manifesto-coleta.json" ] && args+=(--manifesto "$TMP/entrada/manifesto/manifesto-coleta.json")
    [ -f "$TMP/entrada/pacote/execucao/run.json" ] && args+=(--pacote "$TMP/entrada/pacote/execucao")
    [ -f "$TMP/entrada/linha-de-base/baseline.json" ] && args+=(--linha-de-base "$TMP/entrada/linha-de-base")
    # T8a.1: o site congelado vai para o arquivo por conteúdo (conferido contra o manifesto de coleta)
    [ -f "$WS/govbr-telas/site-manifest.json" ] && args+=(--telas "$WS/govbr-telas")
    tsx scripts/arquivar-execucao.ts "${args[@]}"
    ;;
  anexar)
    # Fase fina: anexo na Release (D-67), conferido baixando de volta. Sem --clobber: nome repetido é recusado;
    # numa repetição do job, o anexo já existente só é aceito se o sha256 for o mesmo.
    export GH_TOKEN="${GOVBR_RESULTADOS_TOKEN:?}"
    repo="${REPO_RESULTADOS:?}"
    node -e 'const s=require(process.argv[1]);for(const g of s.gravacoes)if(g.anexoLocal)console.log([g.chave,g.release,g.anexoLocal].join("\t"))' "$TMP/arquivamento.json" |
    while IFS=$'\t' read -r chave tag anexo; do
      nome=$(basename "$anexo")
      if ! gh release view "$tag" --repo "$repo" > /dev/null 2>&1; then
        gh release create "$tag" --repo "$repo" --title "$tag" --notes "Pacotes de evidências das execuções (anexos com sha256 no INDICE.md). D-67." || true
      fi
      gh release upload "$tag" "$anexo" --repo "$repo" || echo "upload recusado ou falhou: conferindo o que está na Release"
      rm -rf "$TMP/conferencia" && mkdir -p "$TMP/conferencia"
      if gh release download "$tag" --repo "$repo" --pattern "$nome" --dir "$TMP/conferencia"; then
        tsx scripts/arquivar-execucao.ts confirmar-evidencias --arquivo "$WS/govbr-resultados" --chave "$chave" \
          --baixado "$TMP/conferencia/$nome" --url "https://github.com/$repo/releases/download/$tag/$nome" || true
      else
        tsx scripts/arquivar-execucao.ts confirmar-evidencias --arquivo "$WS/govbr-resultados" --chave "$chave" --falhou "download de conferência falhou" || true
      fi
    done
    ;;
  publicar)
    # Commit dos caminhos imutáveis; o índice (projeção) é refeito depois de cada rebase. Corrida com
    # outro disparo: descarta só a projeção e tenta de novo, nunca reescreve uma entrada.
    cd "$WS/govbr-resultados"
    git config user.name "govbr-arquivo"
    git config user.email "govbr-arquivo@users.noreply.github.com"
    auth=()
    if [ -n "${GOVBR_RESULTADOS_TOKEN:-}" ]; then
      auth=(-c "http.https://github.com/.extraheader=AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GOVBR_RESULTADOS_TOKEN" | base64 -w0)")
    fi
    remoto="${GOVBR_RESULTADOS_REMOTO:-origin}"
    git checkout -- indice/indice.json INDICE.md 2>/dev/null || rm -f indice/indice.json INDICE.md
    for d in .gitattributes execucoes ensaios linhas-de-base coletas snapshots campanhas sites indice/entradas; do
      if [ -e "$d" ]; then git add -A -- "$d"; fi
    done
    if git diff --cached --quiet; then echo "nada novo para arquivar"; exit 0; fi
    git commit -q -m "arquivo: $(git diff --cached --name-only -- indice/entradas | xargs -r -n1 basename | sed 's/\.json$//' | paste -sd ' ' -)"
    for tentativa in 1 2 3 4 5; do
      git "${auth[@]}" pull -q --rebase "$remoto" main
      (cd "$EVAL" && npx --no-install tsx scripts/arquivar-execucao.ts indice --arquivo "$WS/govbr-resultados")
      git add indice/indice.json INDICE.md
      indice=0
      if ! git diff --cached --quiet; then git commit -q -m "índice"; indice=1; fi
      if git "${auth[@]}" push -q "$remoto" HEAD:main; then
        git "${auth[@]}" fetch -q "$remoto" main
        if git diff --quiet HEAD FETCH_HEAD; then echo "publicado e conferido no remoto (tentativa $tentativa)"; exit 0; fi
        echo "o remoto não tem o que foi enviado"; exit 1
      fi
      # corrida com outro disparo: descarta só a projeção do índice; os dados sobem de novo depois do rebase
      if [ "$indice" = 1 ]; then git reset -q --hard HEAD~1; fi
      sleep $((tentativa * 3))
    done
    echo "push falhou 5 vezes"; exit 1
    ;;
  resumo-arquivo)
    args=(--saida-json "$TMP/arquivamento.json" --arquivo "$WS/govbr-resultados")
    [ -f "$TMP/entrada/pacote/execucao/run.json" ] && args+=(--pacote "$TMP/entrada/pacote/execucao")
    tsx scripts/pipeline-t4.ts resumo-arquivo "${args[@]}"
    ;;
  *)
    echo "fase desconhecida: $fase" >&2; exit 2 ;;
esac
