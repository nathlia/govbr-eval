/**
 * Tela F3 — conferência de construção, sem oráculo e sem axe (adendo da F § 4 "Referência da F", mantido pelos adendos
 * 2 e 3): cada spec semeada violada no build semeado e conforme no build sem semente. Junta, por spec:
 *   - o predicado próprio de tela-f3/sonda.json (Playwright, medido nos dois builds em todas as paradas): vale no
 *     semeado e falha no sem semente (`separa`);
 *   - com predicado na referência: `sustenta` no semeado (conferir-referencia-semeada.log) e `refuta` no sem semente
 *     (conferir-referencia-sem-semente.log); sem predicado: a âncora resolve no semeado; no sem semente, a F3-03 não
 *     resolve (a tag sai com o clique no ×), as outras resolvem e a separação é a da sonda;
 *   - a medida do construtor (construcao/medidas-M.json, M-xx → F3-xx na mesma ordem): passou.
 * Naturais: evidência do código da D idêntica entre os builds (remedida-d/evidencia-sem-semente-d14 × evidencia-semeada-d14).
 * Pares da D: idem; os que diferem têm de estar fora dos conformes da F3 (tela-f3/conformes.json).
 * Árvores: navegando = entrada direta em todo segmento com parada, nos dois builds (conferir-arvores.json).
 * Uso: node tela-f3/conferir-construcao.mjs → tela-f3/conferencia-construcao.json (sai ≠ 0 se algo divergir)
 */
import { createHash } from "crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { SEMEADAS } from "./semeadas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const sha = b => createHash("sha256").update(b).digest("hex");
const refBuf = readFileSync(join(AQUI, "../ground-truth-processos-f3.json")), ref = JSON.parse(refBuf);
const refSha = sha(refBuf);
const logSem = readFileSync(join(AQUI, "conferir-referencia-sem-semente.log"), "utf8");
const logSemeada = readFileSync(join(AQUI, "conferir-referencia-semeada.log"), "utf8");
for (const [n, l] of [["semeada", logSemeada], ["sem semente", logSem]]) if (!l.startsWith(refSha)) throw new Error(`log ${n} medido sobre outra referência`);
const sonda = JSON.parse(readFileSync(join(AQUI, "sonda.json"), "utf8"));
const arvores = JSON.parse(readFileSync(join(AQUI, "conferir-arvores.json"), "utf8"));
const medM = JSON.parse(readFileSync(join(AQUI, "construcao/medidas-M.json"), "utf8"));
const conformes = JSON.parse(readFileSync(join(AQUI, "conformes.json"), "utf8"));
const desfecho = (log, id) => (log.match(new RegExp(`^\\s+${id}\\s+\\d+ unidade\\(s\\) · [^·]+ · (\\S+)`, "m")) ?? [])[1] ?? null;
const problemasDe = log => [...log.matchAll(/^\s+- (F3-\d\d|D-\d\d|_meta\.\w+): (.*)$/gm)].map(m => ({ spec: m[1], problema: m[2].slice(0, 160) }));
const probSemeada = problemasDe(logSemeada), probSem = problemasDe(logSem);
const linhas = [];
for (const s of SEMEADAS) {
  const v = ref.violations.find(x => x.id === s.id);
  const so = sonda.resultado[s.id];
  const l = { spec: s.id, mudanca: s.M, estado: v.state, construtor: medM[s.M]?.passou === true ? "passou" : "falhou", sonda: so };
  if (v.acceptance) {
    l.semeada = desfecho(logSemeada, s.id); l.semSemente = desfecho(logSem, s.id);
    l.pega = l.semeada === "sustenta" && l.semSemente === "refuta" && so.separa && l.construtor === "passou";
    l.como = "predicado da referência (check-reference) nos dois builds + predicado próprio da sonda";
  } else {
    const noSem = probSem.filter(p => p.spec === s.id);
    l.semeada = probSemeada.some(p => p.spec === s.id) ? "problema" : "âncora resolve, sem predicado";
    l.semSemente = noSem.length ? noSem.map(p => p.problema).join("; ") : "âncora resolve, sem predicado";
    l.pega = l.semeada !== "problema" && so.separa && l.construtor === "passou";
    l.como = "sem predicado na referência: predicado próprio da sonda (tela-f3/sonda.mts › PEGA) nos dois builds";
  }
  linhas.push(l);
}
// no sem semente, os únicos problemas aceitos são os predicados que refutam e a âncora da F3-03 (a tag sai)
const esperadosSem = probSem.filter(p => !(/^predicado refuta/.test(p.problema) && ref.violations.find(v => v.id === p.spec)?.acceptance) && !(p.spec === "F3-03" && /âncora não casa/.test(p.problema)));
const A = join(AQUI, "remedida-d/evidencia-sem-semente-d14"), B = join(AQUI, "remedida-d/evidencia-semeada-d14");
const naturais = existsSync(A) ? readdirSync(A).filter(f => /^D-/.test(f)).map(f => ({ spec: f.replace(".json", ""), igual: readFileSync(join(A, f)).equals(readFileSync(join(B, f))) })) : [];
const dK = JSON.parse(readFileSync(join(AQUI, "../tela-d/conformes.json"), "utf8")).itens;
const paresDaD = existsSync(A) ? readdirSync(A).filter(f => /^K-/.test(f)).map(f => { const id = f.replace(".json", ""); const par = dK.find(k => k.id === id)?.par ?? null; const igual = readFileSync(join(A, f)).equals(readFileSync(join(B, f)));
  return { par: id, nome: par, igual, nosConformesDaF3: conformes.itens.some(k => k.par === par) }; }) : [];
