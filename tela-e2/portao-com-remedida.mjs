/**
 * Tela E2 — portão com a re-medida cega (2º auditor). Junta tela-e2/remedida/remedida.json com remedida-mapa.json e
 * aplica a regra fixada pelo coordenador ANTES da medida: uma sorteada conta como confirmada às cegas se a 1ª
 * auditoria a achou com a cláusula sorteada (resultado 'mesma-clausula' em reconciliacao.json) OU se o 2º auditor
 * decidiu 'viola' no item do observável sorteado. "Achada com outra cláusula" sozinha não conta (item 1 da autora).
 * Iscas: toda isca tem de sair 'satisfaz'; isca 'viola' = defeito acidental ou cláusula disputada (contada aqui).
 * Uso: node tela-e2/portao-com-remedida.mjs → remedida-juncao.json + portao.json (reescrito)
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const json = f => JSON.parse(readFileSync(join(AQUI, f), "utf8"));
const sha = f => createHash("sha256").update(readFileSync(join(AQUI, f))).digest("hex");
const med = json("remedida/remedida.json");
const mapa = json("remedida-mapa.json");
const rec = json("reconciliacao.json");
const conf = json("conferencia-construcao.json");
const anterior = json("portao.json");

const juncao = mapa.mapa.map(m => {
  const r = med.itens[m.id];
  if (!r) throw new Error(`sem resposta para ${m.id}`);
  if (r.instancia !== m.instancia) throw new Error(`${m.id}: instância ${r.instancia} ≠ ${m.instancia}`);
  return { id: m.id, tipo: m.tipo, chave: m.chave, instancia: m.instancia, estado: r.estado, janela: r.janela, decisao: r.decisao, motivo: r.motivo, medidaNestaPreparacao: m.medidaNestaPreparacao };
});
const iscas = juncao.filter(j => j.tipo.startsWith("isca"));
const iscasViola = iscas.filter(j => j.decisao !== "satisfaz");
const sorteadasNoPedido = Object.fromEntries(juncao.filter(j => j.tipo.startsWith("sorteada")).map(j => [j.chave, j]));
writeFileSync(join(AQUI, "remedida-juncao.json"), JSON.stringify({
  _meta: { entradas: { "remedida/remedida.json": sha("remedida/remedida.json"), "remedida-mapa.json": sha("remedida-mapa.json") }, medidoEm: med.medidoEm, rodadas: med.rodadas,
    contagens: { itens: juncao.length, satisfaz: juncao.filter(j => j.decisao === "satisfaz").length, viola: juncao.filter(j => j.decisao === "viola").length,
      iscasSatisfaz: iscas.length - iscasViola.length, iscas: iscas.length, sorteadasViola: Object.values(sorteadasNoPedido).filter(j => j.decisao === "viola").length, sorteadas: Object.keys(sorteadasNoPedido).length } },
  juncao,
}, null, 1) + "\n");

const linhas = rec.sorteadas.map(s => {
  const pegou = conf.variantes.semeada.obs[s.celula].violado;
  const primeira = s.auditoria.resultado === "mesma-clausula";
  const re = sorteadasNoPedido[s.celula];
  const segunda = re ? re.decisao === "viola" : null;
  const confirmada = primeira || segunda === true;
  const ambasConforme = s.auditoria.resultado === "nao-achada" && segunda === false;
  return { celula: s.celula, classe: s.classe, pegouNaConstrucao: pegou,
    primeiraAuditoria: { resultado: s.auditoria.resultado, via: s.auditoria.via, achado: s.auditoria.achado, conformeContrario: s.auditoria.conformeContrario },
    remedida: re ? { item: re.id, decisao: re.decisao } : null,
    confirmadaPelaPrimeira: primeira, confirmadaPelaRemedida: segunda === true, confirmacaoCega: confirmada,
    ambosAuditoresJulgaramConforme: ambasConforme,
    c2_estadoAlcancavel: true, c3_clausulaNaBase: s.idsBase.length > 0, idsBase: s.idsBase,
    contaEstrito: s.classe === "DS" && pegou && confirmada && s.idsBase.length > 0,
    contaSoPrimeira: s.classe === "DS" && pegou && primeira && s.idsBase.length > 0,
    dependeDoItem: s.auditoria.via === "tambem" ? 3 : s.auditoria.via === "duplicata-selada" ? 2 : null };
});
const ds = linhas.filter(l => l.classe === "DS");
const n = ds.filter(l => l.contaEstrito).length;
const n1 = ds.filter(l => l.contaSoPrimeira).length;
const nMin = ds.filter(l => l.contaEstrito && l.dependeDoItem === null).length;
const out = {
  _meta: {
    regra: anterior._meta.regra,
    regraDaRemedida: "fixada pelo coordenador antes da medida: confirmada às cegas = 1ª auditoria achou com a cláusula sorteada (mesma-clausula: principal, tambem ou duplicata selada) OU o 2º auditor cego, perguntado de forma neutra entre 10 iscas, decidiu 'viola' no observável sorteado. 'Achada com outra cláusula' sozinha não conta.",
    data: "2026-11-14", paginaMedida: "corpus 386a8d8 (depois da F-01), nas duas medidas que contam aqui (re-medida da 1ª e 2º auditor)",
    remedida: "tela-e2/remedida/ (cópia sem edição) · remedida-mapa.json (semente, mapa) · remedida-juncao.json",
    iscas: { satisfaz: iscas.length - iscasViola.length, total: iscas.length, viola: iscasViola.map(i => i.id) },
  },
  limiar: 5, specsDSemVigor: ds.length,
  n_soPrimeiraAuditoria: n1, passaSoPrimeiraAuditoria: n1 >= 5,
  n_estrito: n, passaEstrito: n >= 5, folga: n - 5,
  n_estritoSeItens2e3ForemB: nMin, passaSeItens2e3ForemB: nMin >= 5,
  n_pelaLetraAnterior: anterior.n_pelaLetra,
  porSpec: linhas,
};
writeFileSync(join(AQUI, "portao.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`iscas satisfaz ${iscas.length - iscasViola.length}/${iscas.length}; DS: só 1ª ${n1}, estrito ${n} (mín ${nMin}); ` +
  ["DS", "G"].map(c => `${c}: 1ª ${linhas.filter(l => l.classe === c && l.confirmadaPelaPrimeira).length}, com remedida ${linhas.filter(l => l.classe === c && l.confirmacaoCega).length}, sem confirmação ${linhas.filter(l => l.classe === c && !l.confirmacaoCega).length}`).join("; ") +
  `; ambos conforme: ${linhas.filter(l => l.ambosAuditoresJulgaramConforme).map(l => l.celula.split("::")[0]).join(",")}`);
