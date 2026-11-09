/**
 * [D-168] Conferência SEM MODELO e sem navegador do `dominio` declarado numa referência (1.1.0 da tela Vistorias em diante).
 *
 *   npx tsx scripts/conferir-dominio.ts --referencia ground-truth-vistorias.json --base <ARQ | git:REV> --medicao ARQ
 *
 * Confere, e sai ≠ 0 se algo falha:
 *  1. só o permitido mudou em relação à base: tirando `_meta.version`, `_meta.historico` e o `dominio` das specs, a
 *     referência é a base byte a byte (mesma serialização, mesma ordem de chaves; `rules` comparado pelo `rulesLegado`); a última entrada de `_meta.historico`
 *     vai da versão da base à versão nova, com data e motivo;
 *  2. forma: `dominio = { regra: texto, registros: [id, …] }` (`dominioDoDefeito`), só em spec cuja parada é rota de
 *     registro e que não é da casca da aplicação (D-165 § 3); TODA spec dessas o declara; os registros são ids de registro
 *     (`registroDaRota`), sem repetição, em ordem, e incluem o registro da própria parada;
 *  3. evidência: cada registro do domínio foi medido (`--medicao`, medir-dominio.mjs) e mostra ali o observável da spec
 *     (`OBSERVAVEL[spec]`: o mesmo sujeito com o mesmo defeito); e todo registro medido que mostra o observável está no
 *     domínio (nenhum fica de fora sem motivo), salvo o que `EXCLUSAO_DECLARADA` diz;
 *  4. migração de ids (`--validador DIR`, a base literal de `data/`): `rulesLegado` é o `rules` da base byte a byte, só
 *     existe onde havia id legado, e `rules` é a migração dele (`scripts/rules-legado.ts`). Sem `--validador`, só a primeira
 *     metade. O diff do item 1 trata `rules` pela versão da base (`rulesLegado` quando há).
 * Fora de SCORER_FILES: nada aqui muda unidade, âncora, norma ou pontuação.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dominioDoDefeito, registroDaRota } from "./reanalise-nat74/e14-campanha";
import { lerBaseLiteral, migrarRules, normalizar, temLegado, type BaseLiteral } from "./rules-legado";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Casca da aplicação por tela (D-165 § 6, bloco mecânico da regra): specs cuja âncora começa nela ficam fora. */
export const CASCA: Record<string, string[]> = { vistorias: ["pnip-header"] };

type Json = Record<string, unknown>;
interface Spec { id: string; state: string; anchor: string; rules: string[]; rulesLegado?: string[]; dominio?: unknown }
interface Ref { _meta: Json & { version: string; suite?: string; states?: { id: string; path?: string }[]; historico?: unknown }; violations: Spec[] }

// ───────────────────────────────────────────── observáveis medidos (o mesmo sujeito, o mesmo defeito)

export interface DetalheMedido {
  registro: string; path: string; componente: boolean;
  titulos: { nivel: number; texto: string; noDetalhe: boolean }[];
  textareas: { seletorB20: boolean; visivel: boolean; id: string | null; labels: number | null; attrs: Record<string, string>;
    labelIrmao: { texto: string; for: string | null }[]; ax: { nome: string } | null }[];
  tabelas: { visivel: boolean; caption: string | null; ariaLabel: string | null; ariaLabelledby: string | null; cabecalhos: string[]; h4Antes: string | null; ax: { nome: string } | null }[];
  seletorB23: { texto: string; visivel: boolean; secao: string | null; cor: string; fundo: string; contraste: number; fonte: string }[];
  trocarEmbarcacao: number;
}
export interface ModalMedido { modais: { noComponente: boolean; visivel: boolean; role: string | null; ariaModal: string | null; ariaLabel: string | null; ariaLabelledby: string | null }[];
  dialogosNaArvore: number; tab: { teclas: number; dentro: number; fora: number } }
export interface Medicao { formato: string; detalhes: DetalheMedido[]; modais: Record<string, ModalMedido> }

