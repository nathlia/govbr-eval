// Testes do sorteio e da reposição da tela E2 com fixture SINTÉTICA (item B do coordenador). Nunca roda o sorteio sobre
// a elegibilidade real. Uso: node --test tela-e2/sortear-sementes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { main, montarCelulas, resolver, cotasEfetivas, repor, compativeis, chave, chaveNeutra, Recusa } from "./sortear-sementes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEMENTE = "0123456789abcdef0123456789abcdef01234567";
const OUTRA = "fedcba9876543210fedcba9876543210fedcba98";
const PARAMS = {
  _meta: { status: "SELADO" }, semente: SEMENTE, ordemClasses: ["DS", "G"], cotas: { DS: 6, G: 3 }, portaoDS: 5, reposicaoMinimaDS: 2,
  metaFolga: { celulasDS: 12, hospedeirosDS: 8 }, maxPorHospedeiro: 1, maxPorRegra: 1, compartilhadas: 0, limiteNos: 1e6,
  classeDaCategoria: { token: "ds", estrutura: "ds", tipografia: "ds", componente: "ds", comportamento: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral" },
  motivosDeExclusao: ["sem-clausula-na-base", "exposta", "tentativa-e", "classe-em-desacordo"],
  motivosDeDescarte: ["nao-observavel", "estado-inalcancavel", "quebra-fluxo", "interfere", "nao-construivel"],
  insumos: ["tela-e2/parametros.json", "tela-e2/sortear-sementes.mjs", "tela-e2/elegibilidade.json", "tela-e2/exclusoes.json", "tela-e2/classe-reavaliada.json"],
};
const ef = (toca = ["$:raiz"], extra = {}) => ({ toca, remove: [], cascata: [], estado: null, nota: "x", ...extra });
/** Unidade sintética: id, hospedeiros, classe (por categorias), variantes opcionais. */
const un = (id, hosts, cls, variantes) => ({ id, passo2: "aceita", instancias: hosts, categorias: cls === "DS" ? ["token"] : ["acessibilidade"], variantes: variantes ?? [{ id: "v1", efeitos: ef() }] });
function fixtureElig(nDS = 10, nG = 5, hostsN = 12) {
  const regras = [];
  for (let i = 0; i < nDS; i++) regras.push(un(`ds${i}`, [`h${i % hostsN}`, `h${(i + 3) % hostsN}`], "DS"));
  for (let i = 0; i < nG; i++) regras.push(un(`g${i}`, [`h${(i + 6) % hostsN}`, `h${(i + 9) % hostsN}`], "G"));
  return { regras };
}
const classeDe = (elig, discorda = new Set()) => {
  const { celulas } = montarCelulas({ elegibilidade: elig, exclusoes: { porUnidade: {} } }, { ...PARAMS, motivosDeExclusao: [] });
  return { porCelula: Object.fromEntries(celulas.map(c => [c.id, { classe1: c.classe, classe2: discorda.has(c.id) ? (c.classe === "DS" ? "G" : "DS") : c.classe }])) };
};
const git = (dir, ...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" } }).trim();
function repo({ elig = fixtureElig(), params = PARAMS, auth = SEMENTE, classe } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "e2-sorteio-"));
  mkdirSync(join(dir, "tela-e2"));
  git(dir, "init", "-q"); git(dir, "config", "user.email", "t@t"); git(dir, "config", "user.name", "t"); git(dir, "config", "commit.gpgsign", "false");
  copyFileSync(join(HERE, "sortear-sementes.mjs"), join(dir, "tela-e2/sortear-sementes.mjs"));
  const w = (f, o) => writeFileSync(join(dir, "tela-e2", f), JSON.stringify(o, null, 1) + "\n");
  w("elegibilidade.json", elig); w("exclusoes.json", { porUnidade: {} }); w("classe-reavaliada.json", classe ?? classeDe(elig));
  w("parametros.json", { ...params, _meta: { status: "RASCUNHO" } });
  git(dir, "add", "-A"); git(dir, "commit", "-q", "-m", "rascunho");
  w("parametros.json", params);
  git(dir, "add", "-A"); git(dir, "commit", "-q", "--allow-empty", "-m", "selo");
  if (auth) w("semente-autorizada.json", { semente: auth });
  return dir;
}
const lerSorteio = dir => JSON.parse(readFileSync(join(dir, "tela-e2/sorteio.json"), "utf8"));
const silencio = f => { const l = console.log; console.log = () => {}; try { return f(); } finally { console.log = l; } };

test("chave é determinística e depende da semente", () => {
  assert.equal(chave(SEMENTE, "celula", "x"), chave(SEMENTE, "celula", "x"));
  assert.notEqual(chave(SEMENTE, "celula", "x"), chave(OUTRA, "celula", "x"));
});

