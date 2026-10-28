# Oráculo (braço com, T3a): a imagem do agente + a distribuição fixada do govbr-ds-validator
# (dist/, data/, package.json, package-lock.json copiados do repositório, sem modificá-lo).
# >= 3.2.0: só busca léxica padrão — data/ sem pesos de modelo nem vetores densos, e nenhum
# GOVBR_RETRIEVAL_* no ambiente (runner/build-images.ts confere depois do build).
ARG AGENT_IMAGE
FROM ${AGENT_IMAGE}
USER root
WORKDIR /opt/oracle
COPY validator/ ./
# >= 3.0.0: TODAS as dependências do lockfile, inclusive as de desenvolvimento. O @govbr-ds/core 3.7.0 é
# devDependency, mas o servidor o lê em tempo de execução (componentProvenance:pagination, a base de
# `basis` da orientação curada): sem ele, os perfis evaluation/normative/full não sobem ("guidance
# inválida"). Com --omit=dev a imagem 2.14.x subia, mas sem a fonte do core (runtimeSource unavailable).
RUN npm ci --ignore-scripts \
 && node node_modules/playwright/cli.js install chromium \
 && rm -rf /root/.npm /tmp/*
USER 10001:10001
WORKDIR /opt/runner
