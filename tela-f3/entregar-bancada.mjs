/**
 * Tela F3 — entrega para a bancada (molde: tela-f2/entregar-bancada.mjs, que usou o formato tela-f2-para-bancada-1.0.0).
 * Copia, por `git archive` do commit do selo, a referência e tela-f3/ para .tmp-eval/tela-f3-para-bancada/ (bytes do
 * commit, caminhos relativos à raiz do govbr-eval) e grava MANIFESTO.json com sha256 de tudo, o que `telas.json ›
 * processos-f3` tem de declarar, o plano de estados, os commits do corpus e do pnip-mock e a lista do build.
 * Nenhuma descrição de spec no manifesto.
 * Uso: node tela-f3/entregar-bancada.mjs
 */
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join, relative, sep } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SAIDA = "F:/Dev Nath/TCC/.tmp-eval/tela-f3-para-bancada";
const sha = b => createHash("sha256").update(b).digest("hex");
const git = (...a) => execFileSync("git", ["-C", RAIZ, ...a], { encoding: "utf8", maxBuffer: 1 << 30 }).trim();
const selo = git("rev-parse", "HEAD");
const congelamento = git("log", "-1", "--format=%H", "--", "ground-truth-processos-f3.json");
if (git("status", "--porcelain", "--", "ground-truth-processos-f3.json", "tela-f3")) throw new Error("árvore suja: commite antes de entregar");
rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });
const tar = execFileSync("git", ["-C", RAIZ, "archive", "--format=tar", selo, "ground-truth-processos-f3.json", "tela-f3"], { maxBuffer: 1 << 30 });
execFileSync("tar", ["-xf", "-", "-C", SAIDA], { input: tar });
const listar = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(join(d, e.name)) : [join(d, e.name)]);
const arquivos = listar(SAIDA).map(p => relative(SAIDA, p).split(sep).join("/")).filter(p => p !== "MANIFESTO.json").sort().map(c => ({ caminho: c, sha256: sha(readFileSync(join(SAIDA, c))) }));
const S = c => { const a = arquivos.find(x => x.caminho === c); if (!a) throw new Error(`falta ${c}`); return a.sha256; };
const ref = JSON.parse(readFileSync(join(SAIDA, "ground-truth-processos-f3.json"), "utf8"));
const telas = JSON.parse(readFileSync(join(RAIZ, "telas.json"), "utf8"))["processos-f3"];
const pag = JSON.parse(readFileSync(join(SAIDA, "tela-f3/pagina-congelada.json"), "utf8"));
const conf = JSON.parse(readFileSync(join(SAIDA, "tela-f3/conformes.json"), "utf8"));
const est = JSON.parse(readFileSync(join(SAIDA, "tela-f3/estratos-1.0.0.json"), "utf8"));
const cri = JSON.parse(readFileSync(join(SAIDA, "tela-f3/criterios-de-julgamento.json"), "utf8"));
const refSha = S("ground-truth-processos-f3.json");
if (est.referencia.sha256 !== refSha || cri._meta.referencia.sha256 !== refSha) throw new Error("estratos ou critérios não citam a referência congelada");
const man = {
  formato: "tela-f3-para-bancada-1.0.0",
  origem: { repositorio: "govbr-eval", ramo: "tela-f3", commitDoCongelamento: congelamento, commitDoSelo: selo,
    nota: "o commit do congelamento traz só a referência; o do selo (seguinte) traz o resto de tela-f3/: estratos e critérios citando a referência congelada, classes, página congelada, conferência final e registro. Os arquivos aqui são os bytes do commit do selo (git archive), nos caminhos relativos à raiz do repositório." },
  telasJson: {
    tela: "processos-f3",
    reference: "ground-truth-processos-f3.json",
    referenceSha256: refSha,
    entry: telas.entry,
    estratos: { arquivo: "tela-f3/estratos-1.0.0.json", sha256: S("tela-f3/estratos-1.0.0.json") },
    criteriosDeJulgamento: { arquivo: "tela-f3/criterios-de-julgamento.json", sha256: S("tela-f3/criterios-de-julgamento.json") },
    niveis: null,
    isolamentoSite: { arvore: telas.isolamento.site.arvore, excluir: telas.isolamento.site.excluir, indice: telas.isolamento.site.indice, aliases: telas.isolamento.site.aliases },
    nota: "a entrada processos-f3 já existe no ramo bancada-f3 (7ec31b0) com reference: null; o commit pequeno troca reference e acrescenta estratos e criteriosDeJulgamento (nunca niveis: a regra recusa níveis e estratos juntos) e põe processos-f3 na lista de telas com critérios em scripts/reanalise-nat74/test-e14-criterios.ts (linha 171)",
  },
  planoDeEstados: {
    url: ref._meta.url, waitFor: ref._meta.waitFor, viewport: ref._meta.viewport,
    setup: ref._meta.setup, states: ref._meta.states.map(({ id, afterStep, path }) => ({ id, afterStep, path })),
    paradas: ref._meta.states.length, segmentos: ref._meta.estados_resumo.segmentos, segmentosComParada: ref._meta.estados_resumo.segmentosComParada,
  },
  paginaCongelada: { arquivo: "tela-f3/pagina-congelada.json", sha256: S("tela-f3/pagina-congelada.json"),
    corpus: `govbr-corpus ramo tela-f3 ${pag._meta.corpus.commit.slice(0, 7)}, public/pnip-f3/ (manifesto sha256 ${pag._meta.corpus.manifestoSha256})`,
    corpusCommit: pag._meta.corpus.commit, pnipMock: "pnip-mock ramo tela-f3 088a086 (forkCommit " + pag._meta.corpus.forkCommit + ")",
    sha256Lista: pag.sha256Lista, arquivos: pag.n, semSemente: pag._meta.semSemente.sha256Lista },
  contagens: {
    specs: ref.violations.length, unidades: ref.violations.reduce((n, v) => n + (v.expectedCount ?? 1), 0),
    estratos: { semeado: ref._meta.estratos.semeado.specs.length, natural: ref._meta.estratos.natural.specs.length, exposto: ref._meta.estratos.exposto.specs.length },
    paradas: ref._meta.states.length, segmentos: ref._meta.estados_resumo.segmentos, segmentosComParada: ref._meta.estados_resumo.segmentosComParada.length, controles: conf.itens.length,
    predicadosNasSemeadas: ref.violations.filter(v => ref._meta.estratos.semeado.specs.includes(v.id) && v.acceptance).length,
    naturaisReancoradas: Object.keys(ref._meta.estratos.natural.reancoradas ?? {}).length,
  },
  classes: {
    nat71: { arquivo: "tela-f3/classes-nat71/classes-finais.json", sha256: S("tela-f3/classes-nat71/classes-finais.json") },
    d156: { arquivo: "tela-f3/classes-d156-1.0.0.json", sha256: S("tela-f3/classes-d156-1.0.0.json") },
  },
  notas: [
    "tela-f3/ fica fora do checkout esparso da CI (bancada-f3 fa7dda7: !/tela-f3/).",
    "`check-reference` final: tela-f3/conferir-referencia-1.0.0.log (0 problemas, na ala do corpus tela-f3 9d194d7).",
    "Uma natural reancorada no mesmo elemento (a mesma troca da F2): _meta.estratos.natural.reancoradas (descrição e classe da D).",
    "Nenhuma descrição de spec neste manifesto.",
  ],
  arquivos,
};
writeFileSync(join(SAIDA, "MANIFESTO.json"), JSON.stringify(man, null, 1) + "\n");
console.log(`${arquivos.length} arquivos; referência ${refSha}; selo ${selo}; congelamento ${congelamento}; MANIFESTO ${sha(readFileSync(join(SAIDA, "MANIFESTO.json")))}`);
