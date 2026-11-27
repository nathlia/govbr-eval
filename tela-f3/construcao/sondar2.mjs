// Sonda exploratória 2 (não é prova): breadcrumb, Exibir 25/50, Confirmar, × e nomes por aba.
// Uso: node sondar2.mjs <dir> <ala> <porta>
import {chromium, servir, abrir} from './comum.mjs';
const [dir, ala, porta] = process.argv.slice(2);
const s = await servir(dir, +porta, ala);
const browser = await chromium.launch({headless: true});
const r = {};
{
   const {ctx, pagina: p} = await abrir(browser, s.base, ala);
   r.bc = await p.evaluate(() => {
      const sr = document.querySelector('pnip-mpa-processos br-breadcrumb').shadowRoot;
      const c = sr.cloneNode ? null : null;
      const ul = sr.querySelector('ul, ol, nav');
      const x = (ul ?? sr).cloneNode(true);
      return [...sr.querySelectorAll('li')].map((li) => ({cls: li.className, attrs: [...li.attributes].map((a) => a.name + '=' + a.value), html: li.innerHTML.replace(/<style[\s\S]*?<\/style>/g, '').replace(/\s+/g, ' ').slice(0, 400)}));
   });
   r.perfil = await p.evaluate(() => Object.fromEntries(Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k).slice(0, 80)])));
   // Confirmar
   const chk = p.locator('pnip-mpa-processos table tbody input[type=checkbox]').first();
   await chk.check();
   await p.waitForTimeout(500);
   r.confirmar = await p.evaluate(() => [...document.querySelectorAll('pnip-mpa-processos div.mt-3 > br-button')].map((b) => ({label: b.getAttribute('label'), icon: b.getAttribute('icon'), type: b.getAttribute('type'), txt: b.shadowRoot?.querySelector('button')?.textContent.trim()})));
   await p.locator('pnip-mpa-processos div.mt-3 > br-button button').click();
   await p.waitForTimeout(800);
   r.dialogo = await p.evaluate(() => ({titulo: document.querySelector('.swal2-title')?.textContent, botoes: [...document.querySelectorAll('.swal2-actions button')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => b.textContent)}));
   await p.locator('.swal2-cancel').click();
   await p.waitForTimeout(800);
   r.dialogoDepois = await p.evaluate(() => !!document.querySelector('.swal2-container'));
   // breadcrumb click
   const links = await p.evaluate(() => [...document.querySelector('pnip-mpa-processos br-breadcrumb').shadowRoot.querySelectorAll('a')].map((a) => ({t: a.textContent.trim(), href: a.getAttribute('href'), abs: a.href})));
   r.bcLinks = links;
   await ctx.close();
}
{
   const {ctx, pagina: p} = await abrir(browser, s.base, ala);
   await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: 'Concluídos'}).click();
   await p.waitForTimeout(1500);
   const info = () => p.evaluate(() => ({linhas: document.querySelectorAll('pnip-mpa-processos table tbody tr').length, info: document.querySelector('govbr-custom-pagination .pagination-information')?.textContent.replace(/\s+/g, ' ').trim(), exibir: document.querySelector('govbr-custom-pagination br-select-pnip[label="Exibir"] input').value, pagina: document.querySelector('govbr-custom-pagination br-select-pnip[label="Página"] input')?.value, sel: [...document.querySelectorAll('govbr-custom-pagination br-select-pnip[label="Exibir"] .br-item.selected')].map((x) => x.textContent.trim()), setas: [...document.querySelectorAll('govbr-custom-pagination nav.br-pagination.small button[aria-label]')].map((b) => b.getAttribute('aria-label'))}));
   r.conc = await info();
   const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
   for (const v of ['25', '50', '10']) {
      await sel.scrollIntoViewIfNeeded();
      await sel.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
      r['itens' + v] = await sel.locator('div.br-list div.br-item:not([hidden])').allTextContents().then((x) => x.map((t) => t.trim()));
      await sel.locator('div.br-list div.br-item', {hasText: new RegExp(`^\\s*${v}\\s*$`)}).click();
      await p.waitForTimeout(1500);
      r['depois' + v] = await info();
   }
   await ctx.close();
}
{
   const {ctx, pagina: p} = await abrir(browser, s.base, ala);
   const nomes = async () => p.evaluate(() => [...document.querySelectorAll('pnip-mpa-processos table tbody tr')].map((tr) => tr.children[[...tr.parentElement.parentElement.querySelectorAll('thead th')].findIndex((t) => t.textContent.trim() === 'Solicitante')]?.textContent.replace(/\s+/g, ' ').trim()));
   r.nomesInicial = await nomes();
   for (const a of ['Aguardando análise', 'Concluídos', 'Tramitando']) {
      await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: a}).click();
      await p.waitForTimeout(1500);
      r['nomes ' + a] = await nomes();
   }
   // filtro e ×
   await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Status'}).click();
   await p.waitForTimeout(400);
   r.opcoesStatus = await p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').allTextContents().then((x) => x.map((t) => t.trim()));
   await p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').first().click();
   await p.waitForTimeout(1500);
   const x = p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction > button').first();
   r.x = await x.evaluate((b) => ({cls: b.className, tab: b.tabIndex, dis: b.disabled, r: getComputedStyle(b).borderRadius, bg: getComputedStyle(b).backgroundColor, w: b.getBoundingClientRect().width}));
   r.linhasFiltro = await p.evaluate(() => document.querySelectorAll('pnip-mpa-processos table tbody tr').length);
   await x.click();
   await p.waitForTimeout(1500);
   r.tagsDepoisX = await p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction').count();
   r.linhasDepoisX = await p.evaluate(() => document.querySelectorAll('pnip-mpa-processos table tbody tr').length);
   await ctx.close();
}
console.log(JSON.stringify(r, null, 1));
await browser.close(); s.s.close();
