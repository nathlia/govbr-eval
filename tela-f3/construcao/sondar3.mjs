// Sonda exploratória 3 (não é prova): quais linhas da lista inicial têm caixa de seleção. Uso: node sondar3.mjs <dir> <porta>
import {chromium, servir, abrir} from './comum.mjs';
const [dir, porta] = process.argv.slice(2);
const s = await servir(dir, +porta);
const b = await chromium.launch({headless: true});
const {ctx, pagina: p} = await abrir(b, s.base);
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('pnip-mpa-processos table tbody tr')].map((tr, i) => `${i + 1} ${tr.children[3].textContent.trim()} caixa=${!!tr.children[1].querySelector('input')}`)), null, 1));
await ctx.close(); await b.close(); s.s.close();
