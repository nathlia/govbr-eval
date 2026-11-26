// Para cada candidato: página nova -> estado pedido -> mede "antes" -> simula o "depois"
// por manipulação de DOM/CSS -> mede "depois" -> captura. Saída: medidas.json + capturas/.
import fs from 'node:fs';
import { chromium, abrir, OUT } from './comum.mjs';

const R = `function rect(el){const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y+scrollY),w:Math.round(r.width),h:Math.round(r.height),b:Math.round(r.bottom+scrollY),r:Math.round(r.right)}}`;
const ev = (page, fn, arg) => page.evaluate(`(()=>{${R}; return (${fn})(${JSON.stringify(arg ?? null)})})()`);
const css = (page, text) => page.addStyleTag({ content: text });

async function shot(page, nome, sel) {
  try {
    const el = sel ? await page.$(sel) : null;
    if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${OUT}/capturas/${nome}.png` }); }
    else await page.screenshot({ path: `${OUT}/capturas/${nome}.png` });
  } catch (e) { await page.screenshot({ path: `${OUT}/capturas/${nome}.png` }); }
}

// ---- estados não iniciais ----
async function abrirFiltro(page, rotulo = 'Tipo de processo') {
  await page.locator('pnip-multiple-search-table-utils span.br-tag', { hasText: rotulo }).first().click();
  await page.waitForSelector('pnip-multiple-search-table-utils div.br-select div.br-list', { timeout: 5000 });
  await page.waitForTimeout(300);
}
async function abaAguardando(page) {
  const btn = await page.evaluateHandle(() => {
    const t = document.querySelector('br-tab');
    return [...t.shadowRoot.querySelectorAll('button')].find(b => /Aguardando/.test(b.textContent));
  });
  await btn.asElement().click();
  await page.waitForTimeout(1500);
}

const C = {};

C['F-facil-1'] = async (page) => {
  const f = () => { const tag = document.querySelector('div.tab-panel span.br-tag.interaction'); const s = tag.querySelector('span'); return { tag: rect(tag), tagH: getComputedStyle(tag).height, tagOverflow: getComputedStyle(tag).overflow, label: rect(s), ws: getComputedStyle(s).whiteSpace, cls: s.className }; };
  const antes = await ev(page, f);
  await shot(page, 'F-facil-1-antes', 'div.tab-panel span.br-tag.interaction');
  await ev(page, () => { const s = document.querySelector('div.tab-panel span.br-tag.interaction > span'); s.className = ''; s.setAttribute('style', 'display:inline-block; max-width:64px; white-space:normal; line-height:1.2'); });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-facil-1-depois', 'div.tab-panel > div.col > div.row');
  return { antes, depois };
};

C['F-facil-2'] = async (page) => {
  const f = () => [...document.querySelectorAll('div.br-table tbody tr')].slice(0, 4).map(tr => { const td = tr.children[4]; const cs = getComputedStyle(td); return { t: td.textContent.trim().replace(/\s+/g, ' '), ws: cs.whiteSpace, to: cs.textOverflow, ov: cs.overflow, sw: td.scrollWidth, cw: td.clientWidth, title: td.getAttribute('title') }; });
  const antes = await ev(page, f);
  await ev(page, () => document.querySelectorAll('div.br-table tbody tr').forEach(tr => tr.children[4].setAttribute('style', 'max-width:90px; white-space:nowrap; overflow:hidden')));
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-facil-2-depois', 'div.br-table');
  return { antes, depois };
};

C['F-facil-3'] = async (page) => {
  const f = () => { const w = document.querySelector('pnip-search-table-utils div.br-input'); const inp = w.querySelector('br-input'); const field = inp.shadowRoot?.querySelector('input') || inp; const b = w.querySelector('button.br-button'); const rf = rect(field), rb = rect(b); return { campo: rf, botao: rb, mt: getComputedStyle(b).marginTop, desvioCentro: Math.round((rb.y + rb.h / 2) - (rf.y + rf.h / 2)), dentro: rb.y >= rf.y - 1 && rb.b <= rf.b + 1 }; };
  const antes = await ev(page, f);
  await shot(page, 'F-facil-3-antes', 'pnip-search-table-utils');
  await ev(page, () => document.querySelectorAll('pnip-search-table-utils div.br-input > button.br-button').forEach(b => b.style.marginTop = '-12px'));
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-facil-3-depois', 'div.tab-panel');
  return { antes, depois };
};

C['F-facil-4'] = async (page) => {
  const f = () => { const h = document.querySelector('br-button[label="Exportar"]'); const b = h.shadowRoot.querySelector('button'); const cs = getComputedStyle(b); return { host: rect(h), btn: rect(b), pl: cs.paddingLeft, pr: cs.paddingRight, hostOverflow: getComputedStyle(h).overflow, texto: b.textContent.trim() }; };
  const antes = await ev(page, f);
  await ev(page, () => document.querySelector('br-button[label="Exportar"]').setAttribute('style', 'display:inline-block; width:72px; overflow:hidden'));
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await page.screenshot({ path: `${OUT}/capturas/F-facil-4-depois.png`, clip: { x: 1000, y: 100, width: 280, height: 160 } });
  return { antes, depois };
};

C['F-facil-5'] = async (page) => {
  const f = () => { const cols = [...document.querySelectorAll('pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1')].filter(c => c.querySelector('span.br-tag')); const ts = cols.map(c => { const t = c.querySelector('span.br-tag'); return { t: t.textContent.trim(), ...rect(t) }; }); const gaps = []; for (let i = 1; i < ts.length; i++) if (ts[i].y === ts[i - 1].y) gaps.push(ts[i].x - ts[i - 1].r); return { ts, gaps }; };
  const antes = await ev(page, f);
  await ev(page, () => [...document.querySelectorAll('pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1')].filter(c => c.querySelector('span.br-tag')).forEach(c => c.style.marginRight = '-28px'));
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-facil-5-depois', 'pnip-multiple-search-table-utils');
  return { antes, depois };
};

C['F-facil-6'] = async (page) => {
  const f = () => { const v = document.querySelector('br-button[label="Voltar"]'); const vb = v.shadowRoot.querySelector('button'); const pg = document.querySelector('govbr-custom-pagination'); const sel = [...pg.querySelectorAll('br-select-pnip')].map(s => rect(s.querySelector('input'))); const rv = rect(vb), rp = rect(pg); const inter = sel.map(s => !(rv.r <= s.x || rv.x >= s.r || rv.b <= s.y || rv.y >= s.b)); return { voltar: rv, paginacao: rp, selects: sel, gap: rv.y - rp.b, intersecta: inter }; };
  const antes = await ev(page, f);
  await ev(page, () => { const d = document.querySelector('br-button[label="Voltar"]').parentElement; d.classList.remove('mt-4'); d.style.marginTop = '-20px'; });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await page.evaluate(() => document.querySelector('govbr-custom-pagination').scrollIntoView());
  await shot(page, 'F-facil-6-depois', 'div.p-5');
  return { antes, depois };
};

C['F-medio-1'] = async (page) => {
  const f = () => [...document.querySelectorAll('div.br-table tbody br-button')].map(h => { const b = h.shadowRoot.querySelector('button'); return { title: h.getAttribute('title'), cls: b.className, bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color }; }).filter((x, i, a) => x.title === 'Assinar' || i < 3);
  const antes = await ev(page, f);
  const primarias = await ev(page, () => [...document.querySelectorAll('br-button')].filter(h => /primary/.test(h.shadowRoot.querySelector('button').className)).length);
  await ev(page, () => document.querySelectorAll('div.br-table tbody br-button[title="Assinar"]').forEach(h => h.setAttribute('type', 'primary')));
  await page.waitForTimeout(400);
  const depois = await ev(page, f);
  await shot(page, 'F-medio-1-depois', 'div.br-table');
  return { antes, primariasNaTela: primarias, depois };
};

C['F-medio-2'] = async (page) => {
  const f = () => { const ex = document.querySelector('br-button[label="Exportar"]').shadowRoot.querySelector('button'); const v = document.querySelector('br-button[label="Voltar"]'); const vb = v ? v.shadowRoot.querySelector('button') : document.querySelector('button.br-button.secondary#voltar-core'); const cs = getComputedStyle(vb); return { exportarRadius: getComputedStyle(ex).borderTopLeftRadius, voltarRadius: cs.borderTopLeftRadius, voltarBorder: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, voltarH: rect(vb).h, voltarColor: cs.color, voltarPad: cs.paddingLeft }; };
  const antes = await ev(page, f);
  await ev(page, () => { const v = document.querySelector('br-button[label="Voltar"]'); const b = document.createElement('button'); b.type = 'button'; b.className = 'br-button secondary'; b.id = 'voltar-core'; b.setAttribute('style', 'border-radius:var(--surface-rounder-sm)'); b.textContent = 'Voltar'; v.replaceWith(b); });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await page.evaluate(() => document.querySelector('#voltar-core').scrollIntoView());
  await shot(page, 'F-medio-2-depois', '#voltar-core');
  return { antes, depois };
};

C['F-medio-3'] = async (page) => {
  const f = () => [...document.querySelectorAll('span.br-tag')].slice(0, 3).map(t => ({ t: t.textContent.trim(), r: getComputedStyle(t).borderTopLeftRadius }));
  const antes = await ev(page, f);
  await ev(page, () => { document.querySelector('div.tab-panel span.br-tag.interaction').style.borderRadius = 'var(--surface-rounder-pill)'; });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-medio-3-depois', 'div.tab-panel');
  return { antes, depois };
};

C['F-medio-4'] = async (page) => {
  const f = () => [...document.querySelectorAll('div.br-table thead th')].map(th => th.textContent.trim() + ':' + getComputedStyle(th).backgroundColor);
  const antes = await ev(page, f);
  await ev(page, () => { const th = [...document.querySelectorAll('div.br-table thead th')].find(t => t.textContent.trim() === 'Téc. Adm.'); th.style.backgroundColor = 'var(--pure-0)'; });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-medio-4-depois', 'div.br-table thead');
  return { antes, depois };
};

C['F-medio-5'] = async (page) => {
  const f = () => [...document.querySelectorAll('govbr-custom-pagination br-select-pnip')].map(s => { const i = s.querySelector('input'); const cs = getComputedStyle(i); return { id: i.id, border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, h: rect(i).h }; });
  const antes = await ev(page, f);
  await ev(page, () => document.querySelector('govbr-custom-pagination div.pagination-per-page').classList.add('pp-exibir'));
  await css(page, '.pp-exibir input { border-color: var(--gray-40) !important; }');
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await page.evaluate(() => document.querySelector('govbr-custom-pagination').scrollIntoView());
  await shot(page, 'F-medio-5-depois', 'govbr-custom-pagination');
  return { antes, depois };
};

C['F-medio-6'] = async (page) => {
  const f = () => { const pg = document.querySelector('govbr-custom-pagination'); const info = pg.querySelector('div.pagination-information'); const labels = [...pg.querySelectorAll('br-select-pnip label')].map(l => l.textContent.trim() + ':' + getComputedStyle(l).color); return { info: info.textContent.trim().replace(/\s+/g, ' '), infoColor: getComputedStyle(info).color, labels, varSec08: getComputedStyle(document.documentElement).getPropertyValue('--color-secondary-08').trim() }; };
  const antes = await ev(page, f);
  await ev(page, () => { document.querySelector('govbr-custom-pagination div.pagination-information').style.color = 'var(--blue-warm-vivid-70)'; });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await page.evaluate(() => document.querySelector('govbr-custom-pagination').scrollIntoView());
  await shot(page, 'F-medio-6-depois', 'govbr-custom-pagination');
  return { antes, depois };
};

C['F-dificil-1'] = async (page) => {
  const f = () => [...document.querySelectorAll('govbr-custom-pagination nav.br-pagination.small button.br-button.circle[aria-label^="Página"] > i')].map(i => i.className);
  const antes = await ev(page, f);
  await ev(page, () => document.querySelectorAll('govbr-custom-pagination nav.br-pagination.small button.br-button.circle[aria-label^="Página"] > i').forEach(i => { i.className = i.className.replace('fa-angle-', 'fa-chevron-'); }));
  const depois = await ev(page, f);
  return { antes, depois };
};

C['F-dificil-2'] = async (page) => {
  const f = () => { const c = document.querySelector('#avatar-dropdown-trigger span.br-avatar > span.content'); const cs = getComputedStyle(c); return { ...rect(c), radius: cs.borderTopLeftRadius, letra: c.textContent.trim(), fs: cs.fontSize, fw: cs.fontWeight, avatarRadius: getComputedStyle(c.parentElement).borderTopLeftRadius, avatarOverflow: getComputedStyle(c.parentElement).overflow }; };
  const antes = await ev(page, f);
  await ev(page, () => { document.querySelector('#avatar-dropdown-trigger span.br-avatar > span.content').style.borderRadius = 'var(--surface-rounder-sm)'; });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-dificil-2-depois', '#avatar-dropdown-trigger');
  return { antes, depois };
};

C['F-dificil-3'] = async (page) => {
  const f = () => { const h = document.querySelector('br-button[label="Limpar filtros"]'); const b = h.shadowRoot.querySelector('button'); return { tt: getComputedStyle(b).textTransform, txt: b.innerText.trim(), disabled: b.disabled, opacity: getComputedStyle(b).opacity, visivel: rect(b) }; };
  const antes = await ev(page, f);
  await ev(page, () => document.querySelector('br-button[label="Limpar filtros"]').classList.add('text-uppercase'));
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-dificil-3-depois', 'pnip-multiple-search-table-utils');
  return { antes, depois };
};

C['F-dificil-4'] = async (page) => {
  const f = () => { const td = document.querySelector('div.br-table tbody td'); const th = document.querySelector('div.br-table thead th'); const a = getComputedStyle(td), b = getComputedStyle(th); return { td: [a.paddingTop, a.paddingRight, a.paddingBottom, a.paddingLeft].join(' '), th: [b.paddingTop, b.paddingRight, b.paddingBottom, b.paddingLeft].join(' '), table: document.querySelector('div.br-table').className }; };
  const antes = await ev(page, f);
  await css(page, '.br-table .table tbody td { padding-top: 12px !important; padding-bottom: 12px !important; }');
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-dificil-4-depois', 'div.br-table');
  return { antes, depois };
};

C['F-dificil-5'] = async (page) => {
  const f = () => { const as = [...document.querySelectorAll('div.br-table tbody td a[role="button"]')]; const outros = [...document.querySelectorAll('a')].filter(a => !as.includes(a)).slice(0, 6).map(a => a.textContent.trim().slice(0, 20) + ':' + getComputedStyle(a).color); return { n: as.length, color: getComputedStyle(as[0]).color, deco: getComputedStyle(as[0]).textDecorationLine, outros }; };
  const antes = await ev(page, f);
  await ev(page, () => document.querySelectorAll('div.br-table tbody td a[role="button"]').forEach(a => a.classList.add('text-blue-vivid-60')));
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-dificil-5-depois', 'div.br-table');
  return { antes, depois };
};

C['F-dificil-6'] = async (page) => {
  const f = () => { const b = document.querySelector('#avatar-dropdown-trigger'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, h: rect(b).h, radius: cs.borderTopLeftRadius }; };
  const antes = await ev(page, f);
  await css(page, '.br-sign-in { background-color: var(--blue-vivid-5) !important; }');
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-dificil-6-depois', '#avatar-dropdown-trigger');
  return { antes, depois };
};

C['F-muito-dificil-1'] = async (page) => {
  const f = () => { const l = document.querySelector('pnip-multiple-search-table-utils div.br-select > div.br-list'); if (!l) return null; const cs = getComputedStyle(l); return { shadow: cs.boxShadow, pos: cs.position, z: cs.zIndex, ...rect(l) }; };
  const inicial = await ev(page, f);
  await abrirFiltro(page);
  const antes = await ev(page, f);
  await ev(page, () => { document.querySelector('pnip-multiple-search-table-utils div.br-select > div.br-list').style.boxShadow = 'none'; });
  const depois = await ev(page, f);
  await shot(page, 'F-muito-dificil-1-depois');
  return { inicial, antes, depois };
};

C['F-muito-dificil-2'] = async (page) => {
  const f = () => { const t = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction'); if (!t) return null; return { tag: rect(t), icone: rect(t.querySelector('i')), rotulo: rect(t.querySelector('span')), fechar: rect(t.querySelector('button')) }; };
  const inicial = await ev(page, f);
  await abrirFiltro(page);
  await page.locator('pnip-multiple-search-table-utils div.br-list div.br-item').first().click();
  await page.waitForTimeout(500);
  const antes = await ev(page, f);
  await ev(page, () => { const t = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2 span.br-tag.interaction'); t.insertBefore(t.querySelector('button'), t.querySelector('i')); });
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-muito-dificil-2-depois', 'pnip-multiple-search-table-utils');
  return { inicial, antes, depois };
};

C['F-muito-dificil-3'] = async (page) => {
  const f = () => [...document.querySelectorAll('div.br-table tbody br-button[title="Assumir processo"]')].map(h => { const b = h.shadowRoot.querySelector('button'); const cs = getComputedStyle(b); return { dis: b.disabled, op: cs.opacity, cur: cs.cursor, hostPE: getComputedStyle(h).pointerEvents }; });
  const inicial = await ev(page, f);
  await abaAguardando(page);
  const antes = await ev(page, f);
  await ev(page, () => document.querySelectorAll('div.br-table tbody br-button[title="Assumir processo"]').forEach(h => { const d = h.hasAttribute('disabled'); h.removeAttribute('disabled'); if (d) h.style.pointerEvents = 'none'; }));
  await page.waitForTimeout(400);
  const depois = await ev(page, f);
  await shot(page, 'F-muito-dificil-3-depois', 'div.br-table');
  return { inicialN: inicial.length, antes: antes.slice(0, 3), nAntes: antes.length, depois: depois.slice(0, 3) };
};

C['F-muito-dificil-4'] = async (page) => {
  const f = () => { const it = document.querySelector('govbr-custom-pagination div.pagination-per-page br-select-pnip div.br-list div.br-item.selected'); if (!it) return null; const l = it.closest('.br-list'); const cs = getComputedStyle(it); return { listaVisivel: getComputedStyle(l).display + '/' + rect(l).h, txt: it.textContent.trim(), bg: cs.backgroundColor, color: cs.color }; };
  const inicial = await ev(page, f);
  await page.evaluate(() => document.querySelector('govbr-custom-pagination').scrollIntoView());
  await page.locator('govbr-custom-pagination input#total').click();
  await page.waitForTimeout(500);
  const antes = await ev(page, f);
  await css(page, '.br-select .br-item.selected { background-color: var(--blue-warm-vivid-70) !important; }');
  await page.waitForTimeout(200);
  const depois = await ev(page, f);
  await shot(page, 'F-muito-dificil-4-depois');
  return { inicial, antes, depois };
};

C['F-muito-dificil-5'] = async (page) => {
  const focoInfo = () => { const t = document.querySelector('br-tab'); const a = t.shadowRoot.activeElement; if (!a) return { ativo: document.activeElement?.tagName }; const cs = getComputedStyle(a); return { el: a.tagName + '.' + a.className + ' ' + a.textContent.trim(), outline: cs.outlineColor + ' ' + cs.outlineStyle + ' ' + cs.outlineWidth, offset: cs.outlineOffset }; };
  async function focar() {
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.locator('h2', { hasText: 'Processos' }).click();
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); const ok = await ev(page, () => !!document.querySelector('br-tab').shadowRoot.activeElement); if (ok) break; }
    await page.waitForTimeout(200);
  }
  await focar();
  const antes = await ev(page, focoInfo);
  await ev(page, () => document.querySelector('br-tab').setAttribute('style', '--focus-style: solid; --focus: var(--blue-warm-vivid-70); --focus-color: var(--blue-warm-vivid-70)'));
  await focar();
  const depois = await ev(page, focoInfo);
  await shot(page, 'F-muito-dificil-5-depois', 'br-tab');
  return { antes, depois };
};

C['F-muito-dificil-6'] = async (page) => {
  const f = () => { const it = document.querySelector('pnip-multiple-search-table-utils div.br-select div.br-list > div.br-item:nth-child(2)'); const cs = getComputedStyle(it); return { bgImg: cs.backgroundImage, bg: cs.backgroundColor, color: getComputedStyle(it.querySelector('label')).color }; };
  await abrirFiltro(page);
  const semHover = await ev(page, f);
  await page.locator('pnip-multiple-search-table-utils div.br-select div.br-list > div.br-item').nth(1).hover();
  await page.waitForTimeout(300);
  const antes = await ev(page, f);
  await css(page, 'pnip-multiple-search-table-utils .br-list .br-item:hover { background-image: none; background-color: var(--blue-warm-vivid-70); color: var(--pure-0); }');
  await page.mouse.move(0, 0); await page.locator('pnip-multiple-search-table-utils div.br-select div.br-list > div.br-item').nth(1).hover();
  await page.waitForTimeout(300);
  const depois = await ev(page, f);
  await shot(page, 'F-muito-dificil-6-depois');
  return { semHover, antes, depois };
};

const so = process.argv[2];
const browser = await chromium.launch({ headless: true });
const res = {};
for (const [id, fn] of Object.entries(C)) {
  if (so && !id.includes(so)) continue;
  const { ctx, page } = await abrir(browser);
  try { res[id] = await fn(page); } catch (e) { res[id] = { erro: String(e).slice(0, 400) }; }
  await ctx.close();
  console.log(id, JSON.stringify(res[id]).slice(0, 900));
}
await browser.close();
const arq = `${OUT}/medidas.json`;
const prev = so && fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : {};
fs.writeFileSync(arq, JSON.stringify({ ...prev, ...res }, null, 2));