const H3_DETALHE = "Programa Nacional de Regularização de Embarcação de Pesca";
/**
 * O observável de cada spec de rota de registro, como predicado sobre a medição de UM registro. É a regra de equivalência
 * escrita em `dominio.regra`, mecanizada: o que a referência mediu na parada, no mesmo sujeito.
 */
export const OBSERVAVEL: Record<string, (d: DetalheMedido, m: ModalMedido | undefined) => boolean> = {
  // textarea do motivo do não comparecimento: <label> irmão com esse texto e sem `for`, textarea sem id, nome acessível vazio
  "B-20": d => d.textareas.some(t => t.seletorB20 && t.visivel && !t.id && t.labels === 0 && !t.attrs["aria-label"] && !t.attrs["aria-labelledby"]
    && t.labelIrmao.length === 1 && t.labelIrmao[0].texto === "Descrever o motivo do não comparecimento" && !t.labelIrmao[0].for && t.ax?.nome === ""),
  // títulos: nenhum h1/h2 visível no documento e o 1º título do detalhe é o h3 do programa, seguido de h4
  "B-21": d => { const det = d.titulos.filter(t => t.noDetalhe);
    return d.componente && !d.titulos.some(t => t.nivel < 3) && det[0]?.nivel === 3 && det[0].texto === H3_DETALHE && det.slice(1).some(t => t.nivel === 4); },
  // a tabela "Dados da Notificação" (Status, Data, Hora) sem caption, aria-label nem aria-labelledby; nome acessível vazio
  "B-22": d => d.tabelas.some(t => t.visivel && t.h4Antes === "Dados da Notificação" && t.cabecalhos.join("|") === "Status|Data|Hora"
    && t.caption === null && !t.ariaLabel && !t.ariaLabelledby && t.ax?.nome === ""),
  // o indicador "0%" da seção Conclusão, branco sobre #888, 14 px peso 400, 3,54:1
  "B-23": d => d.seletorB23.some(x => x.visivel && x.texto === "0%" && x.secao === "Conclusão" && x.cor === "#ffffff" && x.fundo === "#888888" && x.contraste === 3.54 && x.fonte === "14px / 400"),
  // o br-modal "Trocar embarcação" sem role, aria-modal nem nome; nenhum dialog na árvore do Chromium
  "B-24": (_d, m) => !!m && m.modais.length === 1 && m.modais[0].noComponente && m.modais[0].visivel && !m.modais[0].role && !m.modais[0].ariaModal
    && !m.modais[0].ariaLabel && !m.modais[0].ariaLabelledby && m.dialogosNaArvore === 0,
  // o mesmo modal aberto: Tab real sai dele (pontos fora) e passa por ele (pontos dentro)
  "B-27": (_d, m) => !!m && m.modais.length === 1 && m.modais[0].noComponente && m.tab.fora > 0 && m.tab.dentro > 0,
};
/** Registros que mostram o observável mas ficam fora do domínio por decisão escrita (vazio: nenhum). */
export const EXCLUSAO_DECLARADA: Record<string, string[]> = {};

/** Registros medidos que mostram o observável de cada spec (o domínio que a evidência sustenta). */
export function registrosComObservavel(med: Medicao, spec: string): string[] {
  const f = OBSERVAVEL[spec];
  if (!f) throw new Error(`${spec}: sem observável declarado em OBSERVAVEL`);
  return med.detalhes.filter(d => f(d, med.modais[d.registro])).map(d => d.registro).sort();
}

// ───────────────────────────────────────────── conferência

const SEM_CAMPOS = (r: Ref): Ref => {
  const { version: _v, historico: _h, ...meta } = r._meta;
  // `rules` volta ao de antes (rulesLegado, quando há) e rulesLegado sai: a migração é conferida à parte (item 4)
  return { ...r, _meta: meta as Ref["_meta"], violations: r.violations.map(({ dominio: _d, rulesLegado, ...v }) => ({ ...v, rules: rulesLegado ?? v.rules }) as Spec) };
};
const SEMVER = /^\d+\.\d+\.\d+$/;

