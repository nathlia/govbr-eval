// Comum à conferência de construção da tela F: servidor estático por árvore (SPA da ala pnip-f),
// navegador headless 1280x900 e os passos que levam a cada estado.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join, extname} from 'node:path';

const require = createRequire('F:/Dev Nath/TCC/govbr-eval/package.json');
export const {chromium} = require('playwright');
export const {PNG} = require('pngjs');
const pm = require('pixelmatch');
export const pixelmatch = pm.default ?? pm;

export const ALA = 'pnip-f';
export const ROTA = `/${ALA}/portal-mpa/processos?mock-perfil=mpa`;
export const ARVORES = {
   'sem-semente': 'F:/Dev Nath/TCC/.tmp-eval/pnip-f-sem-semente',
   semeada: 'F:/Dev Nath/TCC/.tmp-eval/pnip-f-semeada',
};
const TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.txt': 'text/plain'};

export async function servir(dir) {
   const prefixo = `/${ALA}/`;
   const s = createServer(async (req, res) => {
      try {
         let c = decodeURIComponent(new URL(req.url, 'http://x').pathname);
         if (c === '/assets/images/exit-icon.png') c = prefixo + 'assets/images/exit-icon.png';
         else if (c.startsWith(prefixo) && !extname(c)) c = prefixo + 'index.html';
         if (!c.startsWith(prefixo) || c === prefixo + 'manifesto.json') throw new Error('fora');
         const corpo = await readFile(join(dir, c.slice(prefixo.length)));
         res.writeHead(200, {'content-type': TIPOS[extname(c).toLowerCase()] ?? 'application/octet-stream'}).end(corpo);
      } catch {
         res.writeHead(404).end();
      }
   });
   await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
   return {s, base: `http://127.0.0.1:${s.address().port}`};
}

/** Página nova na rota, com registro de requisições externas, erros e respostas >= 400. */
export async function abrir(browser, base) {
   const ctx = await browser.newContext({viewport: {width: 1280, height: 900}, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR'});
   const pagina = await ctx.newPage();
   const reg = {externas: [], erros: [], falhas: []};
   pagina.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:blank') reg.externas.push(u); });
   pagina.on('pageerror', (e) => reg.erros.push(String(e)));
   pagina.on('response', (r) => { if (r.status() >= 400) reg.falhas.push(`${r.status()} ${r.url().replace(base, '')}`); });
   await pagina.goto(base + ROTA, {waitUntil: 'networkidle'});
   await pagina.waitForSelector('main .br-table tbody tr', {timeout: 20000});
   await pagina.waitForTimeout(1500);
   return {ctx, pagina, reg};
}

const TAG_FILTRO = 'pnip-multiple-search-table-utils div.row.align-items-center span.br-tag.interaction';

/** Estados usados pelas mudanças. Cada um parte de uma página recém-aberta. */
export const ESTADOS = {
   inicial: async () => {},
   'filtro-aberto': async (p) => {
      await p.locator(TAG_FILTRO, {hasText: 'Tipo de processo'}).first().click();
      await p.waitForSelector('pnip-multiple-search-table-utils div.br-select div.br-list');
      await p.waitForTimeout(500);
   },
   'filtro-escolhido': async (p) => {
      await ESTADOS['filtro-aberto'](p);
      await p.locator('pnip-multiple-search-table-utils div.br-select div.br-list div.br-item div.br-radio').first().click();
      await p.waitForSelector('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction');
      await p.waitForTimeout(800);
   },
   'lista-exibir': async (p) => {
      await p.locator('govbr-custom-pagination input#total').click();
      await p.waitForTimeout(800);
   },
};
