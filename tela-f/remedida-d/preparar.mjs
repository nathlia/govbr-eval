/**
 * Tela F — re-medida das 13 specs naturais e dos controles da D na ala pnip-f, com o MESMO código da D
 * (tela-d/conferir-auditoria.mjs, comum.mjs, sequencia.mjs, sortear-conformes.mjs), copiado aqui com trocas literais
 * só de onde a página está (ala, entrada, raiz dos bytes, caminhos relativos e da evidência). Nenhuma medida muda.
 * Uso: node tela-f/remedida-d/preparar.mjs; depois, por build:
 *   RAIZ_BYTES_F=<dir que contém pnip-f/> EVID_F=<rotulo> node tela-f/remedida-d/conferir-auditoria.mjs --candidato
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
    ["export const SITE = TELA.isolamento.site;", 'export const SITE = { ...TELA.isolamento.site, arvore: "pnip-f/", excluir: ["pnip-f/manifesto.json"], indice: "pnip-f/index.html", aliases: { "/assets/images/exit-icon.png": "pnip-f/assets/images/exit-icon.png" } };'],
    ['export const ENTRADA = "/" + TELA.entry;', 'export const ENTRADA = "/pnip-f/portal-mpa/processos?mock-perfil=mpa";'],
    ['export const RAIZ_BYTES = CANDIDATO ? join(PNIP_MOCK, "dist") : join(CORPUS, "dist");', "export const RAIZ_BYTES = process.env.RAIZ_BYTES_F;"],
  ],
  "sequencia.mjs": [['export const ROTA = "/pnip-d/portal-mpa/processos";', 'export const ROTA = "/pnip-f/portal-mpa/processos";']],
  "sortear-conformes.mjs": [],
  "conferir-auditoria.mjs": [
    ['const EVID = join(RAIZ_EVAL, "tela-d/evidencia");', 'const EVID = join(RAIZ_EVAL, "tela-f/remedida-d/evidencia-" + process.env.EVID_F);'],
    ['destinos[i].numero.path === "/pnip-d/login"', 'destinos[i].numero.path === "/pnip-f/login"'],
  ],
};
for (const [f, ts] of Object.entries(trocas)) {
  let s = readFileSync(join(D, f), "utf8");
  for (const [a, b] of ts) { if (!s.includes(a)) throw new Error(`${f}: trecho não achado: ${a}`); s = s.replace(a, b); }
  writeFileSync(join(AQUI, f), s);
}
console.log("ok: cópias com", Object.values(trocas).flat().length, "trocas");