/** Linhas (0-based) dos campos que a versão nova pode mexer: version/historico em `_meta`, rules/rulesLegado/dominio nas specs. */
export function linhasPermitidas(txt: string): Set<number> {
  const ls = txt.split("\n"), out = new Set<number>();
  let emViolations = false;
  for (let i = 0; i < ls.length; i++) {
    if (/^ {2}"violations": \[/.test(ls[i])) emViolations = true;
    const m = /^( *)"(version|historico|rules|rulesLegado|dominio)": (.*)$/.exec(ls[i]);
    if (!m) continue;
    const [, ind, chave, resto] = m;
    const ok = emViolations ? ind.length === 6 && ["rules", "rulesLegado", "dominio"].includes(chave) : ind.length === 4 && ["version", "historico"].includes(chave);
    if (!ok) continue;
    out.add(i);
    if (/^[[{]$/.test(resto.trim().replace(/,$/, ""))) {
      for (let j = i + 1; j < ls.length; j++) { out.add(j); if (new RegExp(`^${ind}[\\]}],?$`).test(ls[j])) { i = j; break; } }
    }
  }
  return out;
}

/**
 * Prova byte a byte: `git diff --no-index -U0` entre a base e a nova, e cada linha tirada ou posta tem de estar num campo
 * permitido (`linhasPermitidas` da base e da nova), ou ser a mesma linha só com a vírgula final a mais/a menos (a chave que
 * passou a ter outra depois dela). Devolve os erros.
 */
export function diffRestrito(baseTxt: string, refTxt: string): string[] {
  const dir = mkdtempSync(join(tmpdir(), "d168-diff-")), a = join(dir, "base.json"), b = join(dir, "nova.json");
  writeFileSync(a, baseTxt); writeFileSync(b, refTxt);
  let saida = "";
  try { saida = execFileSync("git", ["diff", "--no-index", "--no-color", "-U0", a, b], { encoding: "utf8", maxBuffer: 1 << 26 }); }
  catch (e) { saida = String((e as { stdout?: string }).stdout ?? ""); }
  finally { rmSync(dir, { recursive: true, force: true }); }
  const pb = linhasPermitidas(baseTxt), pn = linhasPermitidas(refTxt), erros: string[] = [];
  const ls = saida.split("\n");
  for (let k = 0; k < ls.length; k++) {
    const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(ls[k]);
    if (!h) continue;
    let ib = Number(h[1]) - (h[2] === "0" ? 0 : 1), in_ = Number(h[3]) - (h[4] === "0" ? 0 : 1);
    const tirados: { i: number; t: string }[] = [], postos: { i: number; t: string }[] = [];
    for (k++; k < ls.length && !ls[k].startsWith("@@"); k++) {
      if (ls[k].startsWith("-") && !ls[k].startsWith("---")) tirados.push({ i: ib++, t: ls[k].slice(1) });
      else if (ls[k].startsWith("+") && !ls[k].startsWith("+++")) postos.push({ i: in_++, t: ls[k].slice(1) });
    }
    k--;
    const soVirgula = (x: string, y: string) => x.replace(/,$/, "") === y.replace(/,$/, "");
    const restoT = tirados.filter(x => !pb.has(x.i)), restoP = postos.filter(x => !pn.has(x.i));
    for (const x of restoT) { const j = restoP.findIndex(y => soVirgula(x.t, y.t)); if (j >= 0) restoP.splice(j, 1); else erros.push(`diff: linha ${x.i + 1} da base mudou fora dos campos permitidos: ${x.t.trim().slice(0, 100)}`); }
    for (const y of restoP) erros.push(`diff: linha ${y.i + 1} da nova fora dos campos permitidos: ${y.t.trim().slice(0, 100)}`);
  }
  return erros;
}

export function conferir(refTxt: string, baseTxt: string, med: Medicao | null, baseLiteral: BaseLiteral | null = null): string[] {
  const erros: string[] = [];
  const ref = JSON.parse(refTxt) as Ref, base = JSON.parse(baseTxt) as Ref;
  // 1. só o permitido mudou: os dados (parse, mesma ordem de chaves) e os bytes (diff de linhas restrito aos campos)
  const ser = (x: unknown) => JSON.stringify(x, null, 2) + "\n";
  if (ser(SEM_CAMPOS(ref)) !== ser(SEM_CAMPOS(base))) erros.push("fora de _meta.version, _meta.historico, dominio e rules/rulesLegado, a referência difere da base");
  erros.push(...diffRestrito(baseTxt, refTxt));
  // 4. migração de ids: rulesLegado = o rules da base; rules = a migração dele pela base literal, ou (base sem id nenhum)
  //    a unidade cuja cláusula o registro da construção da spec cita literalmente (`clausula-citada`, em _meta.historico)
  const daBase = new Map(base.violations.map(v => [v.id, v]));
  const ultimo = (Array.isArray(ref._meta.historico) ? ref._meta.historico.at(-1) : null) as { migracao?: { spec: string; de: string | null; para: string[]; como: string; fonte?: string }[] } | null;
  for (const v of ref.violations) {
    const b = daBase.get(v.id);
    if (!b) continue;
    if (v.rulesLegado !== undefined && ser(v.rulesLegado) !== ser(b.rules)) erros.push(`${v.id}: rulesLegado não é o rules da base`);
    if (v.rulesLegado === undefined && ser(v.rules) !== ser(b.rules)) erros.push(`${v.id}: rules mudou sem rulesLegado`);
    if (!baseLiteral || v.rulesLegado === undefined) { if (baseLiteral && temLegado(v.rules, baseLiteral)) erros.push(`${v.id}: id legado em rules sem migração`); continue; }
    if (v.rulesLegado.length && !temLegado(v.rulesLegado, baseLiteral)) erros.push(`${v.id}: rulesLegado sem id legado`);
    if (v.rulesLegado.length) { if (ser(v.rules) !== ser(migrarRules(v.rulesLegado, baseLiteral).rules)) erros.push(`${v.id}: rules não é a migração de rulesLegado pela base literal`); continue; }
    // base sem id: só unidade literal cuja cláusula (texto normalizado) está, inteira, no arquivo citado
    const citadas = (ultimo?.migracao ?? []).filter(m => m.spec === v.id && m.como === "clausula-citada");
    for (const id of v.rules) {
      const m = citadas.find(x => x.para.includes(id)), u = baseLiteral.literais.get(id);
      if (!m?.fonte || !u) { erros.push(`${v.id}: ${id} acrescentado sem migracao "clausula-citada" com fonte, ou fora da base literal`); continue; }
      let txt = "";
      try { txt = readFileSync(join(RAIZ, m.fonte), "utf8"); } catch { erros.push(`${v.id}: fonte ${m.fonte} não existe`); continue; }
      const plano = (s: string) => normalizar(s.replace(/^>\s?/gm, "").replace(/["“”]/g, ""));
      if (!plano(txt).includes(plano(u.originalText ?? "\u0000"))) erros.push(`${v.id}: a cláusula de ${id} não está escrita em ${m.fonte}`);
    }
  }
  if (!SEMVER.test(ref._meta.version) || ref._meta.version === base._meta.version) erros.push(`_meta.version ${ref._meta.version}: tem de ser semver e diferente da base (${base._meta.version})`);
  const h = ref._meta.historico;
  if (!Array.isArray(h) || !h.length) erros.push("_meta.historico ausente ou vazio");
  else {
    const u = h[h.length - 1] as Json;
    if (u.de !== base._meta.version || u.para !== ref._meta.version) erros.push(`_meta.historico: a última entrada vai de ${String(u.de)} a ${String(u.para)}; esperado ${base._meta.version} → ${ref._meta.version}`);
    if (typeof u.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(u.data)) erros.push("_meta.historico: data AAAA-MM-DD");
    if (typeof u.motivo !== "string" || !u.motivo.trim()) erros.push("_meta.historico: motivo");
  }
  // 2. forma
  const casca = CASCA[String(ref._meta.suite ?? "")] ?? [];
  const parada = new Map((ref._meta.states ?? []).map(s => [s.id, registroDaRota(s.path)]));
  for (const v of ref.violations) {
    const reg = v.state === "sempre" ? null : parada.get(v.state) ?? null;
    const daCasca = casca.some(c => v.anchor.trim().split(/\s+/)[0] === c);
    let d;
    try { d = dominioDoDefeito(v); } catch (e) { erros.push((e as Error).message); continue; }
    if (!reg || daCasca) { if (d) erros.push(`${v.id}: dominio em spec ${!reg ? "fora de rota de registro" : "da casca da aplicação (D-165 § 3)"}`); continue; }
    if (!d) { erros.push(`${v.id}: parada ${v.state} em rota de registro (${reg}) sem dominio declarado`); continue; }
    if (new Set(d.registros).size !== d.registros.length) erros.push(`${v.id}: registros repetidos`);
    if ([...d.registros].sort().join() !== d.registros.join()) erros.push(`${v.id}: registros fora de ordem`);
    for (const x of d.registros) if (registroDaRota("/" + x) !== x) erros.push(`${v.id}: "${x}" não é id de registro`);
    if (!d.registros.includes(reg)) erros.push(`${v.id}: dominio.registros não inclui o registro da própria parada (${reg})`);
    // 3. evidência
    if (med) {
      const medidos = new Set(med.detalhes.map(x => x.registro));
      const sustenta = registrosComObservavel(med, v.id), exc = EXCLUSAO_DECLARADA[v.id] ?? [];
      for (const x of d.registros) {
        if (!medidos.has(x)) erros.push(`${v.id}: registro ${x} do domínio não foi medido`);
        else if (!sustenta.includes(x)) erros.push(`${v.id}: registro ${x} do domínio não mostra o observável da spec na medição`);
      }
      for (const x of sustenta) if (!d.registros.includes(x) && !exc.includes(x)) erros.push(`${v.id}: registro ${x} mostra o observável e não está no domínio nem na exclusão declarada`);
    }
  }
  return erros;
}

function lerBase(base: string): string {
  if (!base.startsWith("git:")) return readFileSync(base, "utf8");
  const [rev, arq] = base.slice(4).split(":");
  return execFileSync("git", ["show", `${rev}:${arq}`], { cwd: RAIZ, encoding: "utf8", maxBuffer: 1 << 26 });
}

if (process.argv[1] && /(?:^|[\\/])conferir-dominio\.ts$/.test(process.argv[1])) {
  const a = process.argv.slice(2), val = (k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  const refArq = resolve(val("--referencia") ?? join(RAIZ, "ground-truth-vistorias.json"));
  const base = val("--base") ?? `git:HEAD:${relative(RAIZ, refArq).replace(/\\/g, "/")}`;
  const medArq = val("--medicao");
  const med = medArq ? JSON.parse(readFileSync(medArq, "utf8")) as Medicao : null;
  if (med && !/^d168-medicao-dominio-/.test(med.formato)) { console.error(`${medArq}: não é medição de domínio`); process.exit(1); }
  const valArq = val("--validador");
  const bl = valArq ? lerBaseLiteral(resolve(valArq)) : null;
  const erros = conferir(readFileSync(refArq, "utf8"), lerBase(base), med, bl);
  const ref = JSON.parse(readFileSync(refArq, "utf8")) as Ref;
  for (const v of ref.violations.filter(x => x.dominio)) console.log(`${v.id}: ${(v.dominio as { registros: string[] }).registros.map(x => x.slice(-4)).join(", ")}`);
  if (erros.length) { console.error(`FALHA (${erros.length}):\n  ${erros.join("\n  ")}`); process.exit(1); }
  console.log(`ok: ${refArq} ${ref._meta.version} contra a base ${base}${med ? ` e a medição ${medArq}` : " (sem medição: domínio só na forma)"}${bl ? `; migração de rules pela base literal de ${valArq}` : " (sem --validador: rulesLegado só contra a base)"}`);
}
