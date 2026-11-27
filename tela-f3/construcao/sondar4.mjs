// Sonda exploratória 4 (não é prova): células cortadas por aba e posição do nome comprido. Uso: node sondar4.mjs <dir> <porta>
import {chromium, servir, abrir} from './comum.mjs';
const [dir, porta] = process.argv.slice(2);
const s = await servir(dir, +porta);
const b = await chromium.launch({headless: true});
const cortes = (p) => p.evaluate(() => { const t = document.querySelector('pnip-mpa-processos .br-table table'); const k = [...t.querySelectorAll('thead th')].findIndex((x) => x.textContent.trim() === 'Solicitante'); const tds = [...t.querySelectorAll('tbody tr')].map((tr) => tr.children[k]); return {cortadas: tds.filter((td) => td.scrollWidth > td.clientWidth).length, n: tds.length, posLongo: tds.findIndex((td) => td.textContent.includes('Comprido'))}; });
const r = {};
let {ctx, pagina: p} = await abrir(b, s.base);
for (const a of ['Aguardando análise', 'Concluídos']) { await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: a}).click(); await p.waitForTimeout(1500); r[a] = await cortes(p); }
await ctx.close();
({ctx, pagina: p} = await abrir(b, s.base));
await p.locator('pnip-mpa-processos table thead br-icon-base').first().click(); await p.waitForTimeout(800); r.asc = await cortes(p);
await ctx.close();
({ctx, pagina: p} = await abrir(b, s.base));
await p.locator('pnip-mpa-processos span.br-tag.interaction', {hasText: 'Meus processos'}).click(); await p.waitForTimeout(1500); r.semMeus = await cortes(p);
await ctx.close();
console.log(JSON.stringify(r));
await b.close(); s.s.close();
