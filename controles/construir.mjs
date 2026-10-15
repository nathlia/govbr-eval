/**
 * Constrói as páginas de controle do catálogo NAT-85/NAT-77 (catalogo-controles-1.0.0) e as expectativas.
 *
 *   node controles/construir.mjs [--corpus ../govbr-corpus] [--catalogo <catalogo.json>]
 *
 * Saída no CORPUS (só bytes neutros, sem rótulo de caso):
 *   public/controles/recursos/   DS 3.7.0 (core.min.css), Font Awesome 6.6.0 (css + woff2), logo, folha da página
 *   public/controles/a/          páginas c-<id opaco>.html (+ .js) — ala A
 *   public/controles/b/          páginas c-<id opaco>.html (+ .js) — ala B
 *   public/controles/<ala>/manifesto.json  sha256 de cada arquivo (conferir: npm run controles:conferir no corpus)
 *
 * Saída no EVAL (o gabarito; nunca vai para o corpus):
 *   controles/expectativas.json          casos de DESENVOLVIMENTO (ala A)
 *   controles/reserva/expectativas.json  casos RESERVADOS (ala B) — nenhum detector roda neles antes de congelado
 *
 * Cada gêmeo derivado declara a mudança controlada como trocas literais (antigo → novo) sobre os
 * bytes da página-par; a medição (controles/medir.mjs) reaplica as trocas aos bytes publicados e
 * exige igualdade exata. As páginas não carregam comentário, id, classe ou nome que descreva defeito:
 * a construção recusa publicar se o vocabulário do gabarito aparecer em qualquer arquivo do corpus.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { casos as f1 } from "./construcao/desenvolvimento/f1.mjs";
import { casos as f2 } from "./construcao/desenvolvimento/f2.mjs";
import { casos as f3 } from "./construcao/desenvolvimento/f3.mjs";
import { casos as f4 } from "./construcao/desenvolvimento/f4.mjs";
import { casos as f5a8 } from "./construcao/desenvolvimento/f5a8.mjs";
import { casos as reservados } from "./reserva/construcao/casos.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const arg = (nome, padrao) => (process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : padrao);
const CORPUS = resolve(AQUI, arg("--corpus", "../../govbr-corpus"));
const CATALOGO = resolve(AQUI, arg("--catalogo", "../../thesis-workspace/planejamento/atual/catalogo-controles-2026-10-15/catalogo.json"));
const DESTINO = join(CORPUS, "public", "controles");

/** Sal do id opaco: sem ele, quem tem o catálogo recalcularia qual página é qual gêmeo. Fica só no eval. */
const SAL = "bm-7c1e94d2a05b";
const ALA = { desenvolvimento: "a", reservado: "b" };

