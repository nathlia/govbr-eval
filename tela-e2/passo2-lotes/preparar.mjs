// Tela E2 — prepara o passo 2 (metodo.md § 4.4): herança mecânica dos julgamentos da A2 por id de unidade e
// a lista do que é julgado agora (rejulgado ou novo). Lê só tela-e2/universo.json, tela-e2/inventario.json e
// tela-a2/elegibilidade-passo2.json. Grava passo2-lotes/herdado.json e passo2-lotes/a-julgar.json.
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { passo1, hospedeirosPossiveis } from "./preparar-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const ler = p => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const U = ler("tela-e2/universo.json").unidades;
const inv = ler("tela-e2/inventario.json");
const A2 = ler("tela-a2/elegibilidade-passo2.json").regras;

const INTRINSECOS = new Set(["forca", "nao-normativa", "sem-medicao", "escopo", "conflito"]);

const pool = U.filter(u => passo1(u, inv) === null);
const noPool = new Set(pool.map(u => u.id));
const herdado = {}, aJulgar = [];
const conta = { pool: pool.length, herdadas: {}, aJulgar: {} };
for (const u of pool) {
  const j = A2[u.id];
  const base = j ? (j.aceita ? "aceita" : (j.motivo ?? "").split(":")[0]) : "sem-julgamento-a2";
  let herda = false;
  if (j && !j.aceita && INTRINSECOS.has(base)) herda = true;
  if (j && !j.aceita && base === "duplicada" && noPool.has(j.motivo.slice(10))) herda = true;
  if (herda) {
    herdado[u.id] = { ...j, heranca: "a2" };
    conta.herdadas[base] = (conta.herdadas[base] ?? 0) + 1;
  } else {
    const motivo = base === "duplicada" ? "duplicada-alvo-fora" : base;
    aJulgar.push({ id: u.id, componente: u.componente, arquivo: u.fonte.arquivo, secao: u.secao, texto: u.texto, contexto: u.contexto, antecedente: u.antecedente, forca: u.forca, marcador: u.marcador, hospedeirosPossiveis: hospedeirosPossiveis(u, inv), a2: j ?? null, porque: motivo });
    conta.aJulgar[motivo] = (conta.aJulgar[motivo] ?? 0) + 1;
  }
}
writeFileSync(join(HERE, "herdado.json"), JSON.stringify({ _meta: { regra: "tela-e2/metodo.md § 4.4", origem: "tela-a2/elegibilidade-passo2.json", ...conta }, regras: herdado }, null, 1) + "\n");
writeFileSync(join(HERE, "a-julgar.json"), JSON.stringify(aJulgar, null, 1) + "\n");
const porComp = {};
for (const x of aJulgar) porComp[x.componente ?? "-"] = (porComp[x.componente ?? "-"] ?? 0) + 1;
console.log(JSON.stringify({ ...conta, totalHerdadas: Object.keys(herdado).length, totalAJulgar: aJulgar.length, aJulgarPorComponente: porComp }, null, 1));
