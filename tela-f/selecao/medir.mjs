// Medição dos pontos candidatos (estado inicial + estados por interação). Somente leitura.
import { createRequire } from 'node:module';
const require = createRequire('F:/Dev Nath/TCC/govbr-eval/node_modules/');
const { chromium } = require('playwright');
import fs from 'node:fs';

const OUT = 'F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/selecao/explor';
const URL = 'http://127.0.0.1:3411/pnip-d/portal-mpa/processos?mock-perfil=mpa';
const PROPS = ['font-family','font-size','font-weight','line-height','color','background-color','opacity','cursor',
  'padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left',
  'border-top','border-right','border-bottom','border-left','border-radius','outline','outline-offset','box-shadow','height','width',
  'text-transform','text-decoration-line','text-align','vertical-align','white-space','display','justify-content','gap'];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// helper in page: query through shadow roots
await page.addInitScript({ content: `
window.__q = (path, all) => {
  const parts = path.split('>>>').map(s => s.trim());
  let roots = [document];
  for (let i = 0; i < parts.length; i++) {
    const next = [];
    for (const r of roots) {
      const found = (i === parts.length - 1 && all) ? [...r.querySelectorAll(parts[i])] : [r.querySelector(parts[i])].filter(Boolean);
      for (const f of found) next.push(i === parts.length - 1 ? f : (f.shadowRoot || f));
    }
    roots = next;
  }
  return roots;
};
window.__m = (path, props, pseudo) => {
  const els = window.__q(path, true);
  return els.slice(0, 3).map(el => {
    const cs = getComputedStyle(el, pseudo || null);
    const o = {};
    for (const p of props) o[p] = cs.getPropertyValue(p);
    const r = el.getBoundingClientRect();
    o._rect = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    o._text = (el.innerText || '').trim().slice(0, 50);
    o._count = els.length;
    return o;
  });
};` });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const M = async (label, path, pseudo) => {
  const v = await page.evaluate(([p, props, ps]) => window.__m(p, props, ps), [path, PROPS, pseudo]);
  return { label, path, pseudo: pseudo || null, v };
};
const results = {};
const take = async (state, list) => {
  results[state] = [];
  for (const [label, path, pseudo] of list) results[state].push(await M(label, path, pseudo));
};

await take('inicial', [
  ['header logo', 'br-header >>> img.large-img'],
  ['header sign', 'br-header >>> .header-sign'],
  ['header title', 'br-header >>> .header-title'],
  ['header surface', 'br-header >>> header.br-header'],
  ['header menu btn', 'br-header >>> button#navigation'],
  ['signin trigger', 'button#avatar-dropdown-trigger'],
  ['avatar', 'span.br-avatar'],
  ['avatar content', 'span.br-avatar .content'],
  ['perfil badge', 'span.dropdown-user-perfil'],
  ['breadcrumb root', 'br-breadcrumb >>> .br-breadcrumb'],
  ['breadcrumb home btn', 'br-breadcrumb >>> li.home button'],
  ['breadcrumb sep', 'br-breadcrumb >>> li.crumb i.icon'],
  ['breadcrumb current', 'br-breadcrumb >>> li.crumb[data-active] span'],
  ['divider', 'br-divider >>> span.br-divider'],
  ['h2', 'pnip-mpa-processos h2'],
  ['exportar btn', 'br-button[label="Exportar"] >>> button'],
  ['voltar btn', 'br-button[label="Voltar"] >>> button'],
  ['tab root', 'br-tab >>> div.br-tab'],
  ['tab nav', 'br-tab >>> nav.tab-nav'],
  ['tab ul', 'br-tab >>> ul'],
  ['tab item', 'br-tab >>> li.tab-item'],
  ['tab item active', 'br-tab >>> li.tab-item.active'],
  ['tab btn', 'br-tab >>> li.tab-item button'],
  ['tab btn active', 'br-tab >>> li.tab-item.active button'],
  ['tab name', 'br-tab >>> li.tab-item span.name'],
  ['tab-panel wrapper', 'div.tab-panel.mt-3'],
  ['meus processos tag', 'div.tab-panel span.br-tag.interaction'],
  ['meus processos icon', 'div.tab-panel span.br-tag.interaction i'],
  ['meus processos label', 'div.tab-panel span.br-tag.interaction span.text-truncate'],
  ['filtro tag', 'pnip-multiple-search-table-utils span.br-tag'],
  ['limpar filtros btn', 'pnip-multiple-search-table-utils br-button >>> button'],
  ['search input', 'br-input#search >>> input'],
  ['search input wrap', 'br-input#search >>> div.br-input'],
  ['search btn', 'pnip-search-table-utils button.br-button'],
  ['search placeholder', 'br-input#search >>> input', '::placeholder'],
  ['ultima atualizacao', 'div.mb-2'],
  ['br-table', 'div.br-table'],
  ['table', 'div.br-table table'],
  ['th', 'div.br-table thead th'],
  ['thead tr', 'div.br-table thead tr'],
  ['td', 'div.br-table tbody td'],
  ['tbody tr', 'div.br-table tbody tr'],
  ['td link', 'div.br-table tbody td a'],
  ['td sort icon', 'div.br-table thead br-icon-base >>> i'],
  ['acao ver btn', 'div.br-table tbody br-button[title="Ver processo"] >>> button'],
  ['acao assinar btn', 'div.br-table tbody br-button[title="Assinar"] >>> button'],
  ['acao desassociar btn', 'div.br-table tbody br-button[title^="Desassociar"] >>> button'],
  ['status chip', 'pnip-status-solicitacao-utils div[class*="bg-"]'],
  ['pag nav', 'nav.br-pagination.small'],
  ['pag ul', 'nav.br-pagination.small ul'],
  ['pag arrow', 'nav.br-pagination.small button.br-button.circle'],
  ['pag page active', 'nav.br-pagination.small a.page'],
  ['pag info', 'div.pagination-information'],
  ['pag info total', 'div.pagination-information span.total'],
  ['pag perpage label', 'div.pagination-per-page label'],
  ['pag perpage input', 'div.pagination-per-page input'],
  ['pag perpage btn', 'div.pagination-per-page button.br-button'],
  ['pag perpage wrapper', 'div.pagination-per-page'],
  ['pag divider', 'nav.br-pagination span.br-divider'],
  ['pag nav2', 'nav.br-pagination[aria-label="paginação"]'],
  ['main', 'main.container-lg'],
  ['p-5', 'pnip-mpa-processos > div.p-5'],
  ['body', 'body'],
]);
await page.screenshot({ path: `${OUT}/m-inicial-viewport.png` });

