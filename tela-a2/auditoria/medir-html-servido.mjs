/**
 * Fatos do HTML como servido (bytes da resposta HTTP de ancoras-neutras.json › entrada), sem executar nada:
 * elementos vazios fechados com "/>", atributos booleanos com valor, recuo de <head>/<body>, meta refresh.
 * Uso: node tela-a2/auditoria/medir-html-servido.mjs → medidas/html-servido.json
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { URL_ENTRADA, MEDIDAS } from "./comum.mjs";

const res = await fetch(URL_ENTRADA);
const html = await res.text();
const linhas = html.split(/\r?\n/);
const VAZIOS = "area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr";
const autoFechados = [];
linhas.forEach((l, i) => { for (const m of l.matchAll(new RegExp(String.raw`<(${VAZIOS})\b[^>]*\/>`, "gi"))) autoFechados.push({ linha: i + 1, trecho: m[0].slice(0, 160) }); });
const BOOL = "allowfullscreen|async|autofocus|autoplay|checked|controls|default|defer|disabled|formnovalidate|hidden|inert|ismap|itemscope|loop|multiple|muted|nomodule|novalidate|open|readonly|required|reversed|selected";
const booleanosComValor = [];
linhas.forEach((l, i) => { for (const m of l.matchAll(new RegExp(String.raw`\s(${BOOL})=("[^"]*"|'[^']*')`, "gi"))) booleanosComValor.push({ linha: i + 1, trecho: m[0].trim() }); });
const recuo = linhas.map((l, i) => ({ linha: i + 1, l })).filter(x => /^\s*<\/?(head|body)\b/i.test(x.l)).map(x => ({ linha: x.linha, recuado: /^\s+</.test(x.l), trecho: x.l.trim().slice(0, 40) }));
const metaRefresh = [...html.matchAll(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi)].map(m => m[0]);
const saida = { url: URL_ENTRADA, status: res.status, tipo: res.headers.get("content-type"), bytes: html.length, sha256: createHash("sha256").update(html).digest("hex"),
  autoFechados, booleanosComValor, recuoHeadBody: recuo, metaRefresh,
  elementosApresentacionais: [...html.matchAll(/<(font|center|marquee|blink)\b[^>]*>|\salign=["'][^"']*["']/gi)].map(m => m[0]) };
writeFileSync(join(MEDIDAS, "html-servido.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(`HTML ${saida.bytes} bytes · auto-fechados ${autoFechados.length} · booleanos com valor ${booleanosComValor.length} · head/body recuados ${recuo.filter(r => r.recuado).length} · meta refresh ${metaRefresh.length} · apresentacionais ${saida.elementosApresentacionais.length}`);
