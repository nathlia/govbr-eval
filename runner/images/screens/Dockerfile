# Telas (T3a): o pacote govbr-telas (server.mjs, site/, site-manifest.json) servido em :3300.
# O servidor recusa partir se um byte do site divergir do manifesto.
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
WORKDIR /srv/telas
COPY telas/ ./
USER 10001:10001
EXPOSE 3300
CMD ["node", "/srv/telas/server.mjs", "--host", "0.0.0.0", "--port", "3300"]
