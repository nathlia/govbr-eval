// Re-medida independente (segundo agente) da referência ground-truth-vistorias.json.
// Código próprio; não usa nada de tela-b/vistorias/*.mjs, validator, axe ou ESLint.
// Uso: node tela-b/vistorias/remedida/remedir.mjs [--headed]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const EVAL = path.resolve(__dir, '../../..');
const require = createRequire(path.join(EVAL, 'package.json'));
const { chromium } = require('playwright');
const GT = JSON.parse(fs.readFileSync(path.join(EVAL, 'ground-truth-vistorias.json'), 'utf8'));
const META = GT._meta;
const PUBLIC = path.resolve(EVAL, '../govbr-corpus/public');
const headed = process.argv.includes('--headed');

// ---------- servidor estático com fallback SPA ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json', '.webp': 'image/webp', '.gif': 'image/gif' };
const writes = [];
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') writes.push(req.method + ' ' + req.url);
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(PUBLIC, p);
  if (!f.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  const ext = path.extname(p);
  if (!ext && p.startsWith('/pnip/')) f = path.join(PUBLIC, 'pnip', 'index.html');
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    return fs.createReadStream(f).pipe(res);
  }
  res.writeHead(404); res.end('nf');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;

// ---------- biblioteca injetada na página ----------
const LIB = `(() => {
  const roots = () => { const out = [document]; const walk = r => { for (const el of r.querySelectorAll('*')) if (el.shadowRoot) { out.push(el.shadowRoot); walk(el.shadowRoot); } }; walk(document); return out; };
  const allEls = () => { const res = []; for (const r of roots()) for (const e of r.querySelectorAll('*')) res.push(e); return res; };
  const pf = e => { if (e.parentElement) return e.parentElement; const rn = e.getRootNode(); return rn instanceof ShadowRoot ? rn.host : null; };
  const splitTop = (s, sep) => { const out = []; let d = 0, q = null, cur = ''; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (q) { cur += ch; if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; } if (ch === '[' || ch === '(') d++; if (ch === ']' || ch === ')') d--; if (d === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; } cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
  const toks = seg => { const out = []; let d = 0, q = null, cur = '', comb = ' '; const push = () => { if (cur) { out.push({ comb, c: cur }); cur = ''; comb = ' '; } }; for (let i = 0; i < seg.length; i++) { const ch = seg[i]; if (q) { cur += ch; if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; } if (ch === '[' || ch === '(') d++; if (ch === ']' || ch === ')') d--; if (d === 0 && /\\s/.test(ch)) { push(); continue; } if (d === 0 && ch === '>') { push(); comb = '>'; continue; } cur += ch; } push(); return out; };
  const matchAt = (e, t, i) => { if (!e.matches(t[i].c)) return false; if (i === 0) return true; if (t[i].comb === '>') { const p = pf(e); return !!p && matchAt(p, t, i - 1); } let a = pf(e); while (a) { if (matchAt(a, t, i - 1)) return true; a = pf(a); } return false; };
  const flatAnc = (e, h) => { let a = pf(e); while (a) { if (a === h) return true; a = pf(a); } return false; };
  const findOne = sel => { const segs = splitTop(sel, '>>>'); let cur = null; for (const s of segs) { const t = toks(s); const c = allEls().filter(e => matchAt(e, t, t.length - 1)); cur = cur === null ? c : c.filter(e => cur.some(h => flatAnc(e, h))); } return cur || []; };
  const find = sel => { const set = new Set(); for (const p of splitTop(sel, ',')) for (const e of findOne(p)) set.add(e); return [...set]; };
  const parse = c => { const m = /rgba?\\(([^)]+)\\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const blend = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgOf = e => { const layers = []; let n = e, img = false; while (n) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none') img = true; const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } n = pf(n); } let base = { r: 255, g: 255, b: 255, a: 1 }; let i = layers.length - 1; if (i >= 0 && layers[i].a >= 1) { base = layers[i]; i--; } for (; i >= 0; i--) base = blend(layers[i], base); return { bg: base, img }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const contrast = e => { const cs = getComputedStyle(e); let fg = parse(cs.color); const { bg, img } = bgOf(e); if (fg.a < 1) fg = blend(fg, bg); const L1 = lum(fg), L2 = lum(bg); const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); return { ratio: Math.round(r * 100) / 100, fg: hex(fg), bg: hex(bg), img, size: cs.fontSize, weight: cs.fontWeight, text: (e.textContent || '').trim().slice(0, 40) }; };
  const desc = e => e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : '') + ' "' + (e.textContent || '').trim().slice(0, 25) + '"') : null;
  const ids = new WeakMap(); let nid = 0; const idOf = e => { if (!ids.has(e)) ids.set(e, ++nid); return ids.get(e); };
  const visible = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  window.__d = { find, parse, contrast, desc, idOf, pf, flatAnc, visible, allEls };
})()`;

