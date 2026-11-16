/**
 * Sorteio das sementes de defeito da tela E2 (página construída, plano B da E) — regras em tela-e2/metodo.md § 5–6 e
 * tela-e2/parametros.json. Adaptado de tela-e/sortear-sementes.mjs (ordem por hash, busca em profundidade "incluir antes
 * de pular", cota efetiva pelo déficit, reposição pela próxima célula da mesma ordem) com o que a E2 acrescenta:
 * célula = unidade elegível × hospedeiro; classe pela `categories` (CLASSE_DA_CATEGORIA); colocação = célula × variante,
 * e duas colocações sorteadas têm de ser compatíveis pelos efeitos declarados (procedimento da A2).
 *
 *   node tela-e2/sortear-sementes.mjs --validar          NÃO sorteia: só contagens (sem conteúdo de célula, regra ou sítio)
 *   node tela-e2/sortear-sementes.mjs --semente <40 hex> sorteio único (parâmetros SELADO, semente = parametros.semente)
 *   node tela-e2/sortear-sementes.mjs --repor            aplica tela-e2/descartes.json (grava sementes-vigentes.json)
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const D = "tela-e2/";
export const PARAMS = D + "parametros.json", SCRIPT = D + "sortear-sementes.mjs", OUT = D + "sorteio.json", EXEC = D + "sorteio-execucao.json",
  FAIL = D + "sorteio-falha.json", DESCARTES = D + "descartes.json", VIGENTES = D + "sementes-vigentes.json";
export const sha256 = t => createHash("sha256").update(t).digest("hex");
export const chave = (semente, rotulo, id) => sha256(`${semente}|${rotulo}|${id}`);
export const chaveNeutra = (rotulo, id) => `${rotulo}|${id}`;
const porChave = (itens, keyFn, rotulo) => [...itens].map(x => ({ x, k: keyFn(rotulo, x.id) }))
  .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.x.id < b.x.id ? -1 : a.x.id > b.x.id ? 1 : 0)).map(({ x, k }) => ({ ...x, chave: k }));
export class Recusa extends Error {}
const recusar = m => { throw new Recusa(m); };

// ---------------------------------------------------------------- células, classe, efeitos, exclusões
export function classeDe(categorias, params) {
  if (!categorias?.length) recusar("célula sem categorias: classe indecidível");
  for (const c of categorias) if (!(c in params.classeDaCategoria) || c.startsWith("_")) recusar(`categoria fora do vocabulário: ${c}`);
  return categorias.every(c => params.classeDaCategoria[c] === "ds") ? "DS" : "G";
}
/** Efeito de uma variante num hospedeiro, com '$' expandido. */
function efeitoNo(v, host) {
  const e = v.efeitos?.porHospedeiro ? v.efeitos.porHospedeiro[host] : v.efeitos;
  if (!e) recusar(`variante sem efeito no hospedeiro ${host}`);
  const exp = n => n.replace(/^\$:/, `${host}:`);
  return { toca: (e.toca ?? []).map(exp), remove: (e.remove ?? []).map(exp), cascata: e.cascata ?? [], estado: e.estado ?? null };
}
const instDe = n => n.split(":")[0];
/** Compatibilidade da A2: nó comum; cascata ou remoção da raiz atinge instância de nó da outra; as duas mudam o estado. */
export function compativeis(a, b) {
  const na = new Set([...a.toca, ...a.remove]), nb = [...b.toca, ...b.remove];
  if (nb.some(n => na.has(n))) return false;
  const atinge = e => new Set([...e.cascata, ...e.remove.filter(n => /:(raiz|grupo)$/.test(n)).map(instDe)]);
  const ia = new Set([a.host, ...[...na].map(instDe)]), ib = new Set([b.host, ...nb.map(instDe)]);
  const xa = atinge(a), xb = atinge(b);
  if (xa.has("*") || xb.has("*")) return false;
  if ([...ib].some(i => xa.has(i)) || [...ia].some(i => xb.has(i))) return false;
  if (a.estado && b.estado) return false;
  return true;
}
export function montarCelulas({ elegibilidade, exclusoes, classe }, params) {
  const celulas = [], excluidas = [], porEtapa = [];
  const exc = exclusoes.porUnidade;
  const todas = [];
  for (const r of elegibilidade.regras.filter(r => r.passo2 === "aceita")) {
    const classe = classeDe(r.categorias, params);
    for (const host of r.instancias) {
      const variantes = r.variantes.filter(v => !v.instancias || v.instancias.includes(host)).map(v => ({ id: v.id, host, ...efeitoNo(v, host) }));
      if (!variantes.length) recusar(`célula sem variante: ${host}::${r.id}`);
      todas.push({ id: `${host}::${r.id}`, sitio: host, regra: r.id, classe, variantes });
    }
  }
  const resumo = xs => ({ DS: xs.filter(x => x.classe === "DS").length, G: xs.filter(x => x.classe === "G").length,
    hospedeirosDS: new Set(xs.filter(x => x.classe === "DS").map(x => x.sitio)).size, regrasDS: new Set(xs.filter(x => x.classe === "DS").map(x => x.regra)).size,
    hospedeirosG: new Set(xs.filter(x => x.classe === "G").map(x => x.sitio)).size, regrasG: new Set(xs.filter(x => x.classe === "G").map(x => x.regra)).size });
  porEtapa.push({ etapa: "elegiveis-passo2", ...resumo(todas) });
  let vivas = todas;
  const motivos = { "sem-clausula-na-base": c => exc[c.regra]?.semClausula, exposta: c => exc[c.regra]?.exposta?.length > 0, "tentativa-e": c => exc[c.regra]?.tentativaE?.length > 0,
    // segunda classificação (item A do coordenador): a célula fica só se as duas classes coincidem; sem segunda classe = recusa
    "classe-em-desacordo": c => { const x = classe?.porCelula?.[c.id]; if (!x) recusar(`célula sem segunda classificação: ${c.id}`); return x.classe2 !== c.classe; } };
  for (const m of params.motivosDeExclusao) {
    if (!motivos[m]) recusar(`motivo de exclusão desconhecido: ${m}`);
    const fora = vivas.filter(c => motivos[m](c));
    excluidas.push(...fora.map(c => ({ ...c, motivo: m })));
    vivas = vivas.filter(c => !fora.includes(c));
    porEtapa.push({ etapa: `depois-de-${m}`, ...resumo(vivas) });
  }
  celulas.push(...vivas);
  return { celulas, excluidas, porEtapa };
}

