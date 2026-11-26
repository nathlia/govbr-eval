// Uso: node medir.mjs <dirAntes> <dirDepois> <saida.json> <id> [<id> ...]
// Cada medida num contexto novo, nos dois builds (antes = sem semente, depois = build com as mudanças).
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir} from './comum.mjs';

const [dirAntes, dirDepois, saida, ...ids] = process.argv.slice(2);

const PREP = () => {
   window.__cs = (el, props) => { const c = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, c.getPropertyValue(p)])); };
   window.__r = (el) => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100}; };
   window.__proc = () => document.querySelector('pnip-mpa-processos');
};

async function conteudoTabela(p) {
   return p.evaluate(() => {
      const t = document.querySelector('pnip-mpa-processos .br-table table');
      const ths = [...t.querySelectorAll('thead th')].map((x) => x.textContent.replace(/\s+/g, ' ').trim());
      const linhas = [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
      const tag = [...document.querySelectorAll('pnip-mpa-processos span.br-tag.interaction span.text-truncate')].map((x) => x.textContent.trim());
      return {ths, linhas, tag};
   });
}

const MEDIDAS = {
   'M-01': async (p) => p.evaluate(() => {
      const el = document.querySelector('button#avatar-dropdown-trigger span.br-avatar > span');
      return {classe: el.className, ...__r(el), ...__cs(el, ['display', 'border-radius', 'background-color', 'font-size'])};
   }),
   'M-02': async (p) => p.evaluate(() => {
      const sr = __proc().querySelector('br-breadcrumb').shadowRoot;
      return {icone: __cs(sr.querySelector('li.crumb.home button i.fa-home'), ['color']).color, crumbProcessos: __cs(sr.querySelector('li.crumb[data-active] span'), ['color']).color};
   }),
   'M-03': async (p) => p.evaluate(() => {
      const sp = __proc().querySelector('br-divider').shadowRoot.querySelector('span.br-divider');
      return __cs(sp, ['border-top-color', 'border-top-width', 'border-top-style']);
   }),
   'M-04': async (p) => p.evaluate(() => {
      const h = __proc().querySelector('h2');
      return {...__cs(h, ['font-size', 'font-weight', 'color']), ...__r(h)};
   }),
   'M-05': async (p) => p.evaluate(() => [...__proc().querySelector('br-tab').shadowRoot.querySelectorAll('li.tab-item > button')].map((b) => ({rotulo: b.textContent.trim(), ...__cs(b, ['font-size', 'font-weight'])}))),
   'M-06': async (p) => {
      const ativo = await p.evaluate(() => [...__proc().querySelector('br-tab').shadowRoot.querySelectorAll('li.tab-item')].filter((li) => li.classList.contains('active')).map((li) => ({rotulo: li.textContent.trim(), cor: __cs(li.querySelector('button'), ['color']).color})));
      const conteudo = await conteudoTabela(p);
      await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: 'Concluídos'}).click();
      await p.waitForTimeout(1500);
      const depoisConcluidos = await conteudoTabela(p);
      return {ativo, conteudo, depoisConcluidos, mudouAoClicarConcluidos: JSON.stringify(conteudo) !== JSON.stringify(depoisConcluidos)};
   },
   'M-07': async (p) => p.evaluate(() => ({
      meus: __cs([...__proc().querySelectorAll('span.br-tag.interaction span.text-truncate')].find((x) => x.textContent.trim() === 'Meus processos'), ['font-size'])['font-size'],
      vizinhas: [...__proc().querySelectorAll('pnip-multiple-search-table-utils span.br-tag.interaction > span.text-gray-50:not(.fas)')].map((x) => __cs(x, ['font-size'])['font-size']),
   })),
   'M-08': async (p) => {
      const bg = (lab) => p.evaluate((l) => __cs(__proc().querySelector(`br-button[label="${l}"]`).shadowRoot.querySelector('button'), ['background-image'])['background-image'], lab);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(300);
      const repousoVoltar = await bg('Voltar');
      await p.locator('pnip-mpa-processos br-button[label="Voltar"] button').hover();
      await p.waitForTimeout(500);
      const hoverVoltar = await bg('Voltar');
      await p.mouse.move(5, 5);
      await p.locator('pnip-mpa-processos br-button[label="Exportar"] button').hover();
      await p.waitForTimeout(500);
      const hoverExportar = await bg('Exportar');
      return {repousoVoltar, hoverVoltar, hoverExportar};
   },
   'M-09': async (p) => p.evaluate(() => {
      const m = (b) => ({host: __cs(b, ['opacity']).opacity, botao: __cs(b.shadowRoot.querySelector('button'), ['opacity', 'cursor'])});
      const todos = [...__proc().querySelectorAll('table tbody br-button')].filter((b) => (b.getAttribute('title') ?? '').startsWith('Desassociar'));
      const des = todos.filter((b) => b.hasAttribute('disabled'));
      const limpar = document.querySelector('pnip-multiple-search-table-utils br-button[label="Limpar filtros"]');
      return {nDesabilitados: des.length, desabilitados: des.map(m), habilitado1: m(todos[0]), habilitado1Disabled: todos[0].hasAttribute('disabled'), limpar: {...m(limpar), disabled: limpar.hasAttribute('disabled')}};
   }),
   'M-10': async (p) => {
      const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
      await sel.scrollIntoViewIfNeeded();
      const estiloAntes = await sel.locator('div.br-list').getAttribute('style');
      await sel.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
      const r = await p.evaluate(() => {
         const l = document.querySelector('govbr-custom-pagination br-select-pnip[label="Exibir"] div.br-select > div.br-list');
         return {aberta: l.hasAttribute('expanded') || getComputedStyle(l).display !== 'none', display: getComputedStyle(l).display, boxShadow: __cs(l, ['box-shadow'])['box-shadow'], estilo: l.getAttribute('style')};
      });
      return {estiloAntesDeAbrir: estiloAntes, ...r};
   },
   'M-11': async (p) => {
      await p.locator('govbr-custom-pagination nav.br-pagination').first().scrollIntoViewIfNeeded();
      return p.evaluate(() => {
         const bs = [...document.querySelectorAll('nav.br-pagination button.br-button.circle[aria-label]')];
         return {n: bs.length, botoes: bs.map((b) => ({rotulo: b.getAttribute('aria-label'), ...__r(b), raio: __cs(b, ['border-radius'])['border-radius']})), pagina1: [...document.querySelectorAll('nav.br-pagination a.page')].map((a) => a.textContent.trim())};
      });
   },
   'M-12': async (p) => {
      await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Status'}).click();
      await p.waitForTimeout(400);
      const opcao = p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').first();
      const rotuloOpcao = (await opcao.textContent()).trim();
      await opcao.click();
      await p.waitForTimeout(800);
      const x = await p.evaluate(() => {
         const b = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction > button');
         return b ? {classe: b.className, ...__r(b), ...__cs(b, ['border-radius', 'background-color', 'border-top-style', 'border-top-width']), etiqueta: b.parentElement.textContent.trim()} : null;
      });
      let removeu = null;
      if (x) {
         await p.locator('pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction > button').first().click();
         await p.waitForTimeout(1500);
         removeu = await p.evaluate(() => document.querySelectorAll('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction').length === 0);
      }
      return {rotuloOpcao, botao: x, removeuAoClicar: removeu};
   },
   'R-01': async (p) => {
      const sombra = () => p.evaluate(() => __cs(document.querySelector('br-header').shadowRoot.querySelector('header.br-header'), ['box-shadow'])['box-shadow']);
      const inicial = await sombra();
      await p.evaluate(() => window.scrollTo(0, 600));
      await p.waitForTimeout(500);
      return {inicial, rolada: await sombra()};
   },
   'R-02': async (p) => p.evaluate(() => {
      const b = document.querySelector('pnip-search-table-utils div.br-input > button.br-button[aria-label="Buscar"]');
      const campo = document.querySelector('pnip-search-table-utils br-input#search').shadowRoot.querySelector('input');
      const rb = b.getBoundingClientRect(), rc = campo.getBoundingClientRect();
      return {...__r(b), raio: __cs(b, ['border-radius'])['border-radius'], campoH: __r(campo).h, passaEmCima: rb.top < rc.top, passaEmbaixo: rb.bottom > rc.bottom};
   }),
   'R-03': async (p) => {
      await p.locator('pnip-search-table-utils br-input#search input').click();
      await p.waitForTimeout(400);
      return p.evaluate(() => {
         const i = document.querySelector('pnip-search-table-utils br-input#search').shadowRoot.querySelector('input');
         return {focado: i.matches(':focus'), ...__cs(i, ['border-top-color', 'box-shadow'])};
      });
   },
   'R-04': async (p) => {
      const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
      await sel.scrollIntoViewIfNeeded();
      await sel.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
      const item = sel.locator('div.br-list div.br-item', {hasText: /^\s*25\s*$/});
      await item.hover();
      await p.waitForTimeout(500);
      return item.evaluate((el) => ({rotulo: el.textContent.trim(), bg: getComputedStyle(el).getPropertyValue('background-image')}));
   },
};