// ---------- utilidades ----------
const browser = await chromium.launch({ headless: !headed });
const ctx = await browser.newContext({ viewport: META.viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
const blocked = [];
await ctx.route('**/*', route => {
  const u = route.request().url();
  if (!u.startsWith(BASE + '/')) { blocked.push(u); return route.abort(); }
  return route.continue();
});
await ctx.addInitScript(LIB);

async function loadFresh(upTo) {
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-03-16T09:30:00-03:00'));
  await page.goto(BASE + META.url);
  await page.locator(META.waitFor).first().waitFor({ state: 'attached', timeout: 20000 });
  for (let i = 0; i < upTo; i++) {
    const s = META.setup[i];
    if (s.action === 'navigate') {
      if (s.selector) await page.locator(s.selector).first().click();
      else await page.evaluate(p => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, s.path);
      await page.locator(s.waitFor).first().waitFor({ state: 'attached', timeout: 20000 });
    } else if (s.action === 'click') await page.locator(s.selector).first().click();
    else if (s.action === 'wait') await page.locator(s.selector).first().waitFor({ state: 'attached', timeout: 20000 });
    else if (s.action === 'fill') await page.locator(s.selector).first().fill(s.value ?? '');
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(600);
  return page;
}
const cdpOf = async page => { const c = await ctx.newCDPSession(page); await c.send('DOM.enable'); await c.send('Accessibility.enable'); return c; };
const find = (page, sel) => page.evaluate(s => __d.find(s).length, sel);
const each = (page, sel, fn) => page.evaluate(({ sel, fn }) => __d.find(sel).map(eval(fn)), { sel, fn });

async function axOf(cdp, sel) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: `__d.find(${JSON.stringify(sel)})` });
  const props = await cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
  const out = [];
  for (const p of props.result) {
    if (!/^\d+$/.test(p.name)) continue;
    const d = await cdp.send('DOM.describeNode', { objectId: p.value.objectId });
    const ax = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: d.node.backendNodeId, fetchRelatives: false });
    const n = ax.nodes[0];
    out.push({ role: n?.role?.value, name: n?.name?.value ?? '', ignored: !!n?.ignored });
  }
  return out;
}
async function fullAx(cdp) { return (await cdp.send('Accessibility.getFullAXTree')).nodes; }
async function backendIds(cdp, sel) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: `__d.find(${JSON.stringify(sel)})` });
  const props = await cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
  const out = [];
  for (const p of props.result) { if (!/^\d+$/.test(p.name)) continue; out.push((await cdp.send('DOM.describeNode', { objectId: p.value.objectId })).node.backendNodeId); }
  return out;
}
function axSubtree(nodes, backendId) {
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  const root = nodes.find(n => n.backendDOMNodeId === backendId);
  const out = [];
  const walk = n => { for (const c of n.childIds || []) { const k = byId.get(c); if (k) { out.push({ role: k.role?.value, name: k.name?.value ?? '', ignored: !!k.ignored }); walk(k); } } };
  if (root) walk(root);
  return { self: root ? { role: root.role?.value, name: root.name?.value ?? '', ignored: !!root.ignored } : null, desc: out };
}

async function tabWalk(page, sels, max = 220, key = 'Tab') {
  await page.evaluate(({ sels }) => { window.__T = new Map(); sels.forEach(s => __d.find(s).forEach(e => window.__T.set(e, s))); document.activeElement?.blur?.(); }, { sels });
  const hits = {}; const seq = []; const seen = new Set();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const r = await page.evaluate(() => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; if (!a) return null; let hit = null, n = a; while (n) { if (window.__T.has(n)) { hit = window.__T.get(n); break; } n = __d.pf(n); } return { id: __d.idOf(a), d: __d.desc(a), hit, body: a === document.body }; });
    if (!r || r.body) { if (seq.length) break; else continue; }
    if (seen.has(r.id)) break;
    seen.add(r.id); if (seq.length < 6) seq.push(r.d);
    if (r.hit) hits[r.hit] = (hits[r.hit] || 0) + 1;
  }
  return { total: seen.size, first: seq, hits };
}

const sigFn = `(() => { const v = e => e.getBoundingClientRect().width > 0; const rows = [...document.querySelectorAll('tbody tr')].slice(0, 3).map(r => r.textContent.replace(/\\s+/g, ' ').trim().slice(0, 60)); const act = __d.allEls().filter(e => /(^|\\s)(active|is-active|current|selected)(\\s|$)/.test(typeof e.className === 'string' ? e.className : '') || e.getAttribute('aria-selected') === 'true' || e.getAttribute('aria-current')).map(e => __d.desc(e)).join('|'); const vis = __d.allEls().filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).length; return JSON.stringify({ href: location.href, rows, act, vis }); })()`;
const sig = page => page.evaluate(sigFn);

