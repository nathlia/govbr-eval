/**
 * Serve o dist/ do corpus com as regras da superfície para a árvore pnip/ (comum.mjs › servir) numa
 * porta fixa, para `APP_URL=http://127.0.0.1:<porta> npm run conferir:referencia -- --tela vistorias`.
 * Uso: node tela-b/vistorias/servir.mjs [porta=3217]   (nunca 3100/4100-4102)
 */
import { createServer } from "http";
import { exigirManifesto, servir } from "./comum.mjs";
exigirManifesto();
const porta = Number(process.argv[2] ?? 3217);
if ([3100, 4100, 4101, 4102].includes(porta)) throw new Error("porta reservada à superfície de medida");
const { servidor } = await servir();
servidor.close();
const s = createServer((req, res) => servidor.emit("request", req, res));
s.listen(porta, "127.0.0.1", () => console.log(`servindo dist/ (pnip/ SPA) em http://127.0.0.1:${porta}`));
