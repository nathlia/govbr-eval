// Uso: node removidas.mjs <semSemente-pnip-f3> <semeada-pnip-f3> <semeada-pnip-f2> <saida.json>
// As 7 mudanças da F2 que saíram na F3 voltaram ao valor sem semente? Mede cada uma nos três builds (contexto novo
// por medida). Passa se semeada F3 = sem semente e semeada F2 ≠ sem semente (controle: a medida enxerga a mudança).
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir} from './comum.mjs';

const [dirBase, dirF3, dirF2, saida] = process.argv.slice(2);
const cs = (el, props) => { const c = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, c.getPropertyValue(p)])); };

const MEDIDAS = {
   'h2 (F2 M-04)': (p) => p.evaluate(() => { const h = document.querySelector('pnip-mpa-processos h2'); const c = getComputedStyle(h); return {fontSize: c.fontSize, estilo: h.getAttribute('style')}; }),
   'rótulo "Meus processos" (F2 M-07)': (p) => p.evaluate(() => { const s = [...document.querySelectorAll('pnip-mpa-processos span.br-tag.interaction span.text-truncate')].find((x) => x.textContent.trim() === 'Meus processos'); return {fontSize: getComputedStyle(s).fontSize, estilo: s.getAttribute('style')}; }),
   'divider (F2 M-03)': (p) => p.evaluate(() => { const d = document.querySelector('pnip-mpa-processos br-divider'); return {borderTopColor: getComputedStyle(d.shadowRoot.querySelector('span.br-divider')).borderTopColor, estilo: d.getAttribute('style')}; }),
   'ícone Home do breadcrumb (F2 M-02)': (p) => p.evaluate(() => { const b = document.querySelector('pnip-mpa-processos br-breadcrumb'); return {cor: getComputedStyle(b.shadowRoot.querySelector('li.crumb.home button i.fa-home')).color, estilo: b.getAttribute('style')}; }),
   'lista do Exibir aberta (F2 M-10)': async (p) => {
      const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
      await sel.scrollIntoViewIfNeeded();
      await sel.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
      return p.evaluate(() => { const l = document.querySelector('govbr-custom-pagination br-select-pnip[label="Exibir"] div.br-select > div.br-list'); return {boxShadow: getComputedStyle(l).boxShadow, estilo: l.getAttribute('style')}; });
   },
   'Voltar com o mouse em cima (F2 M-08)': async (p) => {
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(300);
      await p.locator('pnip-mpa-processos br-button[label="Voltar"] button').hover();
      await p.waitForTimeout(500);
      return p.evaluate(() => { const b = document.querySelector('pnip-mpa-processos br-button[label="Voltar"]'); return {bg: getComputedStyle(b.shadowRoot.querySelector('button')).backgroundImage, estilo: b.getAttribute('style')}; });
   },
   '× do filtro escolhido (F2 M-12)': async (p) => {
      await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Status'}).click();
      await p.waitForTimeout(400);
      await p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').first().click();
      await p.waitForTimeout(1500);
      return p.evaluate(() => { const b = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction > button'); const r = b.getBoundingClientRect(); const c = getComputedStyle(b); return {classe: b.className, w: Math.round(r.width), h: Math.round(r.height), raio: c.borderRadius, fundo: c.backgroundColor}; });
   },
};

const sBase = await servir(dirBase, 4731, 'pnip-f3'), sF3 = await servir(dirF3, 4732, 'pnip-f3'), sF2 = await servir(dirF2, 4733, 'pnip-f2');
const browser = await chromium.launch({headless: true});
const res = {};
try {
   for (const [nome, f] of Object.entries(MEDIDAS)) {
      const v = {};
      for (const [rot, s] of [['semSemente', sBase], ['semeadaF3', sF3], ['semeadaF2', sF2]]) {
         const {ctx, pagina, eventos} = await abrir(browser, s.base, s.ala);
         try { v[rot] = await f(pagina); } catch (e) { v[rot] = {erro: String(e).slice(0, 300)}; }
         v[rot + 'Eventos'] = eventos;
         await ctx.close();
      }
      const j = (x) => JSON.stringify(x);
      v.f3IgualSemSemente = j(v.semeadaF3) === j(v.semSemente);
      v.f2DifereSemSemente = j(v.semeadaF2) !== j(v.semSemente);
      v.passou = v.f3IgualSemSemente && v.f2DifereSemSemente;
      res[nome] = v;
      console.log(nome, v.passou ? 'PASSOU' : 'FALHOU', j(v.semSemente), '| F2:', j(v.semeadaF2));
   }
} finally {
   await browser.close();
   for (const s of [sBase, sF3, sF2]) s.s.close();
}
await writeFile(saida, JSON.stringify(res, null, 1));
