/**
 * NAT-74 derivado 1.2.0 — domínio de aplicabilidade PROVADO das unidades da tela B que atravessam cena
 * (B-01, B-21, B-25; decisão adotada após a revisão Codex, thesis decisoes 59019ac).
 *
 * Medida nova, determinística e sem modelo, feita DENTRO do derivado sobre os artefatos arquivados da
 * 1.0.0 (nada é recapturado, nada do original muda): para cada cena do plano, o DOM serializado do site
 * congelado (`scene-N.html`) é carregado num Chromium headless com JavaScript desligado e toda
 * requisição abortada, e o predicado PRÓPRIO de cada spec é medido ali:
 *   - B-01 `sem-salto-para-conteudo`: nenhum `.br-skiplink` e nenhuma âncora `href="#…"` (ausência global);
 *   - B-25 `titulo-inadequado`: `document.title` é exatamente "PNIP" (só o sistema, igual em toda rota);
 *   - B-21 `hierarquia-comeca-em-h3`: no detalhe (`pnip-propesc-agendar-vistoria`) o primeiro título é h3
 *     e não há h1/h2.
 * O participante de cada entrada é a chave que a âncora da spec resolve NAQUELA cena (`resolution-N.json`
 * arquivado); nenhuma chave vem de outra rota. A re-medida independente da referência
 * (`tela-b/vistorias/remedida/resultado.json`) entra como evidência onde confirma a spec na parada.
 * Cada par tem a sua captura (o APP_ID sorteado pelo Angular muda os bytes, não o sceneHash): a medida é
 * feita no DOM arquivado DO PRÓPRIO par, e o resultado dos predicados tem de ser o mesmo nos 10 (o
 * pipeline confere).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { DominioCena, SemanticPackage } from "../semantic-flow";
import { EVAL, RESULTADOS, CAMINHO_DERIVADO, relTcc, sha, lerJson } from "./comum";

const req = createRequire(import.meta.url);
export const DOMINIO_FORMATO = "nat74-dominio-1.0.0";
export const SPECS_DOMINIO = ["B-01", "B-21", "B-25"] as const;
const ANCORA: Record<string, string> = { "B-01": "pnip-root", "B-21": "pnip-propesc-agendar-vistoria h3", "B-25": "head > title" };
const PREDICADO: Record<string, { kind: DominioCena["kind"]; predicate: string }> = {
  "B-01": { kind: "ausencia-global", predicate: "sem-salto-para-conteudo" },
  "B-21": { kind: "documento", predicate: "hierarquia-comeca-em-h3" },
  "B-25": { kind: "documento", predicate: "titulo-inadequado" },
};

export interface MedidaCena { scene: string; html: { arquivo: string; sha256: string }; resolucao: { arquivo: string; sha256: string };
  skiplinks: number; ancorasHash: number; titulo: string; titulosDetalhe: number[] | null; chaves: Record<string, string[]> }
export interface SaidaDominio {
  formato: typeof DOMINIO_FORMATO; nota: string; reference: string; build: string;
  cenas: MedidaCena[];
  remedida: { arquivo: string; sha256: string; confirma: Record<string, string[]> };
  dominios: Record<string, { specId: string; unitId: string; cenaCanonica: string; dominio: DominioCena[]; fora: { scene: string; motivo: string }[] }>;
}

export const parDir = (par: string) => join(RESULTADOS, CAMINHO_DERIVADO, "t7-tela-b-01", par, "analise", "revisao");

/** Medida das três cenas da tela B a partir dos artefatos arquivados; determinística. */
export async function medirDominio(pkg: SemanticPackage, par: string): Promise<SaidaDominio> {
  const prov = pkg.provenance as { reference: { sha256: string }; site: { manifestSha256: string } };
  const reference = prov.reference.sha256, build = prov.site.manifestSha256;
  const dir = parDir(par);
  const capture = lerJson<{ sceneHash: string; scenes: { id: string; html: string; resolution?: string }[] }>(join(dir, "capture.json"));
  const cenas: MedidaCena[] = [];
  const { chromium } = req("playwright") as typeof import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [i, s] of pkg.scenes.entries()) {
      const meta = capture.scenes.find(x => x.id === s.id);
      if (!meta) throw new Error(`domínio: cena ${s.id} sem captura arquivada`);
      const htmlRel = meta.html, resRel = meta.resolution ?? `resolution-${i}.json`;
      const html = readFileSync(join(dir, htmlRel), "utf8");
      const res = lerJson<{ scene: string; bySelector: Record<string, { ok: boolean; keys: string[] }> }>(join(dir, resRel));
      if (res.scene !== s.id) throw new Error(`domínio: ${resRel} é da cena ${res.scene}, não de ${s.id}`);
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: s.viewport });
      await ctx.route("**/*", r => r.abort());
      const page = await ctx.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const m = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll("*"));
        const comp = document.querySelector("pnip-propesc-agendar-vistoria");
        return {
          skiplinks: els.filter(e => e.classList.contains("br-skiplink")).length,
          ancorasHash: els.filter(e => e.tagName === "A" && (e.getAttribute("href") ?? "").startsWith("#")).length,
          titulo: document.title,
          titulosDetalhe: comp ? Array.from(comp.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(h => Number(h.tagName[1])) : null,
        };
      });
      await ctx.close();
      const chaves = Object.fromEntries(Object.entries(ANCORA).map(([spec, a]) => [spec, res.bySelector[a]?.ok ? [...res.bySelector[a].keys] : []]));
      cenas.push({ scene: s.id, html: { arquivo: relTcc(join(dir, htmlRel)), sha256: sha(readFileSync(join(dir, htmlRel))) },
        resolucao: { arquivo: relTcc(join(dir, resRel)), sha256: sha(readFileSync(join(dir, resRel))) }, ...m, chaves });
    }
  } finally { await browser.close(); }

  // Re-medida independente: paradas em que ela confirma cada spec.
  const remArq = join(EVAL, "tela-b", "vistorias", "remedida", "resultado.json");
  const rem = lerJson<{ medidas: { id: string; estado: string; veredito: string }[] }>(remArq);
  const confirma: Record<string, string[]> = {};
  for (const x of rem.medidas) if ((SPECS_DOMINIO as readonly string[]).includes(x.id) && x.veredito === "confirma") (confirma[x.id] ??= []).push(x.estado);
  const remSha = sha(readFileSync(remArq));

  const passa = (spec: string, c: MedidaCena): string | null => {
    if (c.chaves[spec].length !== 1) return `âncora ${ANCORA[spec]} resolve em ${c.chaves[spec].length} elemento(s) nesta cena`;
    if (spec === "B-01") return c.skiplinks === 0 && c.ancorasHash === 0 ? null : `há salto: ${c.skiplinks} .br-skiplink, ${c.ancorasHash} âncora(s) #`;
    if (spec === "B-25") return c.titulo === "PNIP" ? null : `título "${c.titulo}"`;
    const t = c.titulosDetalhe;
    return t && t.length && t[0] === 3 && !t.some(n => n < 3) ? null : `títulos do detalhe: ${t ? t.map(n => `h${n}`).join(" ") || "nenhum" : "detalhe ausente"}`;
  };
  const dominios: SaidaDominio["dominios"] = {};
  for (const spec of SPECS_DOMINIO) {
    const u = pkg.units.filter(x => x.specId === spec);
    if (u.length !== 1) throw new Error(`domínio: ${spec} tem ${u.length} unidades (esperada 1)`);
    const unit = u[0];
    const dominio: DominioCena[] = [], fora: { scene: string; motivo: string }[] = [];
    for (const c of cenas) {
      const motivo = passa(spec, c);
      if (motivo) { fora.push({ scene: c.scene, motivo }); continue; }
      const seg = pkg.scenes.find(s => s.id === c.scene)!.segmento!;
      // Paradas medidas: a da captura (última do segmento) e as que a re-medida confirma dentro do segmento.
      const states = [...new Set([seg.estado, ...(confirma[spec] ?? []).filter(e => seg.estados.includes(e))])].sort();
      const evidence = [{ source: `${c.html.arquivo} (${PREDICADO[spec].predicate}: headless, JS desligado)`, sha256: c.html.sha256 },
        { source: `${c.resolucao.arquivo} (${ANCORA[spec]} → ${c.chaves[spec][0]})`, sha256: c.resolucao.sha256 },
        ...((confirma[spec] ?? []).some(e => seg.estados.includes(e)) ? [{ source: `${relTcc(remArq)} (${spec} confirma em ${(confirma[spec] ?? []).filter(e => seg.estados.includes(e)).join(", ")})`, sha256: remSha }] : [])];
      dominio.push({ scene: c.scene, states, ...PREDICADO[spec], participants: [...c.chaves[spec]], reference, build, evidence });
    }
    if (!dominio.some(e => e.scene === unit.scene)) throw new Error(`domínio: ${spec} não se confirma na própria cena canônica ${unit.scene}`);
    dominios[unit.id] = { specId: spec, unitId: unit.id, cenaCanonica: unit.scene, dominio, fora };
  }
  return { formato: DOMINIO_FORMATO, nota: "medida nova do derivado 1.2.0 (sem modelo, sem rede): DOM arquivado de cada cena do site congelado, Chromium headless com JS desligado; participantes = chaves resolvidas na própria cena", reference, build, cenas,
    remedida: { arquivo: relTcc(remArq), sha256: remSha, confirma }, dominios };
}

if (process.argv[1] && /dominio\.ts$/.test(process.argv[1])) {
  const par = process.argv[2] ?? "p01";
  const pkg = lerJson<SemanticPackage>(join(parDir(par), "package.json"));
  medirDominio(pkg, par).then(d => {
    for (const c of d.cenas) console.log(c.scene, `skiplink ${c.skiplinks}`, `#âncoras ${c.ancorasHash}`, `título ${JSON.stringify(c.titulo)}`,
      `detalhe ${JSON.stringify(c.titulosDetalhe)}`, JSON.stringify(c.chaves));
    for (const x of Object.values(d.dominios)) console.log(x.specId, `canônica ${x.cenaCanonica}`, x.dominio.map(e => `${e.scene}[${e.states.join(",")}]`).join(" "), JSON.stringify(x.fora));
  }).catch(e => { console.error(e); process.exitCode = 1; });
}