const naoIguaisNosConformes = paresDaD.filter(p => !p.igual && p.nosConformesDaF3);
const arv = Object.entries(arvores).filter(([k]) => k !== "_meta").flatMap(([b, ls]) => ls.map(l => ({ build: b, parada: l.parada, resultado: l.resultado })));
const out = {
  _meta: { data: "2026-11-27", regra: "cabeçalho de tela-f3/conferir-construcao.mjs; sem oráculo, sem axe, sem detector",
    referencia: { arquivo: "ground-truth-processos-f3.json", sha256: refSha, status: /RASCUNHO/.test(ref._meta.status) ? "rascunho" : "congelada" },
    builds: { semeado: ".tmp-eval/corpus-tela-f3/public/pnip-f3 (= .tmp-eval/pnip-f3-semeada, lista 30b16f0d…; govbr-corpus tela-f3 9d194d7)", semSemente: ".tmp-eval/pnip-f3-sem-semente (lista 9d117870…)" },
    contagens: { semeadas: linhas.length, pegam: linhas.filter(l => l.pega).length, problemasNoSemeado: probSemeada.length, problemasInesperadosNoSemSemente: esperadosSem.length,
      naturaisComEvidenciaIgual: naturais.filter(n => n.igual).length, naturais: naturais.length, paresDaDComEvidenciaIgual: paresDaD.filter(n => n.igual).length, paresDaD: paresDaD.length, paresDiferentesNosConformes: naoIguaisNosConformes.length,
      arvoresIguais: arv.filter(a => a.resultado === "igual").length, arvores: arv.length } },
  semeadas: linhas, problemasNoSemSemente: probSem, naturais, paresDaD, arvores: arv,
};
writeFileSync(join(AQUI, "conferencia-construcao.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out._meta.contagens));
for (const l of linhas.filter(x => !x.pega)) console.log("NÃO PEGA", JSON.stringify(l));
const ok = linhas.every(l => l.pega) && probSemeada.length === 0 && esperadosSem.length === 0 && naturais.length === 13 && naturais.every(n => n.igual) && naoIguaisNosConformes.length === 0 && arv.every(a => a.resultado === "igual");
process.exit(ok ? 0 : 1);