// Hover em Exportar
await page.hover('br-button[label="Exportar"]');
await page.waitForTimeout(300);
await take('hover-exportar', [['exportar btn hover', 'br-button[label="Exportar"] >>> button'], ['exportar btn hover ::before', 'br-button[label="Exportar"] >>> button', '::before'], ['exportar btn hover ::after', 'br-button[label="Exportar"] >>> button', '::after']]);
await page.mouse.move(5, 5);

// Foco por teclado: Tab até o Exportar
await page.keyboard.press('Tab');
const focusSeq = [];
for (let i = 0; i < 25; i++) {
  const info = await page.evaluate(() => {
    let a = document.activeElement; let path = a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.getAttribute('label') ? `[label=${a.getAttribute('label')}]` : '');
    while (a && a.shadowRoot && a.shadowRoot.activeElement) { a = a.shadowRoot.activeElement; path += ' >>> ' + a.tagName.toLowerCase() + '.' + [...a.classList].join('.'); }
    const cs = getComputedStyle(a);
    return { path, outline: cs.outline, outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow };
  });
  focusSeq.push(info);
  await page.keyboard.press('Tab');
}
results['foco-teclado'] = focusSeq;
await page.screenshot({ path: `${OUT}/m-foco.png` });

// Abrir filtro "Tipo de processo"
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.locator('pnip-multiple-search-table-utils span.br-tag', { hasText: 'Tipo de processo' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/m-filtro-aberto.png` });
const filtroAberto = await page.evaluate(() => {
  const list = document.querySelector('pnip-multiple-search-table-utils .br-select .br-list');
  if (!list) return null;
  const pick = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { cls: el.className, rect: [r.x, r.y, r.width, r.height].map(Math.round), fs: cs.fontSize, fw: cs.fontWeight, color: cs.color, bg: cs.backgroundColor, pad: cs.padding, shadow: cs.boxShadow, radius: cs.borderRadius, border: cs.borderBottom, cursor: cs.cursor, zIndex: cs.zIndex, position: cs.position, txt: el.innerText.trim().slice(0,40) }; };
  return { list: pick(list), items: [...list.querySelectorAll('.br-item')].slice(0, 3).map(pick), radios: [...list.querySelectorAll('.br-radio')].slice(0, 2).map(pick), labels: [...list.querySelectorAll('label')].slice(0, 2).map(pick) };
});
results['filtro-aberto'] = filtroAberto;
// hover item
await page.locator('pnip-multiple-search-table-utils .br-list .br-item').nth(1).hover();
await page.waitForTimeout(200);
results['filtro-item-hover'] = await page.evaluate(() => { const el = document.querySelectorAll('pnip-multiple-search-table-utils .br-list .br-item')[1]; const cs = getComputedStyle(el); const b = getComputedStyle(el, '::before'); const a = getComputedStyle(el, '::after'); return { bg: cs.backgroundColor, color: cs.color, cursor: cs.cursor, before: b.backgroundColor + ' ' + b.opacity + ' ' + b.content, after: a.backgroundColor + ' ' + a.opacity + ' ' + a.content }; });
// selecionar opção
await page.locator('pnip-multiple-search-table-utils .br-list .br-radio').nth(1).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/m-filtro-selecionado.png` });
await take('filtro-selecionado', [
  ['tag selecionada', 'pnip-multiple-search-table-utils div.row.pl-2 span.br-tag'],
  ['tag selecionada icon', 'pnip-multiple-search-table-utils div.row.pl-2 span.br-tag > i'],
  ['tag selecionada label', 'pnip-multiple-search-table-utils div.row.pl-2 span.br-tag span.text-truncate'],
  ['tag selecionada close btn', 'pnip-multiple-search-table-utils div.row.pl-2 span.br-tag button'],
  ['limpar filtros habilitado', 'pnip-multiple-search-table-utils br-button >>> button'],
  ['empty', 'div.mt-5.text-center p'],
]);

