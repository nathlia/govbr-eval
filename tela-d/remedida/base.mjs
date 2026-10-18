// Re-medida independente (segundo agente) da tela D (processos) — infraestrutura própria.
// Escrita do zero: não importa nem copia tela-d/*.mjs, tela-b/**/comum.mjs, validator, axe,
// comparadores ou scorers. Só Playwright (do govbr-eval) + Node.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const EVAL = path.resolve(AQUI, '../..');
const require = createRequire(path.join(EVAL, 'package.json'));
export const { chromium } = require('playwright');
export const GT = JSON.parse(fs.readFileSync(path.join(EVAL, 'ground-truth-processos.json'), 'utf8'));
export const META = GT._meta;
export const CORPUS = path.resolve(EVAL, '../govbr-corpus');
const ALA = 'pnip-d';

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const listar = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listar(path.join(d, e.name)) : [path.join(d, e.name)]);

/** Confere public/ e dist/ da ala contra o manifesto; serve public/. */
export function conferirArvore() {
  const manPath = path.join(CORPUS, 'public', ALA, 'manifesto.json');
  const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
  const out = { manifestoSha256: sha(fs.readFileSync(manPath)), arquivosNoManifesto: Object.keys(man.arquivos).length };
  for (const raiz of ['public', 'dist']) {
    const base = path.join(CORPUS, raiz, ALA);
    if (!fs.existsSync(base)) { out[raiz] = { ausente: true }; continue; }
    const rel = listar(base).map(p => path.relative(base, p).split(path.sep).join('/')).filter(p => p !== 'manifesto.json');
    let iguais = 0; const diverg = [], extras = [];
    for (const r of rel) { if (!(r in man.arquivos)) { extras.push(r); continue; } if (sha(fs.readFileSync(path.join(base, r))) === man.arquivos[r]) iguais++; else diverg.push(r); }
    const faltam = Object.keys(man.arquivos).filter(k => !rel.includes(k));
    out[raiz] = { iguais, divergentes: diverg, extras, faltam };
  }
  return out;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject', '.webp': 'image/webp', '.gif': 'image/gif', '.txt': 'text/plain' };

/** Servidor estático próprio: árvore pnip-d/ de public/, índice SPA, alias do ícone do Sair. */
export async function servir() {
  const PUB = path.join(CORPUS, 'public');
  const reg = { escritas: [], naoAchados: [], servidos: 0 };
  const srv = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') reg.escritas.push(req.method + ' ' + req.url);
    const p = decodeURIComponent(req.url.split('?')[0]);
    let f = null;
    if (p === '/assets/images/exit-icon.png') f = path.join(PUB, ALA, 'assets/images/exit-icon.png');
    else if (p.startsWith('/' + ALA + '/')) {
      f = path.join(PUB, p);
      if (!f.startsWith(path.join(PUB, ALA))) f = null;
      else if (!path.extname(p)) f = path.join(PUB, ALA, 'index.html');
      if (p.endsWith('/manifesto.json')) f = null;
    }
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) {
      reg.servidos++;
      res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      return fs.createReadStream(f).pipe(res);
    }
    reg.naoAchados.push(req.method + ' ' + req.url);
    res.writeHead(404); res.end('404');
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { base, reg, fechar: () => new Promise(r => srv.close(r)) };
}

