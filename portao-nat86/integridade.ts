/**
 * NAT-86 — conferências de integridade do portão sem modelo (plano §4.2–§4.4). Não escreve em
 * govbr-resultados: lê, e adultera só CÓPIAS numa pasta temporária.
 *
 *   npm run portao:integridade -- [--resultados ../govbr-resultados] [--pacote-v2 <pasta de um pacote findings.v2>]
 *                                 [--saida <arquivo de registro>]
 *
 * 1. Invariância do legado: todo `analises/<campanha>/<par>/revisoes/<rev>/` com `revisao/package.json`,
 *    `revisao/reviews.json` e `score.json` é pontuado de novo pelo código atual, pelo mesmo caminho do
 *    CLI `score` (sem a trava de hash do pacote, que por desenho recusa código novo), e o JSON é
 *    comparado byte a byte com o `score.json` arquivado (como em nat72/nat84-invariancia-legado).
 * 2. Adulteração: cópias de pacotes de execução arquivados (`restauracoes/`) são lidas por `lerPacote`
 *    (o leitor do `analisar`) intactas e depois com UMA mudança cada — 1 byte de evidência, 1 byte do
 *    findings, arquivo a mais, arquivo a menos, hash do manifesto trocado; com `--pacote-v2`, também 1
 *    byte de um payload integral de ferramenta. Toda cópia adulterada tem de ser recusada.
 * 3. Gabarito fora do alcance do agente: nenhum arquivo do pacote de telas exportado (o que a imagem
 *    `screens` serve e o agente lê) nem dos contextos das imagens tem o sha256 de um gabarito, das
 *    expectativas dos controles ou da matriz, nem cita o nome de um deles.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { arg } from "../comparadores/comum";
import { RAIZ_EVAL, RAIZ_TCC } from "./comum";
import { normalizeReviews, scoreSemanticPackage, reviewQueue, validatePackage, SEMANTIC_SCORING_VERSION, type RawReviews, type SemanticPackage } from "../scripts/semantic-flow";
import { lerPacote } from "../scripts/analisar-execucao";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const ler = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as T;
const linhas: string[] = [];
const log = (s: string) => { linhas.push(s); console.log(s); };

function andar(dir: string, fora: (rel: string) => boolean = () => false, base = dir): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const rel = relative(base, p).split("\\").join("/");
    if (fora(rel)) continue;
    if (e.isDirectory()) out.push(...andar(p, fora, base));
    else out.push(rel);
  }
  return out;
}

// ------------------------------------------------------------------ 1. invariância do legado
/**
 * Exclusões históricas INTENCIONAIS, exatas: o piloto pontuado em flow-semantic-1.4.0, que o scorer
 * atual recusa por desenho (nat84-invariancia-legado). Qualquer outra recusa ou erro é falha, e a
 * contagem de pacotes reproduzidos tem de ser a esperada — um pacote histórico que deixa de carregar
 * não pode passar como "fora do escopo".
 */
export const EXCLUSOES_HISTORICAS: Record<string, RegExp> = Object.fromEntries(
  ["piloto-01/par-01/rev-001", "piloto-01/par-01/rev-002", "piloto-01/par-01/rev-003", "piloto-01/par-01/rev-004", "piloto-01/par-02/rev-001", "piloto-01/par-02/rev-002"]
    .map((k) => [k, /Incompatible semantic scoring version: flow-semantic-1\.4\.0/]));
/** Pacotes que têm de sair idênticos (t7-tela-a-01 20 + t7-tela-b-01 23 + t7b-sonnet-tela-a-01 20, nat84). */
export const PACOTES_ESPERADOS = 63;

