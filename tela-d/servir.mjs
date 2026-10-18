/**
 * Serve a árvore congelada pnip-d/ (tela-d/comum.mjs › servir, conferida contra o manifesto) numa porta
 * fixa, para `APP_URL=http://127.0.0.1:<porta> npm run conferir:referencia -- --tela processos`.
 * Uso: node tela-d/servir.mjs [porta=3218]   (nunca 3100/4100-4102)
 */
import { createServer } from "http";
import { exigirBytes, servir } from "./comum.mjs";
const bytes = exigirBytes();
const porta = Number(process.argv[2] ?? 3218);
if ([3100, 4100, 4101, 4102].includes(porta)) throw new Error("porta reservada à superfície de medida");
const { servidor } = await servir();
servidor.close();
const s = createServer((req, res) => servidor.emit("request", req, res));
s.listen(porta, "127.0.0.1", () => console.log(`servindo dist/${bytes.modo === "congelado" ? "" : "(candidato) "}pnip-d/ (SPA) em http://127.0.0.1:${porta} · lista ${bytes.sha256Lista}`));