const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const ok = {
   'M-01': (a, d) => a.classe.split(' ').includes('content') && near(a.w, 40) && near(a.h, 40) && a.display === 'flex' && a['border-radius'] === '50%' && a['background-color'] === 'rgb(255, 140, 0)' && a['font-size'] === '24.192px'
      && !d.classe.split(' ').includes('content') && d.w > 10 && d.w < 26 && near(d.h, 40, 3) && d.display === 'block' && d['border-radius'] === '0px' && d['background-color'] === a['background-color'] && d['font-size'] === a['font-size'],
   'M-02': (a, d) => a.icone === 'rgb(19, 81, 180)' && d.icone === 'rgb(0, 94, 162)' && a.crumbProcessos === 'rgb(51, 51, 51)' && d.crumbProcessos === 'rgb(51, 51, 51)',
   'M-03': (a, d) => a['border-top-color'] === 'rgb(204, 204, 204)' && d['border-top-color'] === 'rgb(214, 214, 214)' && a['border-top-width'] === '2px' && d['border-top-width'] === '2px' && a['border-top-style'] === 'solid' && d['border-top-style'] === 'solid',
   'M-04': (a, d) => a['font-size'] === '34.832px' && near(a.h, 40) && d['font-size'] === '32px' && near(d.h, 36.8, 0.6) && a['font-weight'] === '700' && d['font-weight'] === '700' && a.color === 'rgb(0, 94, 162)' && d.color === a.color,
   'M-05': (a, d) => a.length === 3 && d.length === 3 && a.every((x) => x['font-size'] === '20.16px' && x['font-weight'] === '500') && d.every((x) => x['font-size'] === '16.8px' && x['font-weight'] === '500'),
   'M-06': (a, d) => a.ativo.length === 1 && a.ativo[0].rotulo === 'Tramitando' && a.ativo[0].cor === 'rgb(12, 50, 111)' && d.ativo.length === 1 && d.ativo[0].rotulo === 'Aguardando análise'
      && a.conteudo.tag.includes('Meus processos') && a.conteudo.ths.some((t) => t.includes('Analista')) && a.conteudo.ths.some((t) => t.includes('Téc. Adm.'))
      && JSON.stringify(a.conteudo) === JSON.stringify(d.conteudo) && a.mudouAoClicarConcluidos && d.mudouAoClicarConcluidos && JSON.stringify(a.depoisConcluidos) === JSON.stringify(d.depoisConcluidos),
   'M-07': (a, d) => a.meus === '16.8px' && d.meus === '15px' && a.vizinhas.length > 0 && a.vizinhas.every((x) => x === '16.8px') && JSON.stringify(a.vizinhas) === JSON.stringify(d.vizinhas),
   'M-08': (a, d) => a.hoverVoltar === 'linear-gradient(rgba(19, 81, 180, 0.16), rgba(19, 81, 180, 0.16))' && d.hoverVoltar === 'linear-gradient(rgba(19, 81, 180, 0), rgba(19, 81, 180, 0))'
      && a.repousoVoltar === 'none' && d.repousoVoltar === 'none' && a.hoverExportar === a.hoverVoltar && d.hoverExportar === a.hoverExportar,
   'M-09': (a, d) => {
      // host e button interno medidos separadamente: cada um 0.45 antes, cada um 1 depois
      const op = (x, v) => x.host === v && x.botao.opacity === v;
      return a.nDesabilitados === 8 && d.nDesabilitados === 8 && a.desabilitados.every((x) => op(x, '0.45') && x.botao.cursor === 'not-allowed') && d.desabilitados.every((x) => op(x, '1') && x.botao.cursor === 'not-allowed')
         && !a.habilitado1Disabled && op(a.habilitado1, '1') && op(d.habilitado1, '1') && a.limpar.disabled && d.limpar.disabled && op(a.limpar, '0.45') && op(d.limpar, '0.45');
   },
   'M-10': (a, d) => a.aberta && d.aberta && a.boxShadow === 'rgba(0, 0, 0, 0.16) 0px 3px 6px 0px' && d.boxShadow === 'rgba(0, 0, 0, 0.16) 0px 6px 6px 0px' && /surface-shadow-lg/.test(d.estilo ?? ''),
   'M-11': (a, d) => a.n === 2 && a.botoes.map((b) => b.rotulo).join() === 'Página anterior,Página seguinte' && a.botoes.every((b) => near(b.w, 40) && near(b.h, 40) && b.raio === '50%')
      && d.n === 1 && d.botoes[0].rotulo === 'Página seguinte' && d.pagina1.includes('1') && a.pagina1.includes('1'),
   'M-12': (a, d) => a.rotuloOpcao === 'Aguardando análise' && d.rotuloOpcao === 'Aguardando análise' && a.botao && d.botao
      && a.botao.classe === 'br-button inverted circle' && near(a.botao.w, 28) && near(a.botao.h, 28) && a.botao['border-radius'] === '50%' && a.botao['background-color'] === 'rgb(19, 81, 180)' && a.botao['border-top-style'] === 'none'
      && d.botao.classe === 'inverted circle' && d.botao.w > 30 && d.botao.w < 50 && d.botao.h > 22 && d.botao.h < 38 && d.botao['border-radius'] === '0px' && d.botao['background-color'] === 'rgb(240, 240, 240)' && d.botao['border-top-style'] === 'outset' && d.botao['border-top-width'] === '2px'
      && a.removeuAoClicar === true && d.removeuAoClicar === true,
   'R-01': (a, d) => a.inicial === 'rgba(0, 0, 0, 0.16) 0px 1px 6px 0px' && d.inicial === 'rgba(0, 0, 0, 0.3) 0px 2px 12px 0px' && d.rolada === d.inicial,
   'R-02': (a, d) => near(a.w, 32) && near(a.h, 32) && near(a.campoH, 32) && near(d.w, 40) && near(d.h, 40) && d.passaEmCima && d.passaEmbaixo && a.raio === '50%' && d.raio === '50%',
   'R-03': (a, d) => a.focado && d.focado && a['border-top-color'] === 'rgb(194, 133, 12)' && a['box-shadow'] === 'rgb(194, 133, 12) 0px 0px 0px 2px' && d['border-top-color'] === 'rgb(19, 81, 180)' && d['box-shadow'] === 'rgb(19, 81, 180) 0px 0px 0px 2px',
   'R-04': (a, d) => a.bg === 'linear-gradient(rgba(51, 51, 51, 0.16), rgba(51, 51, 51, 0.16))' && d.bg === 'linear-gradient(rgba(51, 51, 51, 0), rgba(51, 51, 51, 0))',
};

const sA = await servir(dirAntes, 4731), sD = await servir(dirDepois, 4732);
const browser = await chromium.launch({headless: true});
const res = {};
try {
   for (const id of ids) {
      const val = {};
      for (const [rot, base] of [['antes', sA.base], ['depois', sD.base]]) {
         const {ctx, pagina, eventos} = await abrir(browser, base);
         await pagina.evaluate(PREP);
         try { val[rot] = await MEDIDAS[id](pagina); } catch (e) { val[rot] = {erro: String(e)}; }
         val[rot + 'Eventos'] = eventos;
         await ctx.close();
      }
      let passou = false;
      try { passou = !!ok[id](val.antes, val.depois); } catch (e) { val.erroCriterio = String(e); }
      res[id] = {passou, ...val};
      console.log(id, passou ? 'PASSOU' : 'FALHOU');
   }
} finally {
   await browser.close();
   sA.s.close(); sD.s.close();
}
await writeFile(saida, JSON.stringify(res, null, 1));
