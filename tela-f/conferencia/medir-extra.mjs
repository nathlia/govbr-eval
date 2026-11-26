// Medições complementares: facil-1 (zoom), medio-1 (recriar o host com type), muito-dificil-2 (seleção),
// muito-dificil-6 (regra que vence no hover).
import fs from 'node:fs';
import { chromium, URL, OUT } from './comum.mjs';
const R = `function rect(el){const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y+scrollY),w:Math.round(r.width),h:Math.round(r.height),b:Math.round(r.bottom+scrollY),r:Math.round(r.right)}}`;
const ev = (page, fn) => page.evaluate(`(()=>{${R}; return (${fn})()})()`);
const browser = await chromium.launch({ headless: true });
async function nova(scale = 1) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('div.br-table tbody tr'); await page.waitForTimeout(800);
  return { ctx, page };
}
const out = {};

// facil-1 em zoom 2x
{
  const { ctx, page } = await nova(2);
  await ev(page, () => { const s = document.querySelector('div.tab-panel span.br-tag.interaction > span'); s.className = ''; s.setAttribute('style', 'display:inline-block; max-width:64px; white-space:normal; line-height:1.2'); });
  await page.waitForTimeout(200);
  out.facil1 = await ev(page, () => { const t = document.querySelector('div.tab-panel span.br-tag.interaction'); const s = t.querySelector('span'); const rg = document.createRange(); rg.selectNodeContents(s); const rs = [...rg.getClientRects()].map(r => ({ x: Math.round(r.x), r: Math.round(r.right), y: Math.round(r.y + scrollY), b: Math.round(r.bottom + scrollY) })); const cs = getComputedStyle(t); return { tag: rect(t), linhasTexto: rs, display: cs.display, minH: cs.minHeight, h: cs.height, pad: cs.padding, filtroH: rect(document.querySelector('pnip-multiple-search-table-utils span.br-tag')).h }; });
  await page.screenshot({ path: `${OUT}/capturas/F-facil-1-depois-zoom.png`, clip: { x: 80, y: 330, width: 260, height: 80 } });
  await ctx.close();
}
// medio-1: recria o host com type=primary (equivale ao atributo no template)
{
  const { ctx, page } = await nova();
  await ev(page, () => document.querySelectorAll('div.br-table tbody br-button[title="Assinar"]').forEach(h => { const n = document.createElement('br-button'); n.setAttribute('title', 'Assinar'); n.setAttribute('type', 'primary'); n.textContent = 'Assinar'; h.replaceWith(n); }));
  await page.waitForTimeout(800);
  out.medio1 = await ev(page, () => [...document.querySelectorAll('div.br-table tbody br-button[title="Assinar"]')].map(h => { const b = h.shadowRoot?.querySelector('button'); return b ? { cls: b.className, bg: getComputedStyle(b).backgroundColor } : null; }));
  await page.screenshot({ path: `${OUT}/capturas/F-medio-1-depois.png`, fullPage: true });
  await ctx.close();
}
// muito-dificil-2: selecionar opção de filtro
{
  const { ctx, page } = await nova();
  await page.locator('pnip-multiple-search-table-utils span.br-tag', { hasText: 'Tipo de processo' }).first().click();
  await page.waitForTimeout(400);
  const opcoes = await ev(page, () => [...document.querySelectorAll('pnip-multiple-search-table-utils div.br-select div.br-item')].map(i => i.textContent.trim()));
  await page.locator('pnip-multiple-search-table-utils div.br-select div.br-item label').first().click();
  await page.waitForTimeout(600);
  const f = () => { const row = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center)'); const t = row?.querySelector('span.br-tag.interaction'); if (!t) return { html: row?.outerHTML.slice(0, 300) }; return { tag: rect(t), icone: rect(t.querySelector('i')), rotulo: rect(t.querySelector('span')), fechar: rect(t.querySelector('button')), texto: t.textContent.trim() }; };
  const antes = await ev(page, f);
  await ev(page, () => { const t = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction'); if (t) t.insertBefore(t.querySelector('button'), t.querySelector('i')); });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  // o botão continua funcionando?
  let removeOk = null;
  try { await page.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction button').first().click(); await page.waitForTimeout(400); removeOk = await ev(page, () => !document.querySelector('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction')); } catch (e) { removeOk = String(e).slice(0, 100); }
  out.md2 = { opcoes, antes, depois, removeOk };
  await ctx.close();
  const { ctx: c2, page: p2 } = await nova();
  await p2.locator('pnip-multiple-search-table-utils span.br-tag', { hasText: 'Tipo de processo' }).first().click();
  await p2.waitForTimeout(400);
  await p2.locator('pnip-multiple-search-table-utils div.br-select div.br-item label').first().click();
  await p2.waitForTimeout(600);
  await ev(p2, () => { const t = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction'); if (t) t.insertBefore(t.querySelector('button'), t.querySelector('i')); });
  await p2.locator('pnip-multiple-search-table-utils').screenshot({ path: `${OUT}/capturas/F-muito-dificil-2-depois.png` });
  await c2.close();
}
// muito-dificil-6: quais regras definem o hover do item
{
  const { ctx, page } = await nova();
  await page.locator('pnip-multiple-search-table-utils span.br-tag', { hasText: 'Tipo de processo' }).first().click();
  await page.waitForTimeout(400);
  out.md6regras = await ev(page, () => { const res = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } const walk = (rs) => { for (const r of rs) { if (r.cssRules && !r.selectorText) walk(r.cssRules); else if (r.selectorText && /br-item/.test(r.selectorText) && /hover/.test(r.selectorText) && /background/.test(r.cssText)) res.push(r.cssText.slice(0, 300)); } }; walk(rules); } return res.slice(0, 15); });
  await page.addStyleTag({ content: 'pnip-multiple-search-table-utils .br-list .br-item:hover { background-image: none; background-color: var(--blue-warm-vivid-70); color: var(--pure-0); }' });
  const it = page.locator('pnip-multiple-search-table-utils div.br-select div.br-list > div.br-item').nth(1);
  await it.hover(); await page.waitForTimeout(300);
  out.md6depois = await ev(page, () => { const it = document.querySelector('pnip-multiple-search-table-utils div.br-select div.br-list > div.br-item:nth-child(2)'); const cs = getComputedStyle(it); return { hoverAtivo: it.matches(':hover'), bgImg: cs.backgroundImage, bg: cs.backgroundColor, itemColor: cs.color, labelColor: getComputedStyle(it.querySelector('label')).color }; });
  await it.screenshot({ path: `${OUT}/capturas/F-muito-dificil-6-depois-item.png` });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/medidas-extra.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
await browser.close();
