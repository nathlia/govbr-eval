/**
 * Conferência do CONTRATO de um inventário do DOM 1.2.0 (NAT-118): conferir só que o arquivo existe não basta.
 *
 * Sem mostrar o conteúdo (nenhum nome de tag, classe, parada ou caminho sai daqui), confere que o inventário
 *   (a) segue o esquema fechado do `inventario-dom-1.2.0` (campos, tipos, listas ordenadas sem repetição, fases das
 *       classes dinâmicas, contagens por parada coerentes com a união);
 *   (b) está vinculado ao site dado (`siteSha256`, e o sha256 do `site-manifest.json` quando a pasta do site é dada) e ao
 *       manifesto de navegação dado (sha256 do conteúdo conferido nos dois lados, mesma tela, mesma janela);
 *   (c) cobre TODAS as paradas do manifesto (mesmos ids, mesmos `afterStep`, `path` medido = `path` declarado).
 * Imprime só contagens e hashes; sai com código 1 e a lista de problemas (sem valores) se algo falha.
 *
 *   npx tsx scripts/vazamento/conferir-inventario.ts --inventario <tela.json> --manifesto <manifesto.json>
 *                                                   (--telas <govbr-telas> | --site-sha256 <hex>)
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sitesDoInventario, type VinculoDeSite } from "./conhecimento";
import { lerManifesto, type ManifestoNavegacao } from "./manifesto-navegacao";

export const CONTRATO_INVENTARIO = "inventario-dom-1.2.0";
const HEX = /^[0-9a-f]{64}$/;
const FASES = ["setup", "foco", "hover"];
const CAMPOS = ["contrato", "tela", "site", "sites", "manifestoNavegacao", "viewport", "nota", "tags", "classes", "notaDinamicas", "classesDinamicas", "estados"];
const OBRIGATORIOS = CAMPOS.filter((k) => k !== "site" && k !== "sites");
const CAMPOS_DO_ESTADO = ["id", "afterStep", "path", "tags", "classes", "focados", "sobrevoados"];

export interface ResumoDoInventario {
  tela: string | null;
  inventarioSha256: string;
  manifestoSha256: string;
  siteSha256: string;
  paradas: number;
  tags: number;
  classes: number;
  classesDinamicas: number;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const inteiroNaoNegativo = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
function listaOrdenadaUnica(v: unknown): v is string[] {
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && x.length > 0)) return false;
  for (let i = 1; i < v.length; i += 1) if (!(v[i - 1] < v[i])) return false;
  return true;
}

/**
 * Confere o inventário contra o manifesto e o site. Devolve os problemas (mensagens sem conteúdo do inventário) e o
 * resumo (só contagens e hashes).
 */