const R = []; // resultados
const add = (id, kind, state, veredito, medido, nota) => R.push({ id, tipo: kind, estado: state, veredito, medido, nota });
const near = (a, b, tol = 0.06) => Math.abs(a - b) <= tol;

// ---------- estados ----------
const stateById = Object.fromEntries(META.states.map(s => [s.id, s]));
const stateCheck = [];
const pages = {};
for (const s of META.states) {
  const pg = await loadFresh(s.afterStep);
  const pathname = await pg.evaluate(() => location.pathname);
  stateCheck.push({ id: s.id, path: s.path, medido: pathname, ok: pathname === s.path });
  pages[s.id] = pg;
}
// "sempre": aplica-se a todos
const statesFor = st => (st === 'sempre' ? META.states.map(s => s.id) : [st]);

for (const id of Object.keys(pages)) { pages[id].cdp = await cdpOf(pages[id]); }

// tab walks por estado (uma vez, com todos os alvos de interesse)
const tabTargets = {
  inicial: { tag: 'pnip-filter-panel span.br-tag.interaction', tabs: '.br-tab .tab-item button', pag: 'govbr-custom-pagination a.page', bc: 'pnip-propesc-vistorias br-breadcrumb >>> a', div: 'pnip-propesc-vistorias br-divider', skipA: 'a[href^="#"]' },
  'detalhe-menu': { unid: 'pnip-header #avatar-menu span.text-blue-vivid-60', sair: 'pnip-header button.br-item' },
};
const tw = {};
const stepsOf = id => stateById[id].afterStep;
for (const [st, t] of Object.entries(tabTargets)) {
  const fwd = await tabWalk(pages[st], Object.values(t));
  const pb = await loadFresh(stepsOf(st)); const bwd = await tabWalk(pb, Object.values(t), 220, 'Shift+Tab'); await pb.close();
  const hits = {}; for (const k of Object.values(t)) hits[k] = Math.max(fwd.hits[k] || 0, bwd.hits[k] || 0);
  tw[st] = { fwd, bwd, hits, total: { fwd: fwd.total, bwd: bwd.total } };
}

// ---------- specs ----------
const S = Object.fromEntries(GT.violations.map(v => [v.id, v]));
async function specCount(pg, v) { return find(pg, v.anchor); }

async function doSpec(id, st, fn) {
  const v = S[id]; const pg = pages[st];
  const n = await specCount(pg, v);
  let out;
  try { out = await fn(pg, n, pages[st].cdp, v); } catch (e) { out = { v: 'inconclusivo', m: { erro: String(e).slice(0, 300) } }; }
  const cnt = n === v.expectedCount;
  const verd = out.v === 'confirma' && !cnt ? 'diverge' : out.v;
  add(id, 'spec', st, verd, { count: n, expectedCount: v.expectedCount, ...out.m }, out.n || (cnt ? '' : 'contagem difere'));
}