// ---------------------------------------------------------------- busca
export function resolver(celulas, params, cotas, keyFn) {
  const porClasse = Object.fromEntries(params.ordemClasses.map(c => [c, porChave(celulas.filter(x => x.classe === c), keyFn, "celula")
    .map(x => ({ ...x, variantes: porChave(x.variantes.map(v => ({ ...v, id: v.id, _cel: x.id })), (l, id) => keyFn(l, `${x.id}:${id}`), "variante") }))]));
  const fila = params.ordemClasses.flatMap(c => porClasse[c].map((x, posicao) => ({ ...x, posicao })));
  const suf = params.ordemClasses.map(c => { const a = new Array(fila.length + 1).fill(0); for (let k = fila.length - 1; k >= 0; k--) a[k] = a[k + 1] + (fila[k].classe === c ? 1 : 0); return a; });
  const esc = [], conta = Object.fromEntries(params.ordemClasses.map(c => [c, 0]));
  const usoH = new Map(), usoR = new Map();
  let nos = 0;
  const dfs = k => {
    if (++nos > params.limiteNos) throw new Error("limite de nós");
    if (params.ordemClasses.every(c => conta[c] === cotas[c])) return true;
    if (k >= fila.length) return false;
    for (let i = 0; i < params.ordemClasses.length; i++) { const c = params.ordemClasses[i]; if (conta[c] + suf[i][k] < cotas[c]) return false; }
    const x = fila[k];
    if (conta[x.classe] < cotas[x.classe] && (usoH.get(x.sitio) ?? 0) < params.maxPorHospedeiro && (usoR.get(x.regra) ?? 0) < params.maxPorRegra) {
      const v = x.variantes.find(v => esc.every(e => compativeis(v, e.variante)));
      if (v) {
        esc.push({ ...x, variante: v }); conta[x.classe]++; usoH.set(x.sitio, (usoH.get(x.sitio) ?? 0) + 1); usoR.set(x.regra, (usoR.get(x.regra) ?? 0) + 1);
        if (dfs(k + 1)) return true;
        esc.pop(); conta[x.classe]--; usoH.set(x.sitio, usoH.get(x.sitio) - 1); usoR.set(x.regra, usoR.get(x.regra) - 1);
      }
    }
    return dfs(k + 1);
  };
  try { return dfs(0) ? { sementes: [...esc], ordemPorClasse: porClasse, nos } : { erro: "sem solução que cumpra as cotas", nos, ordemPorClasse: porClasse }; }
  catch (e) { return { erro: e.message, nos, ordemPorClasse: porClasse }; }
}
export function cotasEfetivas(celulas, params) {
  const cotas = Object.fromEntries(params.ordemClasses.map(c => [c, 0]));
  for (const c of params.ordemClasses) {
    let melhor = 0;
    for (let k = params.cotas[c]; k >= 1; k--) {
      const r = resolver(celulas, params, { ...cotas, [c]: k }, chaveNeutra);
      if (r.erro === "limite de nós") recusar(`limite de nós na cota efetiva de ${c}`);
      if (!r.erro) { melhor = k; break; }
    }
    cotas[c] = melhor;
  }
  return cotas;
}
export function conferirSolucao(sementes, cotas, params) {
  const p = [];
  for (const c of params.ordemClasses) if (sementes.filter(s => s.classe === c).length !== cotas[c]) p.push(`cota ${c}`);
  const conta = k => sementes.reduce((m, s) => m.set(s[k], (m.get(s[k]) ?? 0) + 1), new Map());
  if ([...conta("sitio").values()].some(n => n > params.maxPorHospedeiro)) p.push("maxPorHospedeiro");
  if ([...conta("regra").values()].some(n => n > params.maxPorRegra)) p.push("maxPorRegra");
  for (let i = 0; i < sementes.length; i++) for (let j = i + 1; j < sementes.length; j++) if (!compativeis(sementes[i].variante, sementes[j].variante)) p.push("incompatíveis");
  return p;
}

