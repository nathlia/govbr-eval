// Prova de vida da exportação (govbr-eval telas.json, isolamento.interacao das telas D/F/F2): clicar no primeiro
// .br-tag.interaction e esperar main .br-table tbody tr:nth-child(10). Uso: node prova-de-vida.mjs <dir> <porta> [rótulo]
import {chromium, servir, abrir} from './comum.mjs';
const [dir, porta, rot = dir] = process.argv.slice(2);
const s = await servir(dir, +porta);
const b = await chromium.launch({headless: true});
const {ctx, pagina: p, eventos} = await abrir(b, s.base);
const linhas = () => p.evaluate(() => document.querySelectorAll('main .br-table tbody tr').length);
const r = {build: rot, alvo: await p.evaluate(() => document.querySelector('.br-tag.interaction')?.textContent.trim()), linhasAntes: await linhas()};
const t0 = Date.now();
await p.click('.br-tag.interaction');
try { await p.waitForSelector('main .br-table tbody tr:nth-child(10)', {timeout: 15000}); r.ok = true; } catch { r.ok = false; }
r.ms = Date.now() - t0; r.linhasDepois = await linhas(); r.eventos = eventos;
console.log(JSON.stringify(r));
await ctx.close(); await b.close(); s.s.close();