// B-01 salto
for (const st of Object.keys(pages)) {
  await doSpec('B-01', st, async (pg) => {
    const m = await pg.evaluate(() => { const a = __d.find('a[href^="#"]').filter(x => x.getAttribute('href').length > 1).map(x => x.getAttribute('href')); const sk = __d.find('.br-skiplink, [class*=skip], a[href*="skip"], a[href*="conteudo"]').length; const hashTargets = a.filter(h => document.querySelector(h.replace(/[^#\w-]/g, ''))); return { anchorsHash: a, skiplinkEls: sk, hashTargets, hasMain: __d.find('main, [role=main]').length }; });
    const fp = await loadFresh(stateById[st].afterStep); const walk = await tabWalk(fp, ['main, [role=main]'], 3); await fp.close();
    const ok = m.anchorsHash.length === 0 && m.skiplinkEls === 0 && !(walk.first[0] || '').match(/skip|conte/i);
    return { v: ok ? 'confirma' : 'diverge', m: { ...m, primeiroTab: walk.first[0], tabParadas: walk.total } };
  });
}
// B-02
await doSpec('B-02', 'inicial', async (pg) => {
  const m = await pg.evaluate(() => ({ h1: __d.find('h1, [role=heading][aria-level="1"]').length, headings: __d.find('h1,h2,h3,h4,h5,h6,[role=heading]').map(e => e.tagName.toLowerCase() + ':' + (e.textContent || '').trim().slice(0, 30)) }));
  return { v: m.h1 === 0 && m.headings.some(h => h.startsWith('h2:Vistorias')) ? 'confirma' : 'diverge', m };
});
// B-03 / B-22 tabela sem nome
for (const [id, st] of [['B-03', 'inicial'], ['B-22', 'detalhe']]) {
  await doSpec(id, st, async (pg, n, cdp, v) => {
    const m = (await each(pg, v.anchor, `(t) => ({ caption: !!t.querySelector('caption'), ariaLabel: t.getAttribute('aria-label'), labelledby: t.getAttribute('aria-labelledby'), title: t.getAttribute('title'), cols: t.querySelectorAll('thead th, tr:first-child th').length, rows: t.querySelectorAll('tbody tr').length })`))[0];
    const ax = (await axOf(cdp, v.anchor))[0];
    const ok = !m.caption && !m.ariaLabel && !m.labelledby && !ax.name;
    return { v: ok ? 'confirma' : 'diverge', m: { ...m, ax } };
  });
}
// B-04 / B-05 / B-06 / B-20 campos sem rótulo
const nolabel = `(i) => ({ type: i.type, labels: i.labels ? i.labels.length : -1, ariaLabel: i.getAttribute('aria-label'), labelledby: i.getAttribute('aria-labelledby'), id: i.id, placeholder: i.getAttribute('placeholder'), title: i.getAttribute('title') })`;
for (const id of ['B-04', 'B-05', 'B-06', 'B-20']) {
  const st = S[id].state;
  await doSpec(id, st, async (pg, n, cdp, v) => {
    const m = await each(pg, v.anchor, nolabel);
    const ax = await axOf(cdp, v.anchor);
    let ok = m.every(x => x.labels === 0 && !x.ariaLabel && !x.labelledby);
    const nameEmpty = ax.every(a => !a.name);
    let extra = {};
    if (id === 'B-20') extra = await pg.evaluate(() => { const t = __d.find('pnip-propesc-agendar-vistoria .br-textarea textarea')[0]; const lab = t && [...t.parentElement.querySelectorAll('label')].map(l => ({ text: l.textContent.trim().slice(0, 50), for: l.getAttribute('for') })); return { textareaId: t?.id, siblingLabels: lab }; });
    if (id === 'B-20') ok = ok && !extra.textareaId && extra.siblingLabels?.length > 0 && extra.siblingLabels.every(l => !l.for);
    return { v: ok && nameEmpty ? 'confirma' : (ok ? 'confirma' : 'diverge'), m: { amostra: m.slice(0, 3), axNomes: ax.map(a => a.name), nomeVazioAX: nameEmpty, ...extra }, n: ok && !nameEmpty ? 'DOM confirma (sem label/aria), mas a árvore de acessibilidade dá nome não vazio (ver axNomes)' : '' };
  });
}
// B-07
await doSpec('B-07', 'inicial', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(b) => { const h = b.getRootNode().host; return { text: (b.textContent||'').trim(), aria: b.getAttribute('aria-label'), title: b.getAttribute('title'), hostTitle: h ? h.getAttribute('title') : null, hostAria: h ? h.getAttribute('aria-label') : null }; }`);
  const ax = await axOf(cdp, v.anchor);
  const ok = m.every(x => !x.text && !x.aria && !x.title && !x.hostTitle) && ax.every(a => a.role === 'button' && !a.name);
  return { v: ok ? 'confirma' : 'diverge', m: { amostra: m[0], axRoles: [...new Set(ax.map(a => a.role))], axNomes: [...new Set(ax.map(a => a.name))] } };
});
// B-08/09/10 botões só-ícone sem circle
for (const id of ['B-08', 'B-09', 'B-10']) {
  await doSpec(id, 'inicial', async (pg, n, cdp, v) => {
    const m = await each(pg, v.anchor, `(b) => ({ cls: b.className, text: (b.textContent||'').trim(), hasIcon: !!b.querySelector('i, svg, img, .fa, [class*=fa-]') , w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) })`);
    const ok = m.every(x => !/\bcircle\b/.test(x.cls) && !x.text);
    const classes = [...new Set(m.map(x => x.cls))]; const sizes = [...new Set(m.map(x => x.w + 'x' + x.h))];
    const extra = id === 'B-08' ? { secondary: m.every(x => /secondary/.test(x.cls)), iconCount: m.filter(x => x.hasIcon).length } : {};
    return { v: ok ? 'confirma' : 'diverge', m: { classes, sizes, ...extra } };
  });
}
// B-11 etiquetas de filtro
await doSpec('B-11', 'inicial', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(s) => ({ tag: s.tagName.toLowerCase(), text: s.textContent.trim().slice(0,20), tabindex: s.getAttribute('tabindex'), role: s.getAttribute('role'), tabIndexProp: s.tabIndex })`);
  const reach = tw.inicial.hits['pnip-filter-panel span.br-tag.interaction'] || 0;
  const reachDir = { fwd: tw.inicial.fwd.hits, bwd: tw.inicial.bwd.hits };
  // efeito: clique vs Enter, 3 cargas frescas, por etiqueta
  const click = [], enter = [];
  for (let i = 0; i < n; i++) {
    let c = 0, e = 0;
    for (let r = 0; r < 3; r++) {
      let p = await loadFresh(0); const b = await sig(p);
      await p.evaluate(i => __d.find('pnip-filter-panel span.br-tag.interaction')[i].scrollIntoView(), i);
      const h = await p.evaluateHandle(i => __d.find('pnip-filter-panel span.br-tag.interaction')[i], i);
      await h.asElement().click(); await p.waitForTimeout(500);
      if ((await sig(p)) !== b) c++;
      await p.close();
      p = await loadFresh(0); const b2 = await sig(p);
      await p.evaluate(i => { __d.find('pnip-filter-panel span.br-tag.interaction')[i].focus(); }, i);
      await p.keyboard.press('Enter'); await p.waitForTimeout(500);
      if ((await sig(p)) !== b2) e++;
      await p.close();
    }
    click.push(c); enter.push(e);
  }
  const ok = m.every(x => x.tag === 'span' && x.tabindex === null && x.role === null) && reach === 0 && click.every(x => x === 3) && enter.every(x => x === 0);
  return { v: ok ? 'confirma' : 'diverge', m: { textos: m.map(x => x.text), tabindexAttr: [...new Set(m.map(x => x.tabindex))], roleAttr: [...new Set(m.map(x => x.role))], alcancadosPorTab: reach, tabAvancoRetrocesso: { fwd: tw.inicial.fwd.hits['pnip-filter-panel span.br-tag.interaction'] || 0, bwd: tw.inicial.bwd.hits['pnip-filter-panel span.br-tag.interaction'] || 0 }, cliqueMudaDe3PorEtiqueta: click, enterMudaDe3PorEtiqueta: enter } };
});
// B-12..B-14, B-23 contraste
const contrastSpec = async (id, st, claim, limit) => doSpec(id, st, async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(e) => __d.contrast(e)`);
  const ratios = m.map(x => x.ratio);
  const ok = m.every(x => near(x.ratio, claim, 0.06) && x.ratio < limit && !x.img);
  return { v: ok ? 'confirma' : 'diverge', m: { razoes: [...new Set(ratios)], fg: [...new Set(m.map(x => x.fg))], bg: [...new Set(m.map(x => x.bg))], tamanho: [...new Set(m.map(x => x.size + '/' + x.weight))], textos: [...new Set(m.map(x => x.text))], fundoComImagem: m.some(x => x.img) } };
});
await contrastSpec('B-12', 'inicial', 3.14, 4.5);
await contrastSpec('B-13', 'inicial', 1.5, 4.5);
for (const st of Object.keys(pages)) await contrastSpec('B-14', st, 2.33, 3);
await contrastSpec('B-23', 'detalhe', 3.54, 4.5);

// B-15
await doSpec('B-15', 'detalhe-menu', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(h) => { const c = getComputedStyle(h); return { top: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor, cls: h.className }; }`);
  const tokens = fs.readFileSync(path.resolve(EVAL, '../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/tokens/colors.json'), 'utf8').toLowerCase();
  const inTokens = /#bbb\b|#bbbbbb|187,\s*187,\s*187/.test(tokens);
  const ok = m[0].top === '2px solid rgb(187, 187, 187)' && !inTokens;
  return { v: ok ? 'confirma' : 'diverge', m: { borda: m[0].top, bbbEmTokens3_7_0: inTokens } };
});
// B-16
await doSpec('B-16', 'detalhe-menu', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(i) => ({ hasAlt: i.hasAttribute('alt'), src: i.getAttribute('src'), inBtn: i.closest('button') ? i.closest('button').textContent.trim() : null })`);
  return { v: m[0].hasAlt === false ? 'confirma' : 'diverge', m: m[0] };
});
// B-17
await doSpec('B-17', 'detalhe-menu', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(d) => ({ role: d.getAttribute('role'), explicitItems: d.querySelectorAll('[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio]').length, kids: [...d.querySelectorAll('*')].filter(e => e.children.length === 0 || e.tagName === 'BUTTON').map(e => e.tagName.toLowerCase() + ':' + (e.getAttribute('role')||'')).slice(0,8) })`);
  const ids = await backendIds(cdp, v.anchor);
  const sub = axSubtree(await fullAx(cdp), ids[0]);
  const roles = [...new Set(sub.desc.map(x => x.role))];
  const items = sub.desc.filter(x => /^menuitem/.test(x.role)).length;
  const ok = m[0].role === 'menu' && m[0].explicitItems === 0 && items === 0;
  return { v: ok ? 'confirma' : 'diverge', m: { ...m[0], axSelf: sub.self, axRolesDescendentes: roles, axMenuitems: items } };
});
// B-18
await doSpec('B-18', 'detalhe-menu', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(b) => ({ tag: b.tagName.toLowerCase(), href: b.getAttribute('href'), hasHref: b.hasAttribute('href'), p: b.querySelectorAll('p').length, text: b.textContent.trim().slice(0,20), htmlSnippet: b.outerHTML.slice(0,160) })`);
  return { v: m[0].tag === 'button' && m[0].hasHref && m[0].p > 0 ? 'confirma' : 'diverge', m: m[0] };
});
// B-19
await doSpec('B-19', 'detalhe-menu', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(s) => ({ tag: s.tagName.toLowerCase(), text: s.textContent.trim(), cursor: getComputedStyle(s).cursor, tabindex: s.getAttribute('tabindex'), role: s.getAttribute('role'), inMenuLi: s.closest('[role=menu]') ? true : false })`);
  const reach = tw['detalhe-menu'].hits[tabTargets['detalhe-menu'].unid] || 0;
  // Shift+Tab e Enter
  const p1 = await loadFresh(3);
  const beforeEnter = await p1.evaluate(() => location.href);
  await p1.evaluate(() => { __d.find('pnip-header #avatar-menu span.text-blue-vivid-60')[0].focus(); });
  const act = await p1.evaluate(() => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return __d.desc(a); });
  await p1.keyboard.press('Enter'); await p1.waitForTimeout(800);
  const afterEnter = await p1.evaluate(() => location.href);
  await p1.close();
  const p2 = await loadFresh(3);
  const h = await p2.evaluateHandle(() => __d.find('pnip-header #avatar-menu span.text-blue-vivid-60')[0]);
  const b0 = await p2.evaluate(() => location.pathname);
  await h.asElement().click(); await p2.waitForTimeout(1500);
  const a0 = await p2.evaluate(() => location.pathname);
  await p2.close();
  const ok = m[0].tag === 'span' && m[0].tabindex === null && m[0].role === null && reach === 0 && beforeEnter === afterEnter && a0 !== b0 && m[0].cursor === 'pointer';
  return { v: ok ? 'confirma' : 'diverge', m: { ...m[0], alcancadoPorTab: reach, focoAposFocus: act, enterMudouUrl: beforeEnter !== afterEnter, cliqueNavega: { antes: b0, depois: a0 } } };
});
// B-21
await doSpec('B-21', 'detalhe', async (pg, n, cdp, v) => {
  const m = await pg.evaluate(() => ({ h1: __d.find('h1,[role=heading][aria-level="1"]').length, h2: __d.find('h2,[role=heading][aria-level="2"]').length, seq: __d.find('h1,h2,h3,h4,h5,h6').map(e => e.tagName.toLowerCase() + ':' + (e.textContent || '').trim().slice(0, 35)) }));
  return { v: m.h1 === 0 && m.h2 === 0 && m.seq[0]?.startsWith('h3') ? 'confirma' : 'diverge', m };
});
// B-24
await doSpec('B-24', 'modal', async (pg, n, cdp, v) => {
  const m = await each(pg, v.anchor, `(d) => ({ cls: d.className, role: d.getAttribute('role'), ariaModal: d.getAttribute('aria-modal'), ariaLabel: d.getAttribute('aria-label'), labelledby: d.getAttribute('aria-labelledby'), visible: __d.visible(d), ancestorRole: (() => { let a = __d.pf(d), r = []; while (a) { if (a.getAttribute && a.getAttribute('role')) r.push(a.getAttribute('role')); a = __d.pf(a); } return r; })() , descDialog: d.querySelectorAll('[role=dialog],[role=alertdialog],dialog').length })`);
  const nodes = await fullAx(cdp);
  const dialogs = nodes.filter(x => /^(dialog|alertdialog)$/.test(x.role?.value) && !x.ignored).length;
  const ok = !m[0].role && !m[0].ariaModal && !m[0].ariaLabel && !m[0].labelledby && dialogs === 0 && m[0].visible;
  return { v: ok ? 'confirma' : 'diverge', m: { ...m[0], axDialogosNaArvore: dialogs } };
});

