// Tela E2 — compara a segunda classificação DS/G (classe/lote-*.json, agentes novos, sem ver a primeira) com a classe
// do passo 2 e grava tela-e2/classe-reavaliada.json { porCelula: { <célula>: { classe1, classe2, categorias2, concorda } } }.
// A exclusão 'classe-em-desacordo' é aplicada pelo sortear-sementes.mjs. Uso: node tela-e2/classe/montar-classe.mjs
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { montarCelulas } from "../sortear-sementes.mjs";
import { validarClasse } from "./validar-classe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const ler = p => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const params = ler("tela-e2/parametros.json");
const { celulas } = montarCelulas({ elegibilidade: ler("tela-e2/elegibilidade.json"), exclusoes: ler("tela-e2/exclusoes.json") }, { ...params, motivosDeExclusao: params.motivosDeExclusao.filter(m => m !== "classe-em-desacordo") });
const entradas = new Map(), segunda = {}, errs = [];
for (const f of readdirSync(join(HERE, "entradas")).filter(f => /^lote-\d+\.json$/.test(f))) {
  const ent = JSON.parse(readFileSync(join(HERE, "entradas", f), "utf8"));
  const sai = JSON.parse(readFileSync(join(HERE, f), "utf8"));
  for (const e of ent) { entradas.set(e.celula, e); validarClasse(e, sai[e.celula], errs); segunda[e.celula] = sai[e.celula]; }
}
for (const c of celulas) if (!segunda[c.id]) errs.push(`${c.id}: célula elegível sem segunda classificação`);
if (errs.length) { console.error(errs.slice(0, 40).join("\n")); process.exit(1); }
const porCelula = {}, conta = { total: 0, concordam: 0, DS: { primeira: 0, concordam: 0, viraramG: 0 }, G: { primeira: 0, concordam: 0, viraramDS: 0 } };
for (const c of celulas) {
  const s = segunda[c.id];
  const concorda = s.classe === c.classe;
  porCelula[c.id] = { classe1: c.classe, classe2: s.classe, categorias2: s.categorias, concorda };
  conta.total++; if (concorda) conta.concordam++;
  conta[c.classe].primeira++;
  if (concorda) conta[c.classe].concordam++; else conta[c.classe][c.classe === "DS" ? "viraramG" : "viraramDS"]++;
}
writeFileSync(join(ROOT, "tela-e2/classe-reavaliada.json"), JSON.stringify({ _meta: { regra: "item A do coordenador (antes do selo): célula fica só se as duas classificações coincidem; desacordo → exclusão 'classe-em-desacordo', sem reatribuição", criterios: "tela-e2/classe/CRITERIOS-CLASSE.md", contagem: conta }, porCelula }, null, 1) + "\n");
console.log(JSON.stringify(conta));
