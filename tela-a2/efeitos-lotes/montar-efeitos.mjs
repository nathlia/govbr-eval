// Monta tela-a2/efeitos.json (Revisão Codex 2, bloqueio 3) a partir das declarações por lote
// (efeitos-lotes/lote-*.json, agentes com o mesmo brief e o vocabulário fechado VOCABULARIO.json) e das
// declarações do coordenador para as variantes que a revisão 2 criou ou reescreveu.
// Guarda só as regras aceitas em tela-a2/elegibilidade.json. Uso: node tela-a2/efeitos-lotes/montar-efeitos.mjs
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { couplings } from "../passo2-lotes/revisao-2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const elig = JSON.parse(readFileSync(join(ROOT, "tela-a2/elegibilidade.json"), "utf8")).regras.filter(r => r.passo2 === "aceita");
const p2 = JSON.parse(readFileSync(join(ROOT, "tela-a2/elegibilidade-passo2.json"), "utf8")).regras;
const lotes = {};
for (const f of readdirSync(HERE).filter(x => /^lote-\d+\.json$/.test(x)).sort()) Object.assign(lotes, JSON.parse(readFileSync(join(HERE, f), "utf8")));

const botao = (nota) => ({ porHospedeiro: {
  "msg-pendencia": { toca: ["$:fechar"], remove: [], cascata: [], estado: null, nota: `botão Fechar: ${nota}` },
  "msg-retorno": { toca: ["$:fechar"], remove: [], cascata: [], estado: null, nota: `botão Fechar: ${nota}` },
  "tip-prazo": { toca: ["$:gatilho"], remove: [], cascata: [], estado: null, nota: `gatilho do tooltip: ${nota}` },
  "tip-protocolo": { toca: ["$:gatilho"], remove: [], cascata: [], estado: null, nota: `gatilho do tooltip: ${nota}` },
  "sel-tipo-documento": { toca: ["$:gatilho"], remove: [], cascata: [], estado: null, nota: `gatilho do select: ${nota}` },
} });
/** Declarações do coordenador (revisão 2): substituem as do lote para estas regras. */
const COORD = {
  "a2-fee39db9eda4": { variantes: { "nome-so-no-texto-oculto": botao("sem title e sem aria-label; nome pelo texto oculto") } },
  "a2-615adba6e634": { variantes: { "filho-com-grupo-errado": { toca: ["swt-aviso-sms:input", "$:input", "pagina:scripts"], remove: [], cascata: [], estado: null, nota: "data-child do SMS diferente do data-parent + script próprio (arquivo .js) que refaz o vínculo; comportamento do grupo igual ao conforme" } } },
  "a2-22240b8959ba": { variantes: { "recarga-periodica": { toca: ["$:head"], remove: [], cascata: [], estado: "recarga", nota: "meta refresh de 300 s sem url no head: a página se recarrega sozinha" } } },
  "a2-31b4a3f89649": { variantes: { "redireciona-para-outra-pagina": { toca: ["$:head"], remove: [], cascata: [], estado: "navegacao", nota: "meta refresh 600;url=meus-requerimentos.html no head: vai sozinha para outra página" } } },
};
const regras = {};
for (const r of elig) {
  const src = COORD[r.id] ?? lotes[r.id];
  if (!src) throw new Error(`sem declaração de efeitos: ${r.id}`);
  const variantes = {};
  for (const v of r.variantes) { const d = (COORD[r.id] ?? lotes[r.id]).variantes?.[v.id]; if (!d) throw new Error(`sem efeito: ${r.id}/${v.id}`); variantes[v.id] = d; }
  const alternativas = {};
  for (const a of r.alternativasValidas) { const d = src.alternativas?.[a.id]; if (!d) throw new Error(`sem efeito: ${r.id}/alt:${a.id}`); alternativas[a.id] = d; }
  regras[r.id] = { variantes, ...(r.alternativasValidas.length ? { alternativas } : {}), declaradoPor: COORD[r.id] ? "coordenador (revisão 2)" : "lote" };
}
const cs = couplings();
const concorrentes = cs.filter(c => c.classe === "mesmo-observavel").map(({ regra, variante, viola, razao }) => ({ regra, variante, normaConcorrente: viola, razao }));
const acopladas = Object.entries(p2).flatMap(([id, e]) => (e.variantesAcopladas ?? []).map(a => ({ regra: id, ...a })));
const saiu = Object.entries(p2).filter(([, e]) => !e.aceita && e.motivo === "acoplada" && /^Revisão 2 \(isolamento\)/.test(e.justificativa ?? "")).map(([id]) => id);
writeFileSync(join(ROOT, "tela-a2/efeitos.json"), JSON.stringify({
  _meta: {
    revisao: "Revisão Codex 2 (NAT-110, 2026-10-30), bloqueio 3",
    vocabulario: "tela-a2/efeitos-lotes/VOCABULARIO.json",
    origem: "efeitos-lotes/lote-1..6.json (agentes com o brief e o vocabulário fechado, validados por validar-lote.mjs) + declarações do coordenador para as variantes criadas ou reescritas na revisão 2",
    criterioAcoplamento: "distinto = a mutação deixa não conforme outro observável (outro nó, propriedade, estado ou comportamento) → a variante sai nesses hospedeiros (revisao-2.mjs); mesmo-observavel = o mesmo fato citável por outra frase → não exclui, vai em normasConcorrentes para a referência; rejeitado = não é consequência necessária.",
    contagem: { regrasComEfeitos: Object.keys(regras).length, acoplamentosSuspeitos: cs.length, distinto: cs.filter(c => c.classe === "distinto").length, mesmoObservavel: concorrentes.length, rejeitado: cs.filter(c => c.classe === "rejeitado").length, variantesAcopladasRetiradas: acopladas.length, regrasQueSairamPorAcoplamento: saiu.length },
  },
  regras,
  variantesAcopladas: acopladas,
  regrasQueSairamPorAcoplamento: saiu,
  normasConcorrentes: concorrentes,
}, null, 1) + "\n");
console.log("efeitos.json:", Object.keys(regras).length, "regras;", acopladas.length, "variantes acopladas;", saiu.length, "regras saíram;", concorrentes.length, "normas concorrentes");