// ---------- conformes ----------
const C = Object.fromEntries(META.conformes.itens.map(c => [c.id, c]));
async function doC(id, fn) {
  const c = C[id]; const sts = c.state === 'sempre' ? Object.keys(pages) : [c.state];
  for (const st of sts) {
    const pg = pages[st]; const n = await find(pg, c.selector);
    let out; try { out = await fn(pg, n, pg.cdp, c, st); } catch (e) { out = { v: 'inconclusivo', m: { erro: String(e).slice(0, 300) } }; }
    const verd = out.v === 'confirma' && n !== c.count ? 'diverge' : out.v;
    add(id, 'conforme', st, verd, { count: n, expectedCount: c.count, ...out.m }, out.n || (n === c.count ? '' : 'contagem difere'));
  }
}
await doC('C-01', async (pg, n, cdp, c) => { const m = await each(pg, c.selector, `(b) => ({ cls: b.className, aria: b.getAttribute('aria-label') })`); const ax = await axOf(cdp, c.selector); return { v: m.every(x => /circle/.test(x.cls)) && ax.every(a => a.name) ? 'confirma' : 'diverge', m: { axNomes: ax.map(a => a.name), circle: m.every(x => /circle/.test(x.cls)) } }; });
await doC('C-02', async (pg, n, cdp, c) => { const m = await each(pg, c.selector, `(b) => ({ text: b.textContent.trim(), w: Math.round(b.getBoundingClientRect().width), disabled: b.disabled, vis: getComputedStyle(b).visibility, disp: getComputedStyle(b).display })`); const ax = await axOf(cdp, c.selector); return { v: m[0].text.length > 0 && ax[0].name && m[0].w > 0 && m[0].vis === 'visible' ? 'confirma' : 'diverge', m: { text: m[0].text, visivel: m[0].w > 0, disabled: m[0].disabled, ax: ax[0] }, n: m[0].disabled ? 'botao disabled (sem filtro aplicado), fora da ordem de Tab; o texto visivel e o nome acessivel conferem' : '' }; });
await doC('C-03', async (pg, n, cdp, c) => { const m = await each(pg, c.selector, `(i) => ({ id: i.id, labels: i.labels.length, labelText: i.labels[0] ? i.labels[0].textContent.trim() : null })`); const ax = await axOf(cdp, c.selector); return { v: m.every(x => x.labels === 1) && ax.every(a => a.name) ? 'confirma' : 'diverge', m: { campos: m, axNomes: ax.map(a => a.name) } }; });
await doC('C-04', async (pg, n, cdp, c) => { const m = await each(pg, c.selector, `(i) => ({ labels: i.labels.length })`); const ax = await axOf(cdp, c.selector); const comLabel = m.filter(x => x.labels >= 1).length; return { v: comLabel === m.length && ax.every(a => a.name) ? 'confirma' : 'diverge', m: { comLabel, total: m.length, axSemNome: ax.filter(a => !a.name).length } }; });
await doC('C-05', async (pg, n, cdp, c) => { const m = await each(pg, c.selector, `(e) => __d.contrast(e)`); return { v: m.every(x => x.ratio >= 4.5 && !x.img) ? 'confirma' : 'diverge', m: { razoes: [...new Set(m.map(x => x.ratio))], fg: [...new Set(m.map(x => x.fg))], bg: [...new Set(m.map(x => x.bg))] } }; });
await doC('C-06', async (pg, n, cdp, c) => { const ax = await axOf(cdp, c.selector); return { v: ax.every(a => a.role === 'button' && a.name === 'Excluir vistoria') ? 'confirma' : 'diverge', m: { nomes: [...new Set(ax.map(a => a.name))] } }; });
await doC('C-08', async (pg, n, cdp, c) => { const m = await each(pg, c.selector, `(i) => ({ labels: i.labels.length, lab: i.labels[0] ? i.labels[0].textContent.trim() : null })`); const ax = await axOf(cdp, c.selector); return { v: m.every(x => x.labels >= 1) && ax.every(a => a.name) ? 'confirma' : 'diverge', m: { ...m[0], ax: ax[0] } }; });
await doC('C-10', async (pg, n, cdp, c) => { const reach = tw.inicial.hits[tabTargets.inicial.bc] || 0; const ax = await axOf(cdp, c.selector); const t = await each(pg, c.selector, `(a) => a.textContent.trim()`); return { v: reach >= 1 ? 'confirma' : 'diverge', m: { alcancadoPorTab: reach, avancoRetrocesso: { fwd: tw.inicial.fwd.hits[tabTargets.inicial.bc] || 0, bwd: tw.inicial.bwd.hits[tabTargets.inicial.bc] || 0 }, ax, textoVisivel: t } }; });
await doC('C-11', async (pg, n, cdp, c) => {
  const foc = await pg.evaluate(() => { const h = __d.find('pnip-propesc-vistorias br-divider')[0]; const all = [h, ...(h.shadowRoot ? h.shadowRoot.querySelectorAll('*') : []), ...h.querySelectorAll('*')]; return { hasShadow: !!h.shadowRoot, focusables: all.filter(e => e.matches('a[href],button,input,select,textarea,[tabindex]')).length, inner: all.slice(1).map(e => e.tagName.toLowerCase()) }; });
  const reach = tw.inicial.hits[tabTargets.inicial.div] || 0;
  const ids = await backendIds(cdp, c.selector); const sub = axSubtree(await fullAx(cdp), ids[0]);
  const named = sub.desc.filter(x => !x.ignored && x.name).length;
  return { v: foc.focusables === 0 && reach === 0 && named === 0 ? 'confirma' : 'diverge', m: { ...foc, alcancadoPorTab: reach, axSelf: sub.self, axDescendentes: sub.desc } };
});
await doC('C-12', async (pg, n, cdp, c, st) => { const m = await each(pg, c.selector, `(e) => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return { radius: cs.borderRadius, w: Math.round(r.width*10)/10, h: Math.round(r.height*10)/10 }; }`); return { v: /^50%$/.test(m[0].radius) && m[0].w === 40 && m[0].h === 40 ? 'confirma' : 'diverge', m: m[0] }; });
// C-07 abas, C-09 links de página: Tab + Enter ≡ clique
async function enterEqClick(c, tabKey) {
  const sel = c.selector; const n = await find(pages.inicial, sel);
  const tk = tabTargets.inicial[tabKey]; const reach = tw.inicial.hits[tk] || 0; const reachDir = { fwd: tw.inicial.fwd.hits[tk] || 0, bwd: tw.inicial.bwd.hits[tk] || 0 };
  const per = [];
  for (let i = 0; i < n; i++) {
    const a = await loadFresh(0); const b = await sig(a);
    const h = await a.evaluateHandle(({ sel, i }) => __d.find(sel)[i], { sel, i });
    const meta = await a.evaluate(({ sel, i }) => { const e = __d.find(sel)[i]; return { tabIndex: e.tabIndex, tag: e.tagName.toLowerCase(), text: e.textContent.trim().slice(0, 15) }; }, { sel, i });
    await h.asElement().click(); await a.waitForTimeout(600); const sc = await sig(a); await a.close();
    const d = await loadFresh(0);
    await d.evaluate(({ sel, i }) => { __d.find(sel)[i].focus(); }, { sel, i });
    await d.keyboard.press('Enter'); await d.waitForTimeout(600); const se = await sig(d); await d.close();
    per.push({ ...meta, mudaPorClique: sc !== b, mudaPorEnter: se !== b, enterIgualClique: sc === se });
  }
  return { reach, reachDir, per };
}
for (const [id, key] of [['C-07', 'tabs'], ['C-09', 'pag']]) {
  const c = C[id]; const n = await find(pages.inicial, c.selector);
  let out;
  try {
    const r = await enterEqClick(c, key);
    const ok = r.reach >= n && r.per.every(p => p.enterIgualClique && p.tabIndex >= 0) && r.per.some(p => p.mudaPorClique);
    out = { v: ok ? 'confirma' : 'diverge', m: r };
  } catch (e) { out = { v: 'inconclusivo', m: { erro: String(e).slice(0, 300) } }; }
  add(id, 'conforme', 'inicial', out.v === 'confirma' && n !== c.count ? 'diverge' : out.v, { count: n, expectedCount: c.count, ...out.m }, n === c.count ? '' : 'contagem difere');
}