// ---------------------------------------------------------------- reposição (pela regra; nunca refaz a ordem)
export function repor(sorteio, descartes, params) {
  for (const d of descartes) if (!d?.celula || !params.motivosDeDescarte.includes(d.motivo) || !String(d.evidencia ?? "").trim()) recusar(`descarte inválido: ${JSON.stringify(d)}`);
  const motivoDe = new Map(descartes.map(d => [d.celula, d.motivo]));
  const ordem = sorteio.ordemPorClasse;
  const pos = new Map(params.ordemClasses.flatMap(c => ordem[c].map((x, i) => [x.id, { ...x, posicao: i }])));
  let vig = sorteio.sementes.map(s => ({ ...pos.get(s.id), variante: s.variante }));
  const ja = new Set(vig.map(v => v.id)), subs = [], deficit = Object.fromEntries(params.ordemClasses.map(c => [c, 0]));
  const rank = v => params.ordemClasses.indexOf(v.classe) * 1e6 + v.posicao;
  for (;;) {
    const alvo = [...vig].sort((a, b) => rank(a) - rank(b)).find(v => motivoDe.has(v.id));
    if (!alvo) break;
    vig = vig.filter(v => v.id !== alvo.id);
    let entra = null;
    for (const c of ordem[alvo.classe].slice(alvo.posicao + 1).map(x => pos.get(x.id))) {
      if (ja.has(c.id) || vig.some(v => v.sitio === c.sitio) || vig.some(v => v.regra === c.regra)) continue;
      const v = c.variantes.find(v => vig.every(o => compativeis(v, o.variante)));
      if (v) { entra = { ...c, variante: v }; break; }
    }
    if (entra) { vig.push(entra); ja.add(entra.id); } else deficit[alvo.classe]++;
    subs.push({ saiu: alvo.id, motivo: motivoDe.get(alvo.id), entrou: entra?.id ?? null });
  }
  const nunca = descartes.filter(d => !subs.some(s => s.saiu === d.celula));
  if (nunca.length) recusar(`descarte de célula que nunca foi vigente: ${nunca.map(d => d.celula).join(", ")}`);
  vig.sort((a, b) => rank(a) - rank(b));
  return { vigentes: vig.map(({ id, sitio, regra, classe, posicao, variante }) => ({ id, sitio, regra, classe, posicao, variante: variante.id })), substituicoes: subs, deficit };
}

