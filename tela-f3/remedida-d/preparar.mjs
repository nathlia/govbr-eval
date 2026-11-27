/**
 * Tela F3 — re-medida das 13 specs naturais e dos controles da D na ala pnip-f3, com o MESMO código da D
 * (tela-d/conferir-auditoria.mjs, comum.mjs, sequencia.mjs, sortear-conformes.mjs), copiado aqui com trocas literais
 * só de onde a página está (ala, entrada, raiz dos bytes, caminhos relativos e da evidência). Nenhuma medida muda.
 * Única troca além do lugar: âncora de D-14 por ANCORA_D14 (ver a troca abaixo).
 * Uso: node tela-f3/remedida-d/preparar.mjs; depois, por build:
 *   RAIZ_BYTES_F3=<dir que contém pnip-f3/> EVID_F3=<rotulo> node tela-f3/remedida-d/conferir-auditoria.mjs --candidato
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const AQUI = dirname(fileURLToPath(import.meta.url));
const D = join(AQUI, "../../tela-d");
const trocas = {
  "comum.mjs": [
    ['"../tela-b/vistorias/comum.mjs"', '"../../tela-b/vistorias/comum.mjs"'],
    ['join(dirname(fileURLToPath(import.meta.url)), "..")', 'join(dirname(fileURLToPath(import.meta.url)), "../..")'],
    ["export const SITE = TELA.isolamento.site;", 'export const SITE = { ...TELA.isolamento.site, arvore: "pnip-f3/", excluir: ["pnip-f3/manifesto.json"], indice: "pnip-f3/index.html", aliases: { "/assets/images/exit-icon.png": "pnip-f3/assets/images/exit-icon.png" } };'],
    ['export const ENTRADA = "/" + TELA.entry;', 'export const ENTRADA = "/pnip-f3/portal-mpa/processos?mock-perfil=mpa";'],
    ['export const RAIZ_BYTES = CANDIDATO ? join(PNIP_MOCK, "dist") : join(CORPUS, "dist");', "export const RAIZ_BYTES = process.env.RAIZ_BYTES_F3;"],
  ],
  "sequencia.mjs": [['export const ROTA = "/pnip-d/portal-mpa/processos";', 'export const ROTA = "/pnip-f3/portal-mpa/processos";']],
  "sortear-conformes.mjs": [],
  "conferir-auditoria.mjs": [
    ['const EVID = join(RAIZ_EVAL, "tela-d/evidencia");', 'const EVID = join(RAIZ_EVAL, "tela-f3/remedida-d/evidencia-" + process.env.EVID_F3);'],
    ['destinos[i].numero.path === "/pnip-d/login"', 'destinos[i].numero.path === "/pnip-f3/login"'],
    // F3 (como na F2): a mudança semeada do avatar (M-02) tira a classe que a âncora de D-14 usa; com ANCORA_D14 definida, só o seletor de
    // D-14 é trocado (mesmo elemento), a medida não muda. Sem a variável, o código é o da D.
    ['const specs = GT.violations;', 'const specs = GT.violations.map(s => s.id === "D-14" && process.env.ANCORA_D14 ? { ...s, anchor: process.env.ANCORA_D14 } : s);'],
  ],
};
for (const [f, ts] of Object.entries(trocas)) {
  let s = readFileSync(join(D, f), "utf8");
  for (const [a, b] of ts) { if (!s.includes(a)) throw new Error(`${f}: trecho não achado: ${a}`); s = s.replace(a, b); }
  writeFileSync(join(AQUI, f), s);
}
console.log("ok: cópias com", Object.values(trocas).flat().length, "trocas");
