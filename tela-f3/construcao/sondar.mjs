// Sonda exploratória (não é prova): estrutura das peças da F3 nos dois builds.
// Uso: node sondar.mjs <dir> <ala> <porta>
import {chromium, servir, abrir} from './comum.mjs';
const [dir, ala, porta] = process.argv.slice(2);
const s = await servir(dir, +porta, ala);
const browser = await chromium.launch({headless: true});
const {ctx, pagina: p, eventos} = await abrir(browser, s.base, ala);
const out = await p.evaluate(() => {
   const proc = document.querySelector('pnip-mpa-processos');
   const bc = proc.querySelector('br-breadcrumb').shadowRoot;
   const tds = [...proc.querySelectorAll('table tbody tr')].map((tr) => {
      const td = tr.children[4];
      const c = getComputedStyle(td);
      return {txt: td.textContent.replace(/\s+/g, ' ').trim(), cls: td.className, sw: td.scrollWidth, cw: td.clientWidth, w: td.getBoundingClientRect().width, mw: c.maxWidth, ov: c.overflow, ws: c.whiteSpace, to: c.textOverflow, title: td.getAttribute('title')};
   });
   const ths = [...proc.querySelectorAll('table thead th')].map((t) => t.textContent.trim());
   const tags = [...document.querySelectorAll('span.br-tag')].map((t) => ({txt: t.textContent.trim(), cls: t.className, style: t.getAttribute('style'), bg: getComputedStyle(t).backgroundColor, pai: t.parentElement.parentElement.className}));
   const pag = [...document.querySelectorAll('govbr-custom-pagination nav.br-pagination.small button')].map((b) => ({al: b.getAttribute('aria-label'), r: getComputedStyle(b).borderRadius, st: b.getAttribute('style')}));
   const exibir = document.querySelector('govbr-custom-pagination br-select-pnip[label="Exibir"] input')?.value;
   const pagina = document.querySelector('govbr-custom-pagination br-select-pnip[label="Página"] input')?.value;
   return {bc: bc.innerHTML.replace(/\s+/g, ' ').slice(0, 3000), ths, tds, tags, pag, exibir, pagina, nChk: proc.querySelectorAll('table tbody input[type=checkbox]').length, info: document.querySelector('govbr-custom-pagination .pagination-information')?.textContent.replace(/\s+/g, ' ').trim()};
});
console.log(JSON.stringify({...out, eventos}, null, 1));
await ctx.close(); await browser.close(); s.s.close();