function invariancia(resultados: string) {
  log(`\n## 1. Invariância do legado — scorer atual ${SEMANTIC_SCORING_VERSION}`);
  const raiz = join(resultados, "analises");
  let igual = 0, difere = 0, fora = 0;
  for (const camp of readdirSync(raiz).sort()) for (const par of readdirSync(join(raiz, camp)).sort()) {
    const revs = join(raiz, camp, par, "revisoes");
    if (!existsSync(revs)) continue;
    for (const rev of readdirSync(revs).sort()) {
      const d = join(revs, rev);
      const pkgPath = join(d, "revisao", "package.json"), revPath = join(d, "revisao", "reviews.json"), scorePath = join(d, "score.json");
      if (!existsSync(pkgPath) || !existsSync(revPath) || !existsSync(scorePath)) continue;
      const rotulo = `${camp}/${par}/${rev}`;
      try {
        const pkg = ler<SemanticPackage>(pkgPath);
        validatePackage(pkg);
        const reviews = normalizeReviews(ler<RawReviews>(revPath));
        const result = scoreSemanticPackage(pkg, reviews);
        const fila = reviewQueue(pkg, reviews);
        const novo = JSON.stringify({ ...result, fila, provenance: pkg.provenance }, null, 2) + "\n";
        const antigo = readFileSync(scorePath);
        if (sha(novo) === sha(antigo)) { igual++; log(`IGUAL  ${rotulo} pacote ${pkg.version} · ${pkg.cards.length} cartões · sha256 ${sha(antigo).slice(0, 16)}`); }
        else { difere++; log(`DIFERE ${rotulo} pacote ${pkg.version} · arquivado ${sha(antigo).slice(0, 16)} · recalculado ${sha(novo).slice(0, 16)}`); }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const permitido = EXCLUSOES_HISTORICAS[rotulo];
        if (permitido && permitido.test(msg)) { fora++; log(`FORA   ${rotulo} (exclusão histórica declarada: ${msg.slice(0, 120)})`); }
        else { difere++; log(`ERRO   ${rotulo} (${msg.slice(0, 160)}) — não é exclusão declarada`); }
      }
    }
  }
  const faltam = Object.keys(EXCLUSOES_HISTORICAS).length - fora;
  if (igual !== PACOTES_ESPERADOS) { difere++; log(`FALHA  ${igual} pacotes reproduzidos, esperados ${PACOTES_ESPERADOS}`); }
  if (faltam !== 0) { difere++; log(`FALHA  ${faltam} exclusão(ões) declarada(s) não encontrada(s)`); }
  log(`resultado: ${igual} idênticos (esperados ${PACOTES_ESPERADOS}), ${difere} falha(s), ${fora} exclusões declaradas`);
  return { igual, difere, fora };
}

