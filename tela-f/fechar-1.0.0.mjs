/**
 * Tela F — fechamento da referência 1.0.0 (26/11/2026). Roda DEPOIS de montar-referencia-rascunho.mjs.
 *  1. confirmação cega: as duas auditorias × chave (tela-f/auditoria-cega/) → `_meta.confirmacaoCega` e porSpec;
 *  2. NAT-71: classificadores 1 e 2 = a dupla classificação; onde discordam em classe ou nível, o 3 (cego, classificou
 *     as 12 sem saber quais estavam em disputa) desempata por maioria; os três diferentes → `sem-maioria`. As 13
 *     naturais herdam (classes-nat71/heranca-naturais.json). → classes-nat71/classes-finais.json + comparacao.md;
 *  3. tira o RASCUNHO e grava o `_meta` final na referência (escolha, estratos, controles, estados, ids, confirmação,
 *     sem id mapeado, classes).
 * Uso: node tela-f/fechar-1.0.0.mjs
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const sha = b => createHash("sha256").update(b).digest("hex");
const J = p => JSON.parse(readFileSync(join(AQUI, p), "utf8"));
const REF = join(RAIZ, "ground-truth-processos-f.json");
const ref = JSON.parse(readFileSync(REF, "utf8"));
const sem = ref._meta.estratos.semeado.specs;

// ---------- 1. confirmação cega ----------
const chave = J("auditoria-cega/chave.json").afirmacoes;
const aud = [1, 2].map(n => J(`auditoria-cega/auditor-${n}/veredictos.json`));
const porAfirmacao = id => aud.map(a => a.find(v => v.claimId === id));
const confirmacao = {}, iscas = [];
for (const c of chave) {
  const [x, y] = porAfirmacao(c.id);
  if (c.tipo === "semeada") {
    const ok = v => v?.veredicto === "verdadeira" && v?.violaClausula === "sim";
    confirmacao[c.origem] = { afirmacao: c.id, auditor1: { veredicto: x.veredicto, violaClausula: x.violaClausula, clausulaConfere: x.clausulaConfere },
      auditor2: { veredicto: y.veredicto, violaClausula: y.violaClausula, clausulaConfere: y.clausulaConfere }, confirmadas: (ok(x) ? 1 : 0) + (ok(y) ? 1 : 0) };
  } else iscas.push({ afirmacao: c.id, isca: c.origem, auditor1: x.veredicto, auditor2: y.veredicto, falsaNosDois: x.veredicto === "falsa" && y.veredicto === "falsa" });
}
const conf = { ambos: sem.filter(s => confirmacao[s].confirmadas === 2).length, um: sem.filter(s => confirmacao[s].confirmadas === 1).length, nenhum: sem.filter(s => confirmacao[s].confirmadas === 0).length };

// ---------- 2. NAT-71 ----------
const cl = [1, 2, 3].map(n => J(`classes-nat71/classificador-${n}.json`));
const her = J("classes-nat71/heranca-naturais.json");
const linhas = [], finais = [];
let acordoClasse = 0, acordoNivel = 0, desempates = 0, semMaioria = 0;
const maioria = vs => { const c = {}; for (const v of vs) c[v] = (c[v] ?? 0) + 1; const m = Object.entries(c).find(([, n]) => n >= 2); return m ? m[0] : null; };
for (const id of sem) {
  const [a, b, t] = cl.map(c => c.specs.find(s => s.id === id));
  const iguaisC = a.classe === b.classe, iguaisN = a.automatizabilidade === b.automatizabilidade;
  acordoClasse += iguaisC; acordoNivel += iguaisN;
  const classe = iguaisC ? a.classe : maioria([a.classe, b.classe, t.classe]);
  const nivel = iguaisN ? a.automatizabilidade : maioria([a.automatizabilidade, b.automatizabilidade, t.automatizabilidade]);
  const usouT = !iguaisC || !iguaisN;
  if (usouT) desempates++;
  const sm = (classe === null) || (nivel === null);
  if (sm) semMaioria++;
  linhas.push({ id, a, b, t, iguaisC, iguaisN, classe, nivel, usouT });
  finais.push({ id, classe: classe ?? "sem-maioria", automatizabilidade: nivel ?? "sem-maioria", limitrofe: usouT ? !!(a.limitrofe || b.limitrofe || t.limitrofe) : !!(a.limitrofe || b.limitrofe),
    origem: sm ? "sem-maioria" : usouT ? "desempate-classificador-3" : "acordo",
    motivo: usouT ? `Classificadores 1 e 2 discordaram (${!iguaisC ? `classe ${a.classe} × ${b.classe}` : ""}${!iguaisC && !iguaisN ? "; " : ""}${!iguaisN ? `nível ${a.automatizabilidade} × ${b.automatizabilidade}` : ""}); o classificador 3, cego à disputa, deu ${t.classe}/${t.automatizabilidade}: maioria. Motivos em classificador-1/2/3.json.`
      : "Os dois classificadores cegos deram a mesma classe e o mesmo nível; motivos em classificador-1.json e classificador-2.json." });
}
for (const h of her.specs) finais.push({ id: h.id, classe: h.classe, automatizabilidade: h.automatizabilidade, limitrofe: h.limitrofe, origem: "herdada-da-D", motivo: `Spec idêntica byte a byte à da referência 1.1.0 da D; ${h.origem}.` });
const conta = k => finais.reduce((o, s) => ((o[s[k]] = (o[s[k]] ?? 0) + 1), o), {});

// ---------- 3. referência final ----------
const comp = J("composicao.json");
const ids = J("conferencia-ids-base.json")._meta.contagens;
const conformes = J("conformes.json");
const m = ref._meta;
m.status = "1.0.0 congelada — 2026-11-26. Tela F (estudo de seguimento, adendo de 26/11): 25 specs (12 semeadas + 13 naturais da D), 77 unidades, 4 paradas em 3 segmentos (paradas nos segmentos 0 e 2), 10 controles conformes. Registro em tela-f/congelamento-1.0.0.md.";
m.version_note = "1.0.0 (2026-11-26): estrato semeado F-01…F-12 escolhido à mão por agente cego ao oráculo (seletor), conferido por um segundo agente cego (conferente), filtrado e composto mecanicamente pelo agente da referência (tela-f/filtros.json, composicao.json) — curado, não sorteado; construído no fonte da rota (pnip-mock tela-f f8905a8; 12/12 pegaram). Estrato natural = as 13 specs da referência 1.1.0 da D, sem mudança, re-medidas na página semeada (evidência idêntica à do build sem semente).";
m.escolha = { regra: "adendo-tela-f-protocolo-2026-11-26.md § 4", seletor: "tela-f/selecao/ (24 candidatos, 6 por nível, à mão, cego ao oráculo)", conferente: "tela-f/conferencia/ (17 de 24 aprovados)", filtros: "tela-f/filtros.json (17 → 16 sobreviventes; id na base é registro, não filtro)", composicao: "tela-f/composicao.json (3 por nível + reserva 0/2/1/1)", natureza: "curada por agente cego ao oráculo e conferida por um segundo, não sorteada" };
m.estados_resumo = { paradas: m.states.length, segmentos: 3, segmentosComParada: [0, 2], nota: "2 passos navigate: segmento 1 é a passagem pela rota de vistorias, sem parada" };
m.idsNaBase = { arquivo: "tela-f/conferencia-ids-base.json", validador: "govbr-ds-validator congelado-3.7.12 (816f4ba), só id/texto/fonte", ...ids };
m.confirmacaoCega = {
  regra: "pacote neutro de 24 afirmações (as 12 semeadas como um juiz as lê + 12 iscas da mesma forma, falsas na página, medidas antes), embaralhado com semente gravada; confirmada = veredicto 'verdadeira' e violaClausula 'sim'; dois auditores cegos independentes (tela-f/auditoria-cega/)",
  pedidoSha256: J("auditoria-cega/chave.json")._meta.pedidoSha256,
  semeadas: { confirmadasPelosDois: conf.ambos, porUm: conf.um, porNenhum: conf.nenhum },
  iscas: { falsasNosDois: iscas.filter(i => i.falsaNosDois).length, verdadeiraEmAlgum: iscas.filter(i => !i.falsaNosDois).length },
  descricoesReescritas: 0,
};
m.porSpec = Object.fromEntries(sem.map(id => [id, { confirmacaoCega: confirmacao[id], construcao: "pegou (tela-f/construcao/conferencia-construcao.json)",
  aceitacao: ref.violations.find(v => v.id === id).acceptance ? "sustenta (conferir-referencia-1.0.0.log)" : "nao-implementado (critério em tela-f/criterios-de-julgamento-sem-predicado.json)" }]));
m.classes = { nota: "NAT-71 (protocolo NAT-78 § 5.3): 12 semeadas por dois classificadores cegos, desempate pelo 3º cego por maioria; 13 naturais herdadas da D (spec idêntica)", arquivo: "tela-f/classes-nat71/classes-finais.json", d156: "tela-f/classes-d156-1.0.0.json" };
m.niveis = "tela-f/niveis-1.0.0.json (id da spec semeada → nível; fora da referência)";
m.criteriosDeJulgamento = "tela-f/criterios-de-julgamento-sem-predicado.json";
m.paginaCongelada = "tela-f/pagina-congelada.json (ala pnip-f, 190 arquivos, lista 195f1e47…; govbr-corpus tela-f 157a3cc)";
m.evidencia = { construcao: "tela-f/construcao/", remedidaNaturais: "tela-f/remedida-d/", lacunas: "tela-f/lacunas-construcao.json", conferenciaReferencia: "tela-f/conferir-referencia-1.0.0.log" };
delete m.origem.construcao;
writeFileSync(REF, JSON.stringify(ref, null, 1) + "\n");
const refSha = sha(readFileSync(REF));

const fin = {
  arquivo: "classes-finais", protocolo: "NAT-78 §5.3 (NAT-71 §3.1–3.2); adendo da F § 4",
  referencia: "ground-truth-processos-f.json", referenciaSha256: refSha,
  fontes: Object.fromEntries([1, 2, 3].map(n => [`classificador-${n}.json`, sha(readFileSync(join(AQUI, `classes-nat71/classificador-${n}.json`)))]).concat([["heranca-naturais.json", sha(readFileSync(join(AQUI, "classes-nat71/heranca-naturais.json")))]])),
  pedido: { referenciaSha256DoPedido: cl[0].referenciaSha256, nota: "o pedido foi montado sobre o rascunho; as 12 specs semeadas do pedido são idênticas às da referência final (só o _meta mudou)" },
  regra: "classificadores 1 e 2 = dupla classificação; onde discordam em classe ou nível, o 3 (cego, classificou as 12 sem saber quais estavam em disputa) desempata por maioria; três diferentes → sem-maioria. Regra fixada pelo orquestrador (autora e orquestrador cegos à lista).",
  contagens: { classe: conta("classe"), automatizabilidade: conta("automatizabilidade"), origem: conta("origem"), total: finais.length, acordo1x2: { classe: acordoClasse, nivel: acordoNivel, de: sem.length }, desempates, semMaioria },
  specs: finais,
};
// as 12 specs do pedido são as da referência final?
const pedidoSpecs = J("classes-nat71/pedido/specs.json").specs;
for (const p of pedidoSpecs) { const v = ref.violations.find(x => x.id === p.id); for (const k of ["anchor", "state", "description", "categories"]) if (JSON.stringify(p[k]) !== JSON.stringify(v[k])) throw new Error(`${p.id}.${k} mudou desde o pedido NAT-71`); }
const finTxt = JSON.stringify(fin, null, 1) + "\n";
writeFileSync(join(AQUI, "classes-nat71/classes-finais.json"), finTxt);
writeFileSync(join(AQUI, "classes-nat71/classes-finais.sha256"), `${sha(finTxt)}  tela-f/classes-nat71/classes-finais.json\n`);
const md = [`# Classes pré-registradas da tela F (protocolo NAT-78 §5.3, NAT-71 §3) — classificações cegas, 26/11/2026`, "",
  `Três classificadores novos e cegos, cada um só com \`pedido/\` (definições NAT-71 §3.1–3.2 e protocolo §5.3, as 12 specs semeadas, os critérios de julgamento como leitura auxiliar), sem ver os outros, sem navegador e sem ferramenta. Regra: 1 e 2 são a dupla classificação; o 3 só desempata onde 1 e 2 discordam (maioria). As 13 naturais herdam a classe final da D (\`heranca-naturais.json\`). Referência final sha256 \`${refSha}\`.`, "",
  "| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | | Classe (3) | Nível (3) | Final |", "|---|---|---|---|---|---|---|---|---|---|",
  ...linhas.map(l => `| ${l.id} | ${l.a.classe} | ${l.b.classe} | ${l.iguaisC ? "igual" : "**difere**"} | ${l.a.automatizabilidade} | ${l.b.automatizabilidade} | ${l.iguaisN ? "igual" : "**difere**"} | ${l.usouT ? l.t.classe : "—"} | ${l.usouT ? l.t.automatizabilidade : "—"} | ${l.classe ?? "sem-maioria"} / ${l.nivel ?? "sem-maioria"} |`),
  "", `Acordo 1×2: classe ${acordoClasse}/${sem.length}; nível ${acordoNivel}/${sem.length}. Desempates pelo 3: ${desempates}. Sem maioria: ${semMaioria}.`, "",
  "## Desacordos", "", ...linhas.filter(l => l.usouT).flatMap(l => [`### ${l.id}`, "", `- Classificador 1 (${l.a.classe}, ${l.a.automatizabilidade}): ${l.a.motivo}`, `- Classificador 2 (${l.b.classe}, ${l.b.automatizabilidade}): ${l.b.motivo}`, `- Classificador 3 (${l.t.classe}, ${l.t.automatizabilidade}): ${l.t.motivo}`, ""]),
  "## Herdadas", "", `D-01…D-14 (13): classe final da D (\`tela-d/classes-nat71/classes-finais.json\`), por spec idêntica byte a byte.`, ""].join("\n");
writeFileSync(join(AQUI, "classes-nat71/comparacao.md"), md);
writeFileSync(join(AQUI, "auditoria-cega/resultado.json"), JSON.stringify({ chaveSha256: sha(readFileSync(join(AQUI, "auditoria-cega/chave.json"))), semeadas: confirmacao, iscas, contagens: { ...conf, iscasFalsasNosDois: iscas.filter(i => i.falsaNosDois).length } }, null, 1) + "\n");
console.log(JSON.stringify({ conf, iscasFalsas: iscas.filter(i => i.falsaNosDois).length, acordoClasse, acordoNivel, desempates, semMaioria, refSha }));
