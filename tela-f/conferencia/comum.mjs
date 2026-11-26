// Utilidades comuns: abre a página no estado inicial (1280x900, headless).
import { createRequire } from 'node:module';
const require = createRequire('F:/Dev Nath/TCC/govbr-eval/node_modules/');
export const { chromium } = require('playwright');
export const URL = 'http://127.0.0.1:3421/pnip-d/portal-mpa/processos?mock-perfil=mpa';
export const OUT = 'F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/conferencia';

export async function abrir(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('div.br-table tbody tr', { timeout: 20000 });
  await page.waitForTimeout(800);
  return { ctx, page };
}

export function rect(el) {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) };
}