/** Vocabulário do gabarito que não pode aparecer em nenhum byte do corpus. */
export const PROIBIDAS = [
  /defeit/i, /conforme/i, /viola[cç]/i, /g[eê]meo/i, /\btwin\b/i, /esperad/i, /expected/i, /gabarito/i, /reserv[ao]do/i,
  /desenvolvimento/i, /fixture/i, /\bcaso\b/i, /\bF[1-8]-\d\d/, /\bT-01/, /excec/i, /exceç/i, /n[aã]o[- ]aplic/i,
  /\bwcag\b/i, /e-?mag/i, /\bconfirmed\b/i, /unsupported/i, /unverifiable/i, /\berrad[ao]\b/i, /incorret/i, /quebrad/i,
  /<!--/, /\/\*/, /\/\/ /,
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const idOpaco = (gemeo) => "c-" + sha256(`${SAL}:${gemeo}`).slice(0, 10);

function aplicar(texto, trocas, onde) {
  let saida = texto;
  for (const [antigo, novo] of trocas) {
    const n = saida.split(antigo).length - 1;
    if (n !== 1) throw new Error(`${onde}: o trecho trocado ocorre ${n} vezes (precisa ser 1): ${JSON.stringify(antigo.slice(0, 80))}`);
    saida = saida.replace(antigo, () => novo);
  }
  return saida;
}

// ---------------------------------------------------------------- catálogo
const catalogoBytes = readFileSync(CATALOGO);
const catalogo = JSON.parse(catalogoBytes);
const gemeosDoCatalogo = new Map();
for (const c of catalogo.casos) for (const g of c.gemeos) gemeosDoCatalogo.set(g.id, { caso: c, gemeo: g });

// ---------------------------------------------------------------- resolve páginas
const todos = [
  ...[...f1, ...f2, ...f3, ...f4, ...f5a8].map((c) => ({ ...c, divisao: "desenvolvimento" })),
  ...reservados.map((c) => ({ ...c, divisao: "reservado" })),
];

const gemeos = new Map();
for (const c of todos) {
  const doCatalogo = catalogo.casos.find((x) => x.id === c.caso);
  if (!doCatalogo) throw new Error(`caso ${c.caso} fora do catálogo`);
  if (doCatalogo.split !== c.divisao) throw new Error(`${c.caso}: divisão ${c.divisao} difere do catálogo (${doCatalogo.split})`);
  for (const g of c.gemeos) {
    if (!gemeosDoCatalogo.has(g.id)) throw new Error(`gêmeo ${g.id} fora do catálogo`);
    gemeos.set(g.id, { ...g, caso: c.caso, divisao: c.divisao, receitaCaso: c.receita, viewportCaso: c.viewport, notaCaso: c.nota });
  }
}
for (const c of catalogo.casos) for (const g of c.gemeos) if (!gemeos.has(g.id)) throw new Error(`gêmeo do catálogo sem página: ${g.id}`);

const paginas = new Map(); // gemeoId -> { id, ala, html, js }
function resolver(gid, pilha = []) {
  if (paginas.has(gid)) return paginas.get(gid);
  if (pilha.includes(gid)) throw new Error(`ciclo: ${[...pilha, gid].join(" → ")}`);
  const g = gemeos.get(gid);
  if (!g) throw new Error(`gêmeo desconhecido: ${gid}`);
  let r;
  if (g.mesmaPagina) {
    const base = resolver(g.mesmaPagina, [...pilha, gid]);
    if (gemeos.get(g.mesmaPagina).divisao !== g.divisao) throw new Error(`${gid}: mesmaPagina cruza divisões`);
    r = base;
  } else {
    const id = idOpaco(gid);
    const ala = ALA[g.divisao];
    let html, js;
    if (g.html) {
      html = g.html;
      js = g.js;
    } else if (g.de) {
      const base = resolver(g.de, [...pilha, gid]);
      html = aplicar(base.html.split(`${base.id}.js`).join("__JS__"), g.trocas ?? [], gid);
      js = base.js !== undefined ? aplicar(base.js, g.trocasJs ?? [], gid + " (js)") : undefined;
    } else if (g.copiaDe) {
      const base = resolver(g.copiaDe, [...pilha, gid]);
      html = base.html;
      js = base.js;
    } else throw new Error(`${gid}: sem html, de, copiaDe nem mesmaPagina`);
    if (js !== undefined) html = html.split("__JS__").join(`${id}.js`);
    if (html.includes("__JS__")) throw new Error(`${gid}: marcador de script sem script`);
    r = { id, ala, html, js, dono: gid };
  }
  paginas.set(gid, r);
  return r;
}
for (const gid of gemeos.keys()) resolver(gid);

// ---------------------------------------------------------------- isolamento
const unicas = new Map();
for (const p of paginas.values()) unicas.set(`${p.ala}/${p.id}`, p);
for (const [nome, p] of unicas) {
  for (const [ext, texto] of [["html", p.html], ["js", p.js]]) {
    if (texto === undefined) continue;
    for (const re of PROIBIDAS) if (re.test(texto)) throw new Error(`isolamento: ${nome}.${ext} contém ${re} (${p.dono})`);
  }
}

// ---------------------------------------------------------------- escreve o corpus
rmSync(DESTINO, { recursive: true, force: true });
const RECURSOS = join(DESTINO, "recursos");
mkdirSync(join(RECURSOS, "fontawesome", "css"), { recursive: true });
mkdirSync(join(RECURSOS, "fontawesome", "webfonts"), { recursive: true });
const NM = join(CORPUS, "node_modules");
const versao = (pkg) => JSON.parse(readFileSync(join(NM, pkg, "package.json"), "utf8")).version;
if (versao("@govbr-ds/core") !== "3.7.0") throw new Error("o corpus precisa do @govbr-ds/core 3.7.0");
copyFileSync(join(NM, "@govbr-ds/core/dist/core.min.css"), join(RECURSOS, "core.min.css"));
copyFileSync(join(NM, "@fortawesome/fontawesome-free/css/all.min.css"), join(RECURSOS, "fontawesome/css/all.min.css"));
for (const f of readdirSync(join(NM, "@fortawesome/fontawesome-free/webfonts")).filter((f) => f.endsWith(".woff2")))
  copyFileSync(join(NM, "@fortawesome/fontawesome-free/webfonts", f), join(RECURSOS, "fontawesome/webfonts", f));
copyFileSync(join(AQUI, "construcao/recursos/logo.svg"), join(RECURSOS, "logo.svg"));
copyFileSync(join(AQUI, "construcao/recursos/biblioteca.css"), join(RECURSOS, "biblioteca.css"));

function listar(raiz, prefixo = "") {
  const out = [];
  for (const e of readdirSync(join(raiz, prefixo), { withFileTypes: true })) {
    const rel = prefixo ? `${prefixo}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listar(raiz, rel));
    else if (e.name !== "manifesto.json") out.push(rel);
  }
  return out.sort();
}
function manifesto(pasta, meta) {
  const arquivos = {};
  for (const rel of listar(pasta)) arquivos[rel] = sha256(readFileSync(join(pasta, rel)));
  writeFileSync(join(pasta, "manifesto.json"), JSON.stringify({ _meta: meta, arquivos }, null, 2) + "\n");
  return arquivos;
}

for (const p of unicas.values()) {
  const pasta = join(DESTINO, p.ala);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, `${p.id}.html`), p.html);
  if (p.js !== undefined) writeFileSync(join(pasta, `${p.id}.js`), p.js);
}

const metaComum = {
  o_que_e: "Páginas estáticas da Biblioteca Municipal (serviço fictício de reservas e renovação de empréstimos), servidas sem rede.",
  regra: "Reproduzir, nunca reparar: os arquivos são gerados e conferidos byte a byte. Não edite à mão.",
};
const recursosHash = manifesto(RECURSOS, {
  ...metaComum,
  conteudo: "Folhas e fontes oficiais copiadas dos pacotes do corpus, mais a folha e o logotipo da biblioteca.",
  pacotes: { "@govbr-ds/core": versao("@govbr-ds/core"), "@fortawesome/fontawesome-free": versao("@fortawesome/fontawesome-free") },
});
const alaHash = {};
for (const ala of Object.values(ALA)) alaHash[ala] = manifesto(join(DESTINO, ala), { ...metaComum, ala });

// ---------------------------------------------------------------- expectativas (eval)
function expectativa(gid) {
  const g = gemeos.get(gid);
  const p = paginas.get(gid);
  const { caso, gemeo } = gemeosDoCatalogo.get(gid);
  const caminho = `/controles/${p.ala}/${p.id}.html`;
  const derivacao = g.de
    ? (() => {
        const b = paginas.get(g.de);
        return { de: g.de, paginaDe: `/controles/${b.ala}/${b.id}.html`, mudanca: g.mudanca ?? gemeo.mudancaControlada, trocas: g.trocas ?? [], trocasJs: g.trocasJs ?? [] };
      })()
    : g.copiaDe
      ? (() => {
          const b = paginas.get(g.copiaDe);
          return { de: g.copiaDe, paginaDe: `/controles/${b.ala}/${b.id}.html`, mudanca: "cópia byte a byte", trocas: [], trocasJs: [] };
        })()
      : null;
  return {
    gemeo: gid,
    caso: caso.id,
    familia: caso.familia,
    papel: gemeo.papel,
    descricaoCatalogo: gemeo.descricao,
    celulas: gemeo.celulas,
    alegacoes: (caso.alegacoes ?? []).filter((a) => a.gemeo === gid),
    pagina: {
      id: p.id,
      caminho,
      sha256: alaHash[p.ala][`${p.id}.html`],
      ...(p.js !== undefined ? { js: `/controles/${p.ala}/${p.id}.js`, jsSha256: alaHash[p.ala][`${p.id}.js`] } : {}),
      ...(g.mesmaPagina ? { mesmaPaginaDe: g.mesmaPagina } : {}),
    },
    viewport: g.viewport ?? g.viewportCaso ?? { width: 1280, height: 900 },
    toque: g.toque ?? false,
    receita: g.receita ?? g.receitaCaso ?? [{ acao: "capturar", nome: "inicial" }],
    fatos: g.fatos ?? {},
    axePermitido: g.axePermitido ?? [],
    ...(derivacao ? { derivacao } : {}),
    ...(g.pacote ? { pacote: g.pacote } : {}),
    ...(g.nota || g.notaCaso ? { nota: [g.notaCaso, g.nota].filter(Boolean).join(" ") } : {}),
  };
}

const ordem = catalogo.casos.flatMap((c) => c.gemeos.map((g) => g.id));
const meta = (divisao) => ({
  o_que_e:
    divisao === "reservado"
      ? "RESERVA do catálogo de controles: expectativas e medição independente. Nenhum detector roda nestas páginas até ser congelado (commit registrado); rodam uma vez. Ajuste feito depois de ver a reserva a converte em desenvolvimento (registro no log de decisões)."
      : "Catálogo de controles, divisão de DESENVOLVIMENTO: expectativas por gêmeo para a medição independente (controles/medir.mjs) e, depois, para pontuar detectores.",
  catalogo: { versao: catalogo.versao, arquivo: "thesis-workspace/planejamento/atual/catalogo-controles-2026-10-15/catalogo.json", sha256: sha256(catalogoBytes) },
  divisao,
  split: { seed: catalogo.split.seed, manifestoSha256: catalogo.split.manifestoSha256, casos: catalogo.casos.filter((c) => c.split === divisao).map((c) => c.id) },
  corpus: {
    ala: `/controles/${ALA[divisao]}/`,
    manifesto: `public/controles/${ALA[divisao]}/manifesto.json`,
    recursos: "public/controles/recursos/manifesto.json",
    recursosSha256: sha256(readFileSync(join(RECURSOS, "manifesto.json"))),
    alaManifestoSha256: sha256(readFileSync(join(DESTINO, ALA[divisao], "manifesto.json"))),
  },
  construcao: "node controles/construir.mjs (gera corpus + este arquivo); medição: node controles/medir.mjs",
  decisoes: "Q1 a (medição independente basta), Q2 a (mecanismo equivalente conta como conforme), Q3 a (F3-02-Q: violação do DS pela letra) — decisoes-do-assistente.md, 2026-10-15",
});
const lista = (divisao) => ordem.filter((gid) => gemeos.get(gid).divisao === divisao).map(expectativa);
const dev = { _meta: meta("desenvolvimento"), gemeos: lista("desenvolvimento") };
const res = { _meta: meta("reservado"), gemeos: lista("reservado") };
writeFileSync(join(AQUI, "expectativas.json"), JSON.stringify(dev, null, 2) + "\n");
mkdirSync(join(AQUI, "reserva"), { recursive: true });
writeFileSync(join(AQUI, "reserva", "expectativas.json"), JSON.stringify(res, null, 2) + "\n");

const contar = (d) => ({ gemeos: d.gemeos.length, paginas: new Set(d.gemeos.map((g) => g.pagina.id)).size, casos: new Set(d.gemeos.map((g) => g.caso)).size });
console.log(`recursos: ${Object.keys(recursosHash).length} arquivos`);
console.log(`desenvolvimento (ala a): ${JSON.stringify(contar(dev))}`);
console.log(`reserva (ala b): ${JSON.stringify(contar(res))}`);