// ------------------------------------------------------------------ 2. adulteração
function adulteracao(resultados: string, pacoteV2: string | null) {
  log("\n## 2. Adulteração de pacotes (cópias)");
  const tmp = mkdtempSync(join(tmpdir(), "portao-nat86-adulteracao-"));
  let recusadas = 0, aceitas = 0, intactosOk = 0, fontesComPayload = 0;
  const casos: { nome: string; mudar: (dir: string, manifesto: { files: { path: string; role: string; sha256: string }[] }) => void }[] = [
    { nome: "1 byte de evidência", mudar: (d, m) => { const f = m.files.find((x) => x.role === "evidence")!; const p = join(d, f.path); const b = readFileSync(p); b[Math.floor(b.length / 2)] ^= 1; writeFileSync(p, b); } },
    { nome: "1 byte do findings", mudar: (d, m) => { const f = m.files.find((x) => x.role === "findings")!; const p = join(d, f.path); const b = readFileSync(p); b[Math.floor(b.length / 2)] ^= 1; writeFileSync(p, b); } },
    { nome: "arquivo a mais", mudar: (d) => writeFileSync(join(d, "evidence", "extra.txt"), "x") },
    { nome: "arquivo a menos", mudar: (d, m) => unlinkSync(join(d, m.files.find((x) => x.role === "evidence")!.path)) },
    { nome: "hash do manifesto trocado", mudar: (d) => { const p = join(d, "artifact-manifest.json"); const t = readFileSync(p, "utf8"); writeFileSync(p, t.replace(/"sha256": "([0-9a-f])/, (_s, c) => `"sha256": "${c === "0" ? "1" : "0"}`)); } },
  ];
  const tentar = (rotulo: string, dir: string, deveAceitar: boolean) => {
    try {
      lerPacote(dir);
      if (deveAceitar) { intactosOk++; log(`ok     ${rotulo}: lido`); } else { aceitas++; log(`FALHA  ${rotulo}: ADULTERADO ACEITO`); }
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 140);
      if (deveAceitar) { aceitas++; log(`FALHA  ${rotulo}: intacto recusado (${msg})`); } else { recusadas++; log(`ok     ${rotulo}: recusado (${msg})`); }
    }
  };
  try {
    const restaur = join(resultados, "restauracoes");
    const runs = readdirSync(restaur).sort();
    // um sem e um com de campanhas diferentes: o primeiro e o último arquivados
    const escolhidos = [runs[0], runs[runs.length - 1]];
    const fontes: string[] = [];
    for (const r of escolhidos) { const sub = readdirSync(join(restaur, r))[0]; fontes.push(join(restaur, r, sub)); }
    if (pacoteV2) fontes.push(resolve(pacoteV2));
    for (const fonte of fontes) {
      const nome = relative(resultados, fonte).split("\\").join("/");
      const manifesto = ler<{ contract: string; files: { path: string; role: string; sha256: string }[] }>(join(fonte, "artifact-manifest.json"));
      const intacto = join(tmp, `i-${sha(nome).slice(0, 8)}`);
      cpSync(fonte, intacto, { recursive: true });
      tentar(`${nome} [${manifesto.contract}] intacto`, intacto, true);
      const todos = [...casos];
      if (manifesto.files.some((f) => f.role === "tool-payload")) {
        fontesComPayload++;
        todos.push({ nome: "1 byte de payload integral", mudar: (d, m) => { const f = m.files.find((x) => x.role === "tool-payload")!; const p = join(d, f.path); const b = readFileSync(p); b[Math.floor(b.length / 2)] ^= 1; writeFileSync(p, b); } });
      }
      for (const c of todos) {
        const d = join(tmp, `a-${sha(nome + c.nome).slice(0, 8)}`);
        cpSync(fonte, d, { recursive: true });
        c.mudar(d, manifesto);
        tentar(`${nome} [${manifesto.contract}] ${c.nome}`, d, false);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (!pacoteV2) { aceitas++; log("FALHA  sem --pacote-v2: o pacote findings.v2 com payload integral é obrigatório no portão"); }
  else if (!fontesComPayload) { aceitas++; log("FALHA  o --pacote-v2 não tem arquivo tool-payload"); }
  log(`resultado: ${recusadas} adulteradas recusadas, ${aceitas} falhas (adulterada aceita, intacta recusada ou cobertura faltando), ${intactosOk} intactas lidas`);
  return { recusadas, falhas: aceitas, intactosOk };
}

// ------------------------------------------------------------------ 3. gabarito fora do alcance do agente
function gabarito() {
  log("\n## 3. Gabarito fora do alcance do agente (pacote de telas e contextos das imagens)");
  const segredos: { nome: string; sha: string }[] = [];
  for (const f of readdirSync(RAIZ_EVAL).filter((n) => /^ground-truth.*\.json$|^organic-ground-truth\.json$|^adjudications\.json$/.test(n))) segredos.push({ nome: f, sha: sha(readFileSync(join(RAIZ_EVAL, f))) });
  for (const f of ["controles/expectativas.json", "controles/reserva/expectativas.json", "portao-nat86/matriz.json"]) {
    const p = join(RAIZ_EVAL, f);
    if (existsSync(p)) segredos.push({ nome: f, sha: sha(readFileSync(p)) });
  }
  // Nomes de ARQUIVO de gabarito em qualquer alvo; a palavra "gabarito" só no que o agente lê como
  // texto (o pacote de telas e a skill) — nos fontes do oráculo e do runner ela aparece em comentários
  // de código, que o agente não lê (fala com o oráculo só por MCP).
  const arquivosSecretos = ["ground-truth", "expectativas.json", "matriz.json", "adjudications"];
  const alvos: { rotulo: string; dir: string; nomes: string[]; fora?: (r: string) => boolean }[] = [
    { rotulo: "govbr-telas (pacote exportado: imagem screens + skill do agente)", dir: join(RAIZ_TCC, "govbr-telas"), nomes: [...arquivosSecretos, "gabarito"], fora: (r) => r === ".git" || r.startsWith(".git/") },
    { rotulo: "runner/container (imagens agent/collector/egress)", dir: join(RAIZ_EVAL, "runner", "container"), nomes: arquivosSecretos },
    { rotulo: "govbr-ds-validator/dist (imagem oracle)", dir: join(RAIZ_TCC, "govbr-ds-validator", "dist"), nomes: arquivosSecretos },
    { rotulo: "govbr-ds-validator/data (imagem oracle)", dir: join(RAIZ_TCC, "govbr-ds-validator", "data"), nomes: arquivosSecretos },
  ];
  let achados = 0, arquivos = 0;
  const shas = new Map(segredos.map((s) => [s.sha, s.nome]));
  for (const a of alvos) {
    let n = 0;
    for (const rel of andar(a.dir, a.fora)) {
      const p = join(a.dir, rel);
      if (statSync(p).size > 50_000_000) continue;
      const b = readFileSync(p);
      n++;
      const h = shas.get(sha(b));
      if (h) { achados++; log(`FALHA  ${a.rotulo}: ${rel} é cópia de ${h}`); }
      if (/\.(m?js|json|html|md|ts|txt|css)$/.test(rel)) {
        const t = b.toString("utf8");
        for (const nome of a.nomes) if (t.includes(nome)) { achados++; log(`FALHA  ${a.rotulo}: ${rel} cita "${nome}"`); }
      }
    }
    arquivos += n;
    log(`ok     ${a.rotulo}: ${n} arquivos conferidos`);
  }
  if (arquivos === 0) { achados++; log("FALHA  nenhum arquivo conferido"); }
  log(`resultado: ${arquivos} arquivos, ${achados} ocorrência(s) de gabarito`);
  return { arquivos, achados };
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("integridade.ts")) {
  const resultados = resolve(arg("--resultados", join(RAIZ_TCC, "govbr-resultados"))!);
  const saida = arg("--saida");
  log(`# NAT-86 — integridade (${new Date().toISOString()}) · node ${process.version}`);
  const i = invariancia(resultados);
  const a = adulteracao(resultados, arg("--pacote-v2"));
  const g = gabarito();
  const falhou = i.difere > 0 || a.falhas > 0 || g.achados > 0;
  log(`\nPORTÃO integridade: ${falhou ? "FALHA" : "ok"}`);
  if (saida) { writeFileSync(saida, linhas.join("\n") + "\n"); }
  if (falhou) process.exitCode = 2;
}