test("determinismo: mesma semente e mesmos insumos dão o mesmo sorteio em dois repositórios", () => {
  const a = repo(), b = repo();
  silencio(() => main(["--semente", SEMENTE, "--raiz", a])); silencio(() => main(["--semente", SEMENTE, "--raiz", b]));
  const sa = lerSorteio(a), sb = lerSorteio(b);
  assert.deepEqual(sa.sementes, sb.sementes);
  assert.deepEqual(sa.ordemPorClasse, sb.ordemPorClasse);
  assert.equal(sa.sementes.filter(s => s.classe === "DS").length, 6);
  assert.equal(sa.sementes.filter(s => s.classe === "G").length, 3);
  assert.equal(new Set(sa.sementes.map(s => s.sitio)).size, 9, "um defeito por hospedeiro");
  assert.equal(new Set(sa.sementes.map(s => s.regra)).size, 9, "uma semente por regra");
  // a mesma busca com outra semente dá outra ordem (sanidade de que a semente entra)
  const { celulas } = montarCelulas({ elegibilidade: fixtureElig(), exclusoes: { porUnidade: {} }, classe: classeDe(fixtureElig()) }, PARAMS);
  const o1 = resolver(celulas, PARAMS, { DS: 6, G: 3 }, (l, id) => chave(SEMENTE, l, id)).ordemPorClasse.DS.map(x => x.id);
  const o2 = resolver(celulas, PARAMS, { DS: 6, G: 3 }, (l, id) => chave(OUTRA, l, id)).ordemPorClasse.DS.map(x => x.id);
  assert.notDeepEqual(o1, o2);
  for (const d of [a, b]) rmSync(d, { recursive: true, force: true });
});

test("uma vez: recusa se sorteio.json existe, e se já existiu no histórico", () => {
  const d = repo();
  silencio(() => main(["--semente", SEMENTE, "--raiz", d]));
  assert.throws(() => main(["--semente", SEMENTE, "--raiz", d]), e => e instanceof Recusa && /já existe/.test(e.message));
  git(d, "add", "-A"); git(d, "commit", "-q", "-m", "sorteio");
  for (const f of ["sorteio.json", "sorteio-execucao.json"]) rmSync(join(d, "tela-e2", f));
  assert.throws(() => main(["--semente", SEMENTE, "--raiz", d]), e => e instanceof Recusa && /histórico/.test(e.message));
  rmSync(d, { recursive: true, force: true });
});

test("recusa sem semente, com semente errada, sem autorização, ou com parâmetros não selados", () => {
  const d = repo();
  assert.throws(() => main(["--semente", "--raiz", d]), e => e instanceof Recusa && /sem valor/.test(e.message));
  assert.throws(() => main(["--raiz", d]), e => e instanceof Recusa && /exatamente um modo/.test(e.message));
  assert.throws(() => main(["--semente", "abc", "--raiz", d]), e => e instanceof Recusa && /40 hex/.test(e.message));
  assert.throws(() => main(["--semente", OUTRA, "--raiz", d]), e => e instanceof Recusa && /fixada/.test(e.message));
  assert.ok(!existsSync(join(d, "tela-e2/sorteio.json")));
  const semAuth = repo({ auth: null });
  assert.throws(() => main(["--semente", SEMENTE, "--raiz", semAuth]), e => e instanceof Recusa && /semente-autorizada/.test(e.message));
  const rasc = repo({ params: { ...PARAMS, _meta: { status: "RASCUNHO" } } });
  assert.throws(() => main(["--semente", SEMENTE, "--raiz", rasc]), e => e instanceof Recusa && /SELADO/.test(e.message));
  // insumo mudado depois do selo
  const mud = repo();
  writeFileSync(join(mud, "tela-e2/exclusoes.json"), JSON.stringify({ porUnidade: { ds0: { semClausula: true } } }));
  assert.throws(() => main(["--semente", SEMENTE, "--raiz", mud]), e => e instanceof Recusa && /difere do commit do selo/.test(e.message));
  for (const x of [d, semAuth, rasc, mud]) rmSync(x, { recursive: true, force: true });
});