// Toggle meus processos
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.locator('div.tab-panel span.br-tag.interaction', { hasText: 'Meus processos' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/m-meus-off.png`, fullPage: true });
await take('meus-processos-off', [['meus processos tag off', 'div.tab-panel span.br-tag.interaction'], ['th off', 'div.br-table thead th'], ['assinar selecionados', 'br-button[label="Assinar selecionados"] >>> button']]);

// Busca
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.locator('br-input#search input').fill('000011');
await page.locator('br-input#search input').press('a');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/m-busca.png` });

// Seleção de checkbox -> Assinar selecionados
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
const cbs = page.locator('div.br-table tbody input[type=checkbox]');
results['n-checkboxes'] = await cbs.count();
if (await cbs.count()) { await cbs.first().check(); await page.waitForTimeout(600); }
await page.screenshot({ path: `${OUT}/m-selecao.png`, fullPage: true });
const r1 = await page.evaluate(() => {
  const host = document.querySelector('br-button[label="Assinar selecionados"]');
  if (!host) return null; const b = host.shadowRoot.querySelector('button'); const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
  const ic = host.shadowRoot.querySelector('i'); const ics = ic ? getComputedStyle(ic) : null;
  return { cls: b.className, rect: [r.x, r.y, r.width, r.height].map(Math.round), bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, fs: cs.fontSize, fw: cs.fontWeight, pad: cs.padding, icon: ic ? ic.className + ' ' + ics.marginRight : null, html: host.shadowRoot.innerHTML.slice(0, 400), voltar: (()=>{const v=document.querySelector('br-button[label="Voltar"]').getBoundingClientRect(); return [v.x,v.y,v.width,v.height].map(Math.round);})() };
});
results['assinar-selecionados'] = r1;

// Avatar dropdown
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.click('button#avatar-dropdown-trigger');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/m-avatar-menu.png` });
results['avatar-menu'] = await page.evaluate(() => {
  const m = document.querySelector('#avatar-menu'); const cs = getComputedStyle(m); const r = m.getBoundingClientRect();
  const it = m.querySelector('button.br-item'); const ics = getComputedStyle(it);
  return { hidden: m.hidden, rect: [r.x, r.y, r.width, r.height].map(Math.round), shadow: cs.boxShadow, bg: cs.backgroundColor, radius: cs.borderRadius, pad: cs.padding, item: { fs: ics.fontSize, fw: ics.fontWeight, color: ics.color, pad: ics.padding, h: it.getBoundingClientRect().height } };
});

// Menu hamburguer
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.locator('br-header').evaluate(h => h.shadowRoot.querySelector('button#navigation').click());
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/m-menu.png` });

// Abas
for (const id of ['AGUARDANDO_ANALISE', 'HISTORICO']) {
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  await page.locator('br-tab').evaluate((t, id) => t.shadowRoot.querySelector(`button[data-panel="${id}"]`).click(), id);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/m-aba-${id}-150ms.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/m-aba-${id}.png`, fullPage: true });
  await take('aba-' + id, [['assumir btn', 'div.br-table tbody br-button[title="Assumir processo"] >>> button'], ['th', 'div.br-table thead th'], ['td', 'div.br-table tbody td'], ['loading', 'br-loading']]);
}

// Select de paginação aberto
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.locator('div.pagination-per-page input#total').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/m-select-pag.png`, fullPage: true });
results['select-pag-aberto'] = await page.evaluate(() => {
  const l = document.querySelector('div.pagination-per-page .br-list'); const cs = getComputedStyle(l); const r = l.getBoundingClientRect();
  const items = [...l.querySelectorAll('.br-item')].map(i => { const c = getComputedStyle(i); const lab = i.querySelector('label'); const lc = getComputedStyle(lab); return { cls: i.className, bg: c.backgroundColor, color: c.color, h: Math.round(i.getBoundingClientRect().height), pad: c.padding, lfs: lc.fontSize, lfw: lc.fontWeight }; });
  const btn = document.querySelector('div.pagination-per-page button.br-button i');
  return { rect: [r.x, r.y, r.width, r.height].map(Math.round), shadow: cs.boxShadow, display: cs.display, items, icon: btn.className };
});

fs.writeFileSync(`${OUT}/medidas.json`, JSON.stringify(results, null, 1));
console.log('ok');
await browser.close();
