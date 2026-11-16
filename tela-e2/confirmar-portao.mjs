/**
 * Tela E2 — confirmação do portão (protocolo § 3.7) sobre a referência a congelar, depois das decisões de 16/11:
 * specs DS em vigor na referência × (1) confirmadas às cegas (portao.json, regra combinada fixada em 14/11),
 * (2) observável violado no estado declarado, alcançado pelo caminho aditivo do setup (conferencia-aditiva-2026-11-16.json),
 * (3) id sorteado presente, com o mesmo texto, na base que o oráculo congelado serve (conferencia-ids-base.json).
 * Uso: node tela-e2/confirmar-portao.mjs [referência=tela-e2/referencia-candidata.json] → portao-confirmacao-2026-11-16.json
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = f => JSON.parse(readFileSync(join(AQUI, "..", f), "utf8"));
const refArq = process.argv[2] ?? "tela-e2/referencia-candidata.json";
const ref = raiz(refArq), portao = raiz("tela-e2/portao.json"), ids = raiz("tela-e2/conferencia-ids-base.json"), adit = raiz("tela-e2/conferencia-aditiva-2026-11-16.json");
const estadosDecl = ref._meta.states.map(s => s.id);
const linhas = ref.violations.filter(v => ref._meta.classes[v.id] === "DS").map(v => {
  const ps = ref._meta.porSpec[v.id];
  const p = portao.porSpec.find(l => l.celula === ps.celula);
  const est = v.state === "sempre" ? estadosDecl : [v.state];
  const chaves = Object.keys(adit.ok).filter(k => k.includes(` ${v.id} `) && est.some(e => k.startsWith(`${e} `)));
  const idSorteado = ps.idsBase[0];
  const linhaId = ids.linhas.find(l => l.spec === v.id && l.id === idSorteado);
  const c1 = p.confirmacaoCega === true, c2 = chaves.length > 0 && chaves.every(k => adit.ok[k]), c3 = linhaId?.resultado === "casa";
  return { spec: v.id, estado: v.state, c1_confirmadaAsCegas: c1, via: p.confirmadaPelaPrimeira ? "1a-auditoria" : p.confirmadaPelaRemedida ? "remedida" : null, c2_estadoAlcancavel: c2, medidasAditivas: chaves.length, c3_clausulaNaBaseServida: c3, conta: c1 && c2 && c3 };
});
const n = linhas.filter(l => l.conta).length;
const out = { _meta: { data: "2026-11-16", referencia: refArq, limiar: portao.limiar }, specsDS: linhas.length, n, passa: n >= portao.limiar, folga: n - portao.limiar, n_soPrimeiraAuditoria: portao.n_soPrimeiraAuditoria, linhas };
writeFileSync(join(AQUI, "portao-confirmacao-2026-11-16.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`DS em vigor ${linhas.length}; contam ${n} (limiar ${portao.limiar}, folga ${n - portao.limiar}); só 1ª auditoria ${portao.n_soPrimeiraAuditoria}; ` + linhas.map(l => `${l.spec}:${l.conta ? "sim" : "não"}`).join(" "));
process.exit(out.passa ? 0 : 1);
