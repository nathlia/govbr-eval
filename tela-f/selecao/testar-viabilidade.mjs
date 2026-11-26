// Testes de viabilidade/medição complementar (somente no navegador; nada é gravado no app).
import { createRequire } from 'node:module';
const require = createRequire('F:/Dev Nath/TCC/govbr-eval/node_modules/');
const { chromium } = require('playwright');
import fs from 'node:fs';
const OUT = 'F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/selecao/explor';
const URL = 'http://127.0.0.1:3411/pnip-d/portal-mpa/processos?mock-perfil=mpa';
const browser = await chromium.launch({ headless: true });
const res = {};
async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  return { ctx, page };
}

// 1) breadcrumb sem home:true
{ const { ctx, page } = await fresh();
  res.breadcrumbSemHome = await page.evaluate(async () => {
    const b = document.querySelector('br-breadcrumb');
    b.links = [{ label: 'Home', url: '/portal-mpa/' }, { label: 'Processos', active: true }];
    await new Promise(r => setTimeout(r, 300));
    return b.shadowRoot.innerHTML.replace(/<!---->/g, '').slice(0, 700);
  });
  // 2) foco: variável no host
  await page.evaluate(() => { const h = document.querySelector('br-button[label="Exportar"]'); h.style.setProperty('--focus-style', 'solid'); h.style.setProperty('--focus-color', '#1351b4'); h.style.setProperty('--focus', '#1351b4'); });
  await page.locator('br-button[label="Exportar"]').evaluate(h => h.shadowRoot.querySelector('button').focus());
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  res.focoVarHost = await page.evaluate(() => { const b = document.querySelector('br-button[label="Exportar"]').shadowRoot.querySelector('button'); const cs = getComputedStyle(b); return { cls: b.className, outline: cs.outline, offset: cs.outlineOffset }; });
  // 3) text-transform herdado no host
  await page.evaluate(() => { document.querySelector('pnip-multiple-search-table-utils br-button').style.textTransform = 'uppercase'; });
  res.uppercaseHerdado = await page.evaluate(() => getComputedStyle(document.querySelector('pnip-multiple-search-table-utils br-button').shadowRoot.querySelector('button')).textTransform);
  // 4) menu do avatar: ícone antes/depois
  res.avatarIconeAntes = await page.evaluate(() => document.querySelector('#avatar-dropdown-trigger > i').className);
  await page.click('#avatar-dropdown-trigger'); await page.waitForTimeout(400);
  res.avatarIconeDepois = await page.evaluate(() => ({ icon: document.querySelector('#avatar-dropdown-trigger > i').className, expanded: document.querySelector('#avatar-dropdown-trigger').getAttribute('aria-expanded') }));
  await page.screenshot({ path: `${OUT}/v-avatar-aberto.png` });
  await ctx.close(); }

// 5) seleção de checkbox -> Assinar selecionados
{ const { ctx, page } = await fresh();
  const cbs = page.locator('div.br-table tbody input[type=checkbox]');
  res.nCheckbox = await cbs.count();
  if (res.nCheckbox) { await cbs.first().check(); await page.waitForTimeout(600); }
  res.assinarSelecionados = await page.evaluate(() => {
    const host = document.querySelector('br-button[label="Assinar selecionados"]'); if (!host) return null;
    const b = host.shadowRoot.querySelector('button'); const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
    const v = document.querySelector('br-button[label="Voltar"]').shadowRoot.querySelector('button').getBoundingClientRect();
    return { cls: b.className, rect: [r.x, r.y, r.width, r.height].map(Math.round), bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, inner: host.shadowRoot.innerHTML.replace(/<!---->/g, '').slice(0, 300), voltar: [v.x, v.y, v.width, v.height].map(Math.round) };
  });
  await page.screenshot({ path: `${OUT}/v-selecao.png`, fullPage: true });
  await ctx.close(); }

// 6) hover em item de lista do filtro e do select de paginação; hover em linha da tabela
{ const { ctx, page } = await fresh();
  await page.locator('pnip-multiple-search-table-utils span.br-tag', { hasText: 'Status' }).click(); await page.waitForTimeout(300);
  const it = page.locator('pnip-multiple-search-table-utils .br-list .br-item').nth(1);
  const before = await it.evaluate(e => getComputedStyle(e).backgroundImage);
  await it.hover(); await page.waitForTimeout(200);
  res.hoverItemFiltro = { antes: before, depois: await it.evaluate(e => { const c = getComputedStyle(e); return { bgImage: c.backgroundImage, bg: c.backgroundColor, cursor: c.cursor, labelCursor: getComputedStyle(e.querySelector('label')).cursor }; }) };
  res.listaFiltroMaxH = await page.evaluate(() => { const l = document.querySelector('pnip-multiple-search-table-utils .br-list'); const c = getComputedStyle(l); return { maxH: c.maxHeight, overflow: c.overflowY, h: l.getBoundingClientRect().height, n: l.querySelectorAll('.br-item').length }; });
  await page.screenshot({ path: `${OUT}/v-filtro-status-aberto.png` });
  await page.mouse.move(5, 5);
  // linha da tabela hover
  await page.keyboard.press('Escape');
  await ctx.close(); }
{ const { ctx, page } = await fresh();
  const tr = page.locator('div.br-table tbody tr').nth(2);
  const b = await tr.evaluate(e => getComputedStyle(e).backgroundColor + '|' + getComputedStyle(e).backgroundImage);
  await tr.hover(); await page.waitForTimeout(200);
  res.hoverLinha = { antes: b, depois: await tr.evaluate(e => getComputedStyle(e).backgroundColor + '|' + getComputedStyle(e).backgroundImage) };
  // hover Exportar background-image
  await page.hover('br-button[label="Exportar"]'); await page.waitForTimeout(200);
  res.hoverExportar = await page.evaluate(() => getComputedStyle(document.querySelector('br-button[label="Exportar"]').shadowRoot.querySelector('button')).backgroundImage);
  // foco teclado no trigger do avatar
  await page.locator('#avatar-dropdown-trigger').focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  res.focoAvatar = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { id: a.id, outline: c.outline, offset: c.outlineOffset }; });
  // aba Aguardando: botões Assumir desabilitados
  await page.locator('br-tab').evaluate(t => t.shadowRoot.querySelector('button[data-panel="AGUARDANDO_ANALISE"]').click());
  await page.waitForTimeout(1500);
  res.assumir = await page.evaluate(() => [...document.querySelectorAll('br-button[title="Assumir processo"]')].map(h => { const b = h.shadowRoot.querySelector('button'); const c = getComputedStyle(b); return { disabled: b.disabled, opacity: c.opacity, cursor: c.cursor, color: c.color }; }));
  await page.screenshot({ path: `${OUT}/v-aba-aguardando.png`, fullPage: true });
  await ctx.close(); }

// 7) select da paginação: abrir e hover
{ const { ctx, page } = await fresh();
  await page.locator('div.pagination-per-page input#total').click(); await page.waitForTimeout(300);
  res.selectPagIconeAberto = await page.evaluate(() => document.querySelectorAll('div.pagination-per-page button.br-button i')[0].className);
  await page.keyboard.press('Escape'); await page.mouse.click(5, 5); await page.waitForTimeout(300);
  res.selectPagIconeFechado = await page.evaluate(() => document.querySelectorAll('div.pagination-per-page button.br-button i')[0].className);
  await ctx.close(); }

fs.writeFileSync(`${OUT}/viabilidade.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
await browser.close();