// ---------------------------------------------------------------- E/S
const lerJson = (raiz, rel) => JSON.parse(readFileSync(join(raiz, rel), "utf8"));
export const AUTH = D + "semente-autorizada.json";
const lerInsumos = raiz => ({ elegibilidade: lerJson(raiz, D + "elegibilidade.json"), exclusoes: lerJson(raiz, D + "exclusoes.json"), classe: existsSync(join(raiz, D + "classe-reavaliada.json")) ? lerJson(raiz, D + "classe-reavaliada.json") : null });
const git = (raiz, ...a) => execFileSync("git", a, { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const gitBlob = (raiz, rev, f) => { try { return execFileSync("git", ["show", `${rev}:${f}`], { cwd: raiz, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }); } catch { return null; } };

function validar(raiz) {
  const params = lerJson(raiz, PARAMS);
  const ins = lerInsumos(raiz);
  const { celulas, excluidas, porEtapa } = montarCelulas(ins, params);
  const ef = cotasEfetivas(celulas, params);
  const neutra = resolver(celulas, params, ef, chaveNeutra);
  const ds = celulas.filter(c => c.classe === "DS");
  const hDS = new Set(ds.map(c => c.sitio)).size;
  let pares = 0, incompat = 0;
  const pl = celulas.flatMap(c => c.variantes);
  for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) if (pl[i].host !== pl[j].host) { pares++; if (!compativeis(pl[i], pl[j])) incompat++; }
  const saida = {
    aviso: "--validar NÃO sorteia; só contagens (sem conteúdo de célula, regra ou sítio)",
    status: params._meta.status,
    idsNaoResolvidosNaExposicao: ins.exclusoes.naoResolvidos?.length ?? 0,
    porEtapa,
    excluidasPorMotivo: Object.fromEntries(params.motivosDeExclusao.map(m => [m, excluidas.filter(x => x.motivo === m).length])),
    elegiveisFinais: Object.fromEntries(params.ordemClasses.map(c => { const xs = celulas.filter(x => x.classe === c); return [c, { celulas: xs.length, hospedeiros: new Set(xs.map(x => x.sitio)).size, regras: new Set(xs.map(x => x.regra)).size }]; })),
    colocacoes: pl.length, paresDeHospedeirosDiferentes: pares, paresIncompativeis: incompat,
    cotas: params.cotas, cotasEfetivas: ef, deficit: Object.fromEntries(params.ordemClasses.map(c => [c, params.cotas[c] - ef[c]])),
    portaoDSAlcancavel: ef.DS >= params.portaoDS,
    reposicaoDS: ds.length - ef.DS, reposicaoDSSuficiente: ds.length - ef.DS >= params.reposicaoMinimaDS,
    metaFolga: { alvo: params.metaFolga, celulasDS: ds.length, hospedeirosDS: hDS, atingida: ds.length >= params.metaFolga.celulasDS && hDS >= params.metaFolga.hospedeirosDS },
    solucaoOrdemNeutra: neutra.erro ? { erro: neutra.erro, nos: neutra.nos } : { sementes: neutra.sementes.length, nos: neutra.nos, problemas: conferirSolucao(neutra.sementes, ef, params).length },
  };
  saida.decisao = { regra: `DS efetiva ≥ ${params.portaoDS} E reposição DS ≥ ${params.reposicaoMinimaDS}`, sortear: saida.portaoDSAlcancavel && saida.reposicaoDSSuficiente };
  console.log(JSON.stringify(saida, null, 2));
}

function conferirIdentidade(raiz, semente, params) {
  if (params._meta.status !== "SELADO") recusar(`${PARAMS} não diz SELADO`);
  if (semente !== params.semente) recusar("a semente não é a fixada em parametros.json (metodo.md § 6)");
  if (!existsSync(join(raiz, AUTH)) || lerJson(raiz, AUTH).semente !== semente) recusar(`${AUTH} ausente ou com outra semente`);
  const selo = git(raiz, "log", "--format=%H", "--reverse", "--", PARAMS).split("\n").find(h => { const b = gitBlob(raiz, h, PARAMS); return b && JSON.parse(b.toString("utf8"))._meta?.status === "SELADO"; });
  if (!selo) recusar("nenhum commit com parâmetros SELADO");
  const shas = {};
  for (const f of params.insumos) {
    const blob = gitBlob(raiz, selo, f);
    if (!blob) recusar(`${f} não existe no commit do selo`);
    const disco = sha256(readFileSync(join(raiz, f)));
    if (disco !== sha256(blob)) recusar(`${f} difere do commit do selo`);
    shas[f] = disco;
  }
  return { selo, shas };
}
function sortear(raiz, semente) {
  if (!/^[0-9a-f]{40}$/.test(semente ?? "")) recusar("--semente exige o hash completo (40 hex)");
  for (const f of [OUT, EXEC, FAIL]) if (existsSync(join(raiz, f))) recusar(`${f} já existe: o sorteio é único`);
  let hist = "";
  try { hist = git(raiz, "log", "--all", "--format=%H", "--", OUT, EXEC, FAIL); } catch { recusar("não é um repositório git: a identidade do selo não pode ser conferida"); }
  if (hist) recusar("sorteio já existiu no histórico: o sorteio é único");
  const params = lerJson(raiz, PARAMS);
  const { selo, shas } = conferirIdentidade(raiz, semente, params);
  const { celulas, excluidas } = montarCelulas(lerInsumos(raiz), params);
  const ef = cotasEfetivas(celulas, params);
  if (ef.DS < params.portaoDS) recusar(`cota DS efetiva ${ef.DS} < portão ${params.portaoDS}; a semente não foi usada`);
  const repDS = celulas.filter(x => x.classe === "DS").length - ef.DS;
  if (repDS < params.reposicaoMinimaDS) recusar(`reposição DS ${repDS} < ${params.reposicaoMinimaDS}; a semente não foi usada`);
  const inicio = new Date().toISOString();
  const r = resolver(celulas, params, ef, (l, id) => chave(semente, l, id));
  const exec = { semente, selo, head: git(raiz, "rev-parse", "HEAD"), inicio, fim: new Date().toISOString(), node: process.version, insumos: shas, nos: r.nos };
  const prob = r.erro ? [r.erro] : conferirSolucao(r.sementes, ef, params);
  if (prob.length) {
    writeFileSync(join(raiz, FAIL), JSON.stringify({ semente, erro: prob.join(", "), nos: r.nos }, null, 2) + "\n");
    writeFileSync(join(raiz, EXEC), JSON.stringify({ ...exec, resultado: "FALHA" }, null, 2) + "\n");
    recusar(`FALHA gravada em ${FAIL}; nenhuma outra semente`);
  }
  const limpa = x => ({ id: x.id, sitio: x.sitio, regra: x.regra, classe: x.classe, chave: x.chave, variantes: x.variantes.map(v => ({ id: v.id, chave: v.chave, host: v.host, toca: v.toca, remove: v.remove, cascata: v.cascata, estado: v.estado })) });
  const out = {
    _meta: { regra: PARAMS, semente, selo, sha256: shas, cotas: params.cotas, cotasEfetivas: ef },
    ordemPorClasse: Object.fromEntries(params.ordemClasses.map(c => [c, r.ordemPorClasse[c].map(limpa)])),
    sementes: r.sementes.map(x => ({ id: x.id, sitio: x.sitio, regra: x.regra, classe: x.classe, posicao: x.posicao, variante: { id: x.variante.id, host: x.variante.host, toca: x.variante.toca, remove: x.variante.remove, cascata: x.variante.cascata, estado: x.variante.estado } })),
    excluidas: excluidas.map(({ id, motivo, classe }) => ({ id, classe, motivo })),
    nos: r.nos,
  };
  writeFileSync(join(raiz, OUT), JSON.stringify(out, null, 2) + "\n");
  writeFileSync(join(raiz, EXEC), JSON.stringify({ ...exec, resultado: OUT, sorteioSha256: sha256(readFileSync(join(raiz, OUT))) }, null, 2) + "\n");
  console.log(`${OUT} gravado — sementes ${r.sementes.length} · nós ${r.nos} · sha256 ${sha256(readFileSync(join(raiz, OUT)))}`);
}
function reporCli(raiz) {
  if (!existsSync(join(raiz, OUT)) || !existsSync(join(raiz, DESCARTES))) recusar("faltam sorteio.json ou descartes.json");
  const params = lerJson(raiz, PARAMS);
  const r = repor(lerJson(raiz, OUT), lerJson(raiz, DESCARTES).descartes ?? [], params);
  writeFileSync(join(raiz, VIGENTES), JSON.stringify({ _meta: { sorteioSha256: sha256(readFileSync(join(raiz, OUT))), descartesSha256: sha256(readFileSync(join(raiz, DESCARTES))) }, ...r }, null, 2) + "\n");
  console.log(`${VIGENTES} gravado — vigentes ${r.vigentes.length} · déficit ${JSON.stringify(r.deficit)}`);
}
export function main(argv) {
  const i = argv.indexOf("--raiz");
  const raiz = resolve(i >= 0 ? argv[i + 1] : join(dirname(fileURLToPath(import.meta.url)), "..")); // --raiz: só para o teste com fixture sintética
  const modos = ["--validar", "--semente", "--repor"].filter(m => argv.includes(m));
  if (modos.length !== 1) recusar("escolha exatamente um modo: --validar | --semente <40 hex> | --repor");
  if (modos[0] === "--validar") return validar(raiz);
  if (modos[0] === "--repor") return reporCli(raiz);
  const s = argv[argv.indexOf("--semente") + 1];
  if (!s || s.startsWith("--")) recusar("--semente sem valor: o sorteio exige a semente explícita");
  return sortear(raiz, s);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e instanceof Recusa ? `RECUSADO: ${e.message}` : e); process.exit(1); }
}