// Biblioteca injetada (window.__r): raízes com shadow, seletor com `>>>`, contraste, descritor.
export const LIB = `(() => {
  const pf = e => e.parentElement || (e.getRootNode() instanceof ShadowRoot ? e.getRootNode().host : null);
  const rootsUnder = (node) => { const out = []; const walk = r => { for (const el of r.querySelectorAll('*')) if (el.shadowRoot) { out.push(el.shadowRoot); walk(el.shadowRoot); } }; if (node.shadowRoot) { out.push(node.shadowRoot); walk(node.shadowRoot); } walk(node); return out; };
  const allRoots = () => [document, ...rootsUnder(document.documentElement)];
  const deepAll = () => allRoots().flatMap(r => [...r.querySelectorAll('*')]);
  const splitDeep = s => s.split('>>>').map(x => x.trim()).filter(Boolean);
  // Semântica estrita: o 1º segmento é CSS no documento (light DOM); cada '>>>' entra nos shadow roots
  // (em qualquer profundidade) e na subárvore light do hospedeiro, e o segmento seguinte é CSS dentro de uma raiz.
  const findStrict = sel => {
    const segs = splitDeep(sel); let cur = [...document.querySelectorAll(segs[0])];
    for (let i = 1; i < segs.length; i++) {
      const nx = new Set();
      for (const h of cur) for (const r of [h, ...rootsUnder(h)]) {
        const cands = r === h ? [...h.querySelectorAll(segs[i])] : [...r.querySelectorAll(segs[i])];
        for (const c of cands) nx.add(c);
      }
      cur = [...nx];
    }
    return cur;
  };
  // Semântica larga: cada segmento procurado em todas as raízes (documento + shadow roots).
  const findWide = sel => { const segs = splitDeep(sel); let cur = null; for (const s of segs) { const c = allRoots().flatMap(r => [...r.querySelectorAll(s)]); cur = cur === null ? c : c.filter(e => cur.some(h => { let a = pf(e); while (a) { if (a === h) return true; a = pf(a); } return false; })); } return [...new Set(cur)]; };
  const parse = c => { const m = /rgba?\\(([^)]+)\\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const t = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * t(c.r) + 0.7152 * t(c.g) + 0.0722 * t(c.b); };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const fundo = e => { const camadas = []; let n = e, imagem = null; while (n) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !imagem) imagem = cs.backgroundImage.slice(0, 60); const c = parse(cs.backgroundColor); if (c && c.a > 0) { camadas.push(c); if (c.a >= 1) break; } n = pf(n); } let b = { r: 255, g: 255, b: 255, a: 1 }; for (let i = camadas.length - 1; i >= 0; i--) b = over(camadas[i], b); return { b, imagem }; };
  const contraste = e => { const cs = getComputedStyle(e); let f = parse(cs.color); const { b, imagem } = fundo(e); if (f.a < 1) f = over(f, b); const L1 = lum(f), L2 = lum(b); return { razao: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100, cor: hex(f), fundo: hex(b), imagemDeFundo: imagem, fonte: cs.fontSize, peso: cs.fontWeight, texto: (e.innerText || e.textContent || '').trim().slice(0, 40) }; };
  const desc = e => { if (!e) return null; const cls = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).join('.') : ''; const host = e.getRootNode() instanceof ShadowRoot ? e.getRootNode().host.tagName.toLowerCase() + ' >>> ' : ''; return host + e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + cls + (e.getAttribute('aria-label') !== null ? '[aria-label="' + e.getAttribute('aria-label') + '"]' : '') + (e.getAttribute('title') ? '[title="' + e.getAttribute('title') + '"]' : '') + ' "' + (e.innerText || e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '"'; };
  const ativo = () => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a; };
  const caixa = e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
  window.__r = { findStrict, findWide, deepAll, allRoots, pf, contraste, desc, ativo, caixa, parse };
})()`;

export async function abrir(headless = true) {
  const browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({ viewport: META.viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
  return { browser, ctx };
}

/** Página nova: saída abortada, biblioteca injetada; carrega a entrada até a lista, executa `passos` do setup. */
export async function carregar(ctx, base, passos = 0, extra = {}) {
  const page = await ctx.newPage();
  const externos = [], consoleErr = [];
  await page.route('**/*', r => { const u = r.request().url(); if (!u.startsWith(base + '/')) { externos.push(u); return r.abort(); } return r.continue(); });
  page.on('console', m => { if (m.type() === 'error') consoleErr.push(m.text().slice(0, 160)); });
  await page.addInitScript(LIB);
  await page.goto(base + META.url, { waitUntil: 'load' });
  await page.locator(META.waitFor).first().waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  for (let i = 0; i < passos; i++) {
    const s = META.setup[i];
    if (s.action === 'click') await page.locator(s.selector).first().click();
    else if (s.action === 'wait') await page.locator(s.selector).first().waitFor({ state: 'attached', timeout: 20000 });
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(400);
  page.__externos = externos; page.__console = consoleErr;
  return page;
}

export const passosDe = estado => (META.states.find(s => s.id === estado) || { afterStep: 0 }).afterStep;