test("cota e déficit: DS limitado por hospedeiros cai pela conta; G cai sem transferência; portão inalcançável recusa", () => {
  // 4 hospedeiros para DS: DS_ef = 4
  const elig = { regras: [...Array.from({ length: 8 }, (_, i) => un(`ds${i}`, [`h${i % 4}`], "DS")), ...Array.from({ length: 4 }, (_, i) => un(`g${i}`, [`k${i}`], "G"))] };
  const { celulas } = montarCelulas({ elegibilidade: elig, exclusoes: { porUnidade: {} }, classe: classeDe(elig) }, PARAMS);
  assert.deepEqual(cotasEfetivas(celulas, PARAMS), { DS: 4, G: 3 });
  const d = repo({ elig });
  assert.throws(() => main(["--semente", SEMENTE, "--raiz", d]), e => e instanceof Recusa && /portão/.test(e.message));
  assert.ok(!existsSync(join(d, "tela-e2/sorteio.json")) && !existsSync(join(d, "tela-e2/sorteio-falha.json")), "a semente não é usada");
  // G só em hospedeiros que o DS ocupa: G_ef calculado com DS_ef fixo
  const e2 = { regras: [...Array.from({ length: 6 }, (_, i) => un(`ds${i}`, [`h${i}`], "DS")), un("g0", ["h0"], "G"), un("g1", ["k1"], "G"), un("g2", ["k2"], "G")] };
  const c2 = montarCelulas({ elegibilidade: e2, exclusoes: { porUnidade: {} }, classe: classeDe(e2) }, PARAMS).celulas;
  assert.deepEqual(cotasEfetivas(c2, PARAMS), { DS: 6, G: 2 });
  // reposição mínima: DS elegíveis − DS_ef < 2 recusa
  const d3 = repo({ elig: e2 });
  assert.throws(() => main(["--semente", SEMENTE, "--raiz", d3]), e => e instanceof Recusa && /reposição DS/.test(e.message));
  for (const x of [d, d3]) rmSync(x, { recursive: true, force: true });
});

test("exclusão por desacordo de classe e recusa sem segunda classificação", () => {
  const elig = fixtureElig();
  const { celulas } = montarCelulas({ elegibilidade: elig, exclusoes: { porUnidade: {} }, classe: classeDe(elig, new Set(["h0::ds0", "h6::g0"])) }, PARAMS);
  assert.ok(!celulas.some(c => c.id === "h0::ds0" || c.id === "h6::g0"));
  assert.ok(celulas.some(c => c.id === "h3::ds0"));
  assert.throws(() => montarCelulas({ elegibilidade: elig, exclusoes: { porUnidade: {} }, classe: { porCelula: {} } }, PARAMS), e => e instanceof Recusa && /segunda classificação/.test(e.message));
});

test("compatibilidade: colocações incompatíveis nunca saem juntas", () => {
  const a = { host: "h1", toca: ["h2:raiz"], remove: [], cascata: [], estado: null };
  const b = { host: "h2", toca: ["h2:raiz"], remove: [], cascata: [], estado: null };
  assert.equal(compativeis(a, b), false);
  assert.equal(compativeis({ ...a, toca: ["h1:raiz"], cascata: ["h2"] }, { ...b, toca: ["h2:x"] }), false);
  assert.equal(compativeis({ ...a, toca: ["h1:raiz"], estado: "recarga" }, { ...b, estado: "navegacao" }), false);
  assert.equal(compativeis({ ...a, toca: ["h1:raiz"] }, b), true);
  // solução: ds0 em h0 toca h1 → não sai junto com nada em h1
  const elig = { regras: [un("ds0", ["h0"], "DS", [{ id: "v1", efeitos: ef(["$:raiz", "h1:raiz"]) }]), ...Array.from({ length: 9 }, (_, i) => un(`ds${i + 1}`, [`h${i + 1}`], "DS")), ...Array.from({ length: 4 }, (_, i) => un(`g${i}`, [`k${i}`], "G"))] };
  const { celulas } = montarCelulas({ elegibilidade: elig, exclusoes: { porUnidade: {} }, classe: classeDe(elig) }, PARAMS);
  for (const s of [SEMENTE, OUTRA]) {
    const r = resolver(celulas, PARAMS, { DS: 6, G: 3 }, (l, id) => chave(s, l, id));
    const hs = r.sementes.map(x => x.sitio);
    assert.ok(!(hs.includes("h0") && hs.includes("h1")));
  }
});

