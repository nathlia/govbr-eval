# Coletor (T3a): uma submissão por run id, schema findings.v1 ou findings.v2 (NAT-81, escolhido pelo harness), recibo mínimo.
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
WORKDIR /opt/collector
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && rm -rf /root/.npm
COPY collector.mjs ./
COPY schemas/ ./schemas/
USER 10001:10001
EXPOSE 8080
CMD ["node", "/opt/collector/collector.mjs"]
