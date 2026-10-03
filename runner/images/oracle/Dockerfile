# Oráculo (braço com, T3a): a imagem do agente + a distribuição fixada do govbr-ds-validator
# (dist/, data/, package.json, package-lock.json copiados do repositório, sem modificá-lo).
ARG AGENT_IMAGE
FROM ${AGENT_IMAGE}
USER root
WORKDIR /opt/oracle
COPY validator/ ./
RUN npm ci --omit=dev --ignore-scripts \
 && node node_modules/playwright/cli.js install chromium \
 && rm -rf /root/.npm /tmp/*
USER 10001:10001
WORKDIR /opt/runner
