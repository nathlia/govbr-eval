# Imagem do agente (T3a). Contexto montado por runner/build-images.ts.
# Mesma imagem para: processo do agente (cliente MCP / cliente Claude), ponte do navegador
# (Playwright MCP + Chromium) e sonda do harness. Cada papel roda noutro contêiner, com outra rede.
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright     NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false     DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 DISABLE_TELEMETRY=1 DISABLE_ERROR_REPORTING=1
WORKDIR /opt/runner
COPY package.json package-lock.json ./
RUN npm ci --omit=dev  && npx --no-install playwright install --with-deps chromium  && rm -rf /var/lib/apt/lists/* /root/.npm /tmp/*  && groupadd -g 10001 runner && useradd -u 10001 -g 10001 -m -d /home/runner -s /usr/sbin/nologin runner
COPY container/ ./
USER 10001:10001
CMD ["node", "/opt/runner/fake-agent.mjs"]