test("reposição: próxima célula da mesma ordem depois da posição que saiu, que caiba; déficit quando nenhuma cabe", () => {
  const v = h => ({ id: "v1", host: h, toca: [`${h}:raiz`], remove: [], cascata: [], estado: null });
  const cel = (id, sitio, regra, classe) => ({ id, sitio, regra, classe, variantes: [v(sitio)] });
  const ordem = {
    DS: [cel("h1::a", "h1", "a", "DS"), cel("h2::b", "h2", "b", "DS"), cel("h0::z", "h0", "z", "DS"), cel("h3::a", "h3", "a", "DS"), cel("h2::c", "h2", "c", "DS"), cel("h4::d", "h4", "d", "DS"), cel("h5::e", "h5", "e", "DS")],
    G: [cel("k1::g", "k1", "g", "G"), cel("k1::h", "k1", "h", "G")],
  };
  const sorteio = { ordemPorClasse: ordem, sementes: [{ id: "h1::a", variante: v("h1") }, { id: "h2::b", variante: v("h2") }, { id: "k1::g", variante: v("k1") }] };
  // sai h1::a (pos 0): h0::z (pos 2) vem antes de h3::a? ordem: pos1 h2::b vigente; pos2 h0::z cabe → entra
  let r = repor(sorteio, [{ celula: "h1::a", motivo: "nao-observavel", evidencia: "medida" }], PARAMS);
  assert.deepEqual(r.substituicoes, [{ saiu: "h1::a", motivo: "nao-observavel", entrou: "h0::z" }]);
  // sai h2::b (pos 1): h0::z cabe (pos 2)
  r = repor(sorteio, [{ celula: "h2::b", motivo: "interfere", evidencia: "medida" }], PARAMS);
  assert.equal(r.substituicoes[0].entrou, "h0::z");
  // saem h1::a e depois a reposta h0::z: a próxima depois de h0::z que caiba — h3::a (regra a livre: a saiu), não h2::c (h2 ocupado)
  r = repor(sorteio, [{ celula: "h1::a", motivo: "nao-observavel", evidencia: "m" }, { celula: "h0::z", motivo: "quebra-fluxo", evidencia: "m" }], PARAMS);
  assert.deepEqual(r.substituicoes.map(s => s.entrou), ["h0::z", "h3::a"]);
  // h1::a nunca volta (já vigente antes) e regra ocupada não entra: com h2::b vigente, h2::c não cabe
  r = repor(sorteio, [{ celula: "h1::a", motivo: "nao-observavel", evidencia: "m" }, { celula: "h0::z", motivo: "quebra-fluxo", evidencia: "m" }, { celula: "h3::a", motivo: "nao-observavel", evidencia: "m" }], PARAMS);
  assert.deepEqual(r.substituicoes.map(s => s.entrou), ["h0::z", "h3::a", "h4::d"]);
  // G: sai k1::g; k1::h tem hospedeiro livre (k1 saiu) e regra livre → entra; se sair também, déficit G
  r = repor(sorteio, [{ celula: "k1::g", motivo: "nao-observavel", evidencia: "m" }, { celula: "k1::h", motivo: "nao-observavel", evidencia: "m" }], PARAMS);
  assert.deepEqual(r.substituicoes.map(s => s.entrou), ["k1::h", null]);
  assert.equal(r.deficit.G, 1);
  assert.equal(r.deficit.DS, 0);
  // descarte inválido e descarte de célula nunca vigente são recusados
  assert.throws(() => repor(sorteio, [{ celula: "h1::a", motivo: "outro", evidencia: "m" }], PARAMS), Recusa);
  assert.throws(() => repor(sorteio, [{ celula: "h1::a", motivo: "interfere", evidencia: "" }], PARAMS), Recusa);
  assert.throws(() => repor(sorteio, [{ celula: "h5::e", motivo: "interfere", evidencia: "m" }], PARAMS), e => e instanceof Recusa && /nunca foi vigente/.test(e.message));
});

test("reposição por --repor sobre um sorteio sintético grava sementes-vigentes.json", () => {
  const d = repo();
  silencio(() => main(["--semente", SEMENTE, "--raiz", d]));
  const s = lerSorteio(d);
  const alvo = s.sementes.find(x => x.classe === "DS");
  writeFileSync(join(d, "tela-e2/descartes.json"), JSON.stringify({ descartes: [{ celula: alvo.id, motivo: "nao-observavel", evidencia: "sintética" }] }));
  silencio(() => main(["--repor", "--raiz", d]));
  const vg = JSON.parse(readFileSync(join(d, "tela-e2/sementes-vigentes.json"), "utf8"));
  assert.equal(vg.substituicoes.length, 1);
  assert.ok(!vg.vigentes.some(x => x.id === alvo.id));
  const ordemDS = s.ordemPorClasse.DS.map(x => x.id);
  if (vg.substituicoes[0].entrou) assert.ok(ordemDS.indexOf(vg.substituicoes[0].entrou) > ordemDS.indexOf(alvo.id));
  rmSync(d, { recursive: true, force: true });
});

test("validar não grava sorteio", () => {
  const d = repo();
  silencio(() => main(["--validar", "--raiz", d]));
  assert.ok(!existsSync(join(d, "tela-e2/sorteio.json")));
  rmSync(d, { recursive: true, force: true });
});
