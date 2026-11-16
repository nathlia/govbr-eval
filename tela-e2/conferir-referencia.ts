/**
 * Tela E2 — roda a conferência da referência do repo (scripts/check-reference.ts, a mesma de `npm run conferir:referencia`)
 * sem tocar `telas.json`: a tela `cadastro-pais` é declarada só em memória, apontando para a referência indicada.
 * O registro em `telas.json` é passo posterior (bancada da E).
 *
 * Uso: APP_URL=http://127.0.0.1:3219 npx tsx tela-e2/conferir-referencia.ts [arquivo da referência, relativo à raiz]
 *      (padrão tela-e2/referencia-candidata.json; dist servido por `node tela-e2/servir.mjs 3219`)
 */
import { TELAS } from "../scripts/telas";

const referencia = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "tela-e2/referencia-candidata.json";
if (TELAS["cadastro-pais"]) throw new Error("telas.json já declara cadastro-pais: use npm run conferir:referencia");
TELAS["cadastro-pais"] = {
  nome: "cadastro-pais",
  titulo: "tela E2 — Cadastrar país importador (declarada só em memória para a conferência)",
  entry: "cadastro-pais.html",
  reference: referencia,
  sources: [],
  runs: { com: "", sem: "", smoke: "" },
  review: "",
  isolamento: { texto: "Cadastrar País Importador", alvo: "#main-content", externos: [] },
} as unknown as (typeof TELAS)[string];
process.argv.splice(2, process.argv.length, "--tela", "cadastro-pais");
await import("../scripts/check-reference.ts");