// ---------- saída ----------
const extra = { estados: stateCheck, escritasNoMock: writes, requisicoesExternasAbortadas: blocked };
const tally = arr => arr.reduce((a, r) => (a[r.veredito] = (a[r.veredito] || 0) + 1, a), {});
const porId = {};
for (const r of R) { (porId[r.id] ||= []).push(r.veredito); }
const agregado = Object.fromEntries(Object.entries(porId).map(([k, v]) => [k, v.every(x => x === 'confirma') ? 'confirma' : v.includes('diverge') ? 'diverge' : 'inconclusivo']));
const specsAgg = Object.fromEntries(Object.entries(agregado).filter(([k]) => k.startsWith('B-')));
const confAgg = Object.fromEntries(Object.entries(agregado).filter(([k]) => k.startsWith('C-')));
const unitsConf = Object.entries(specsAgg).filter(([, v]) => v === 'confirma').reduce((s, [k]) => s + S[k].expectedCount, 0);
const unitsTotal = GT.violations.reduce((s, v) => s + v.expectedCount, 0);
const out = { geradoEm: new Date().toISOString(), viewport: META.viewport, resumo: { specs: tally(Object.entries(specsAgg).map(([, v]) => ({ veredito: v }))), conformes: tally(Object.entries(confAgg).map(([, v]) => ({ veredito: v }))), unidadesConfirmadas: unitsConf, unidadesTotal: unitsTotal }, agregado, ...extra, medidas: R };
fs.writeFileSync(path.join(__dir, 'resultado.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.resumo), JSON.stringify(stateCheck.map(s => s.ok)), 'escritas', writes.length, 'externos', blocked.length);
for (const [k, v] of Object.entries(agregado)) if (v !== 'confirma') console.log('NAO-CONFIRMA', k, v);
await browser.close(); server.close();