export function conferirInventario(
  inventarioTexto: Buffer | string,
  manifesto: ManifestoNavegacao,
  site: { siteSha256: string; manifestSha256?: string },
): { problemas: string[]; resumo: ResumoDoInventario } {
  const p: string[] = [];
  const texto = typeof inventarioTexto === "string" ? Buffer.from(inventarioTexto) : inventarioTexto;
  let inv: Record<string, unknown> = {};
  try {
    const v = JSON.parse(texto.toString("utf8")) as unknown;
    if (ehObjeto(v)) inv = v; else p.push("esquema: não é objeto");
  } catch { p.push("esquema: JSON inválido"); }
  const tags = Array.isArray(inv.tags) ? inv.tags : [];
  const classes = Array.isArray(inv.classes) ? inv.classes : [];
  const dinamicas = ehObjeto(inv.classesDinamicas) ? inv.classesDinamicas : {};
  const estados = Array.isArray(inv.estados) ? inv.estados : [];
  const resumo: ResumoDoInventario = {
    tela: typeof inv.tela === "string" ? inv.tela : null,
    inventarioSha256: createHash("sha256").update(texto).digest("hex"),
    manifestoSha256: manifesto.sha256, siteSha256: site.siteSha256,
    paradas: estados.length, tags: tags.length, classes: classes.length, classesDinamicas: Object.keys(dinamicas).length,
  };
  if (p.length) return { problemas: p, resumo };

  // (a) esquema
  const fora = Object.keys(inv).filter((k) => !CAMPOS.includes(k));
  if (fora.length) p.push(`esquema: ${fora.length} campo(s) fora do contrato`);
  const faltam = OBRIGATORIOS.filter((k) => inv[k] === undefined);
  if (faltam.length) p.push(`esquema: faltam ${faltam.join(", ")}`);
  if (inv.contrato !== CONTRATO_INVENTARIO) p.push(`esquema: contrato ≠ ${CONTRATO_INVENTARIO}`);
  if (typeof inv.nota !== "string" || typeof inv.notaDinamicas !== "string") p.push("esquema: nota/notaDinamicas não são texto");
  if (!listaOrdenadaUnica(inv.tags) || tags.length === 0) p.push("esquema: tags não é lista não vazia, ordenada e sem repetição");
  if (!listaOrdenadaUnica(inv.classes)) p.push("esquema: classes não é lista ordenada e sem repetição");
  if (!ehObjeto(inv.classesDinamicas)) p.push("esquema: classesDinamicas não é objeto");
  else {
    const ruins = Object.entries(dinamicas).filter(([c, f]) => !c || !FASES.includes(f as string)).length;
    if (ruins) p.push(`esquema: ${ruins} classe(s) dinâmica(s) com fase fora de ${FASES.join("/")}`);
    const repetidas = Object.keys(dinamicas).filter((c) => (classes as string[]).includes(c)).length;
    if (repetidas) p.push(`esquema: ${repetidas} classe(s) dinâmica(s) também no retrato estático`);
  }
  if (!ehObjeto(inv.viewport) || !Number.isInteger(inv.viewport.width) || !Number.isInteger(inv.viewport.height)) p.push("esquema: viewport fora do formato");
  const nav = inv.manifestoNavegacao;
  if (!ehObjeto(nav) || Object.keys(nav).some((k) => k !== "sha256" && k !== "paradas") || !HEX.test(String(nav.sha256)) || !Array.isArray(nav.paradas)) {
    p.push("esquema: manifestoNavegacao fora do formato { sha256, paradas }");
  }
  let ruinsEstado = 0;
  for (const e of estados) {
    if (!ehObjeto(e) || Object.keys(e).some((k) => !CAMPOS_DO_ESTADO.includes(k)) || typeof e.id !== "string" || !inteiroNaoNegativo(e.afterStep)
      || typeof e.path !== "string" || !e.path.startsWith("/") || !["tags", "classes", "focados", "sobrevoados"].every((k) => inteiroNaoNegativo(e[k]))
      || (e.tags as number) < 1 || (e.tags as number) > tags.length || (e.classes as number) > classes.length) ruinsEstado += 1;
  }
  if (ruinsEstado) p.push(`esquema: ${ruinsEstado} estado(s) fora do formato ou com contagem incoerente com a união`);

  // (b) vínculo: site e manifesto
  let vinculos: VinculoDeSite[] = [];
  try {
    sitesDoInventario(inv as never, "inventário");
    vinculos = (inv.sites as VinculoDeSite[] | undefined) ?? [inv.site as VinculoDeSite];
  } catch { p.push("vínculo: site/sites fora do formato"); }
  const doSite = vinculos.find((v) => v.siteSha256 === site.siteSha256);
  if (vinculos.length && !doSite) p.push("vínculo: siteSha256 dado não está no inventário");
  if (doSite && site.manifestSha256 !== undefined && doSite.manifestSha256 !== site.manifestSha256) p.push("vínculo: sha256 do site-manifest.json não confere");
  if (ehObjeto(nav) && nav.sha256 !== manifesto.sha256) p.push("vínculo: manifestoNavegacao.sha256 ≠ sha256 do manifesto dado");
  if (inv.tela !== manifesto.tela) p.push("vínculo: tela do inventário ≠ tela do manifesto");
  if (ehObjeto(inv.viewport) && (inv.viewport.width !== manifesto.viewport.width || inv.viewport.height !== manifesto.viewport.height)) p.push("vínculo: viewport ≠ a do manifesto");

  // (c) cobertura das paradas do manifesto
  const ids = estados.map((e) => (ehObjeto(e) ? e.id : null));
  const faltantes = manifesto.paradas.filter((s) => !ids.includes(s.id)).length;
  const extras = ids.filter((id) => !manifesto.paradas.some((s) => s.id === id)).length;
  if (faltantes) p.push(`cobertura: ${faltantes} parada(s) do manifesto sem estado no inventário`);
  if (extras) p.push(`cobertura: ${extras} estado(s) que o manifesto não declara`);
  if (new Set(ids).size !== ids.length) p.push("cobertura: estado repetido");
  let divergentes = 0;
  for (const s of manifesto.paradas) {
    const e = estados.find((x) => ehObjeto(x) && x.id === s.id) as Record<string, unknown> | undefined;
    if (e && (e.afterStep !== s.afterStep || (s.path !== undefined && e.path !== s.path))) divergentes += 1;
  }
  if (divergentes) p.push(`cobertura: ${divergentes} parada(s) com afterStep ou path diferente do manifesto`);
  if (ehObjeto(nav) && Array.isArray(nav.paradas) && JSON.stringify(nav.paradas) !== JSON.stringify(ids)) p.push("cobertura: manifestoNavegacao.paradas ≠ ids dos estados");
  return { problemas: p, resumo };
}

function main(): void {
  const argv = process.argv.slice(2);
  const valor = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const inventario = valor("inventario");
  const manifestoArq = valor("manifesto");
  const telas = valor("telas");
  const shaDado = valor("site-sha256");
  if (!inventario || !manifestoArq || (!telas && !shaDado)) {
    throw new Error("uso: conferir-inventario.ts --inventario <tela.json> --manifesto <manifesto.json> (--telas <govbr-telas> | --site-sha256 <hex>)");
  }
  const manifesto = lerManifesto(resolve(manifestoArq));
  let site: { siteSha256: string; manifestSha256?: string };
  if (telas) {
    const bytes = readFileSync(join(resolve(telas), "site-manifest.json"));
    const sha = (JSON.parse(bytes.toString("utf8")) as { item?: { sha256?: string } }).item?.sha256 ?? "";
    site = { siteSha256: sha, manifestSha256: createHash("sha256").update(bytes).digest("hex") };
    if (shaDado && shaDado !== sha) throw new Error("--site-sha256 ≠ item.sha256 do site-manifest.json de --telas");
  } else site = { siteSha256: shaDado! };
  if (!HEX.test(site.siteSha256)) throw new Error("siteSha256 fora do formato (64 hex)");
  const { problemas, resumo } = conferirInventario(readFileSync(resolve(inventario)), manifesto, site);
  console.log(`inventário ${resumo.inventarioSha256} · manifesto ${resumo.manifestoSha256} · site ${resumo.siteSha256}`);
  console.log(`${resumo.paradas}/${manifesto.paradas.length} paradas · ${resumo.tags} tags · ${resumo.classes} classes · ${resumo.classesDinamicas} dinâmicas`);
  if (problemas.length) {
    console.error(`CONTRATO FALHOU (${problemas.length}):\n  ${problemas.join("\n  ")}`);
    process.exit(1);
  }
  console.log("contrato ok: esquema, vínculo ao site e ao manifesto, cobertura das paradas");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error((e as Error).message); process.exit(1); }
}
