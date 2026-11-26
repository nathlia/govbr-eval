// Peças comuns: servidor estático da ala (SPA + alias do "Sair"), Chromium headless 1280x900, serialização.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join, extname} from 'node:path';

const require = createRequire('F:/Dev Nath/TCC/govbr-eval/package.json');
export const {chromium} = require('playwright');
export const ALA = 'pnip-f2';
export const ROTA = `/${ALA}/portal-mpa/processos?mock-perfil=mpa`;
const TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.txt': 'text/plain'};

export async function servir(dir, porta) {
   const prefixo = `/${ALA}/`;
   const s = createServer(async (req, res) => {
      try {
         let c = decodeURIComponent(new URL(req.url, 'http://x').pathname);
         if (c === '/assets/images/exit-icon.png') c = prefixo + 'assets/images/exit-icon.png';
         else if (c.startsWith(prefixo) && !extname(c)) c = prefixo + 'index.html';
         if (!c.startsWith(prefixo)) throw new Error('fora');
         const corpo = await readFile(join(dir, c.slice(prefixo.length)));
         res.writeHead(200, {'content-type': TIPOS[extname(c).toLowerCase()] ?? 'application/octet-stream'}).end(corpo);
      } catch {
         res.writeHead(404).end();
      }
   });
   await new Promise((ok, erro) => { s.once('error', erro); s.listen(porta, '127.0.0.1', ok); });
   return {s, base: `http://127.0.0.1:${porta}`};
}

// Abre a rota num contexto novo; devolve {ctx, pagina, eventos}.
export async function abrir(browser, base) {
   const ctx = await browser.newContext({viewport: {width: 1280, height: 900}, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR'});
   const pagina = await ctx.newPage();
   const eventos = {externas: [], erros: [], falhas: []};
   pagina.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) eventos.externas.push(r.url()); });
   pagina.on('pageerror', (e) => eventos.erros.push(String(e)));
   pagina.on('response', (r) => { if (r.status() >= 400) eventos.falhas.push(`${r.status()} ${r.url().replace(base, '')}`); });
   await pagina.goto(base + ROTA, {waitUntil: 'networkidle'});
   await pagina.waitForSelector('main .br-table tbody tr', {timeout: 20000});
   await pagina.waitForTimeout(1500);
   return {ctx, pagina, eventos};
}

// Lista de elementos em ordem de documento, atravessando shadow roots abertos, com descritor estável e,
// opcionalmente, todos os estilos computados.
export const LISTAR = (comEstilos) => {
   const out = [];
   const andar = (el, prof, caminho) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'head') return;
      const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ').slice(0, 40);
      const a = (n) => el.getAttribute(n) ?? '';
      const desc = [prof, tag, a('id').replace(/\d{3,}/g, 'N'), a('aria-label'), a('title'), a('label'), a('name'), txt].join('|');
      const attrs = [...el.attributes].map((x) => [x.name.replace(/^(_ngcontent|_nghost)-?[a-z0-9]{3,}-?c(\d+)$/, '$1-X-c$2'), x.value]).sort(([p], [q]) => (p < q ? -1 : 1)).map(([k, v]) => `${k}="${v}"`).join(' ');
      const item = {desc, caminho, attrs};
      if (comEstilos) {
         const cs = getComputedStyle(el);
         const e = {};
         for (let i = 0; i < cs.length; i++) e[cs[i]] = cs.getPropertyValue(cs[i]);
         item.estilos = e;
      }
      out.push(item);
      let i = 0;
      if (el.shadowRoot) for (const c of el.shadowRoot.children) andar(c, prof + 1, `${caminho}/#shadow/${c.tagName.toLowerCase()}[${i++}]`);
      i = 0;
      for (const c of el.children) andar(c, prof + 1, `${caminho}/${c.tagName.toLowerCase()}[${i++}]`);
   };
   andar(document.documentElement, 0, 'html');
   return out;
};

// Alinhamento LCS pelos descritores. Devolve pares [iA, iB] e os sem par.
export function alinhar(A, B) {
   const n = A.length, m = B.length;
   const dp = new Uint16Array((n + 1) * (m + 1));
   for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      dp[i * (m + 1) + j] = A[i].desc === B[j].desc ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
   }
   const pares = [], soA = [], soB = [];
   let i = 0, j = 0;
   while (i < n && j < m) {
      if (A[i].desc === B[j].desc) { pares.push([i, j]); i++; j++; }
      else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) soA.push(i++);
      else soB.push(j++);
   }
   while (i < n) soA.push(i++);
   while (j < m) soB.push(j++);
   return {pares, soA, soB};
}
