import { createRequire } from 'node:module';
const require = createRequire('F:/Dev Nath/TCC/govbr-eval/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://127.0.0.1:3411/pnip-d/portal-mpa/processos?mock-perfil=mpa', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => document.querySelector('br-breadcrumb').shadowRoot.querySelector('ul').outerHTML.replace(/<!---->/g,'')));
console.log(await p.evaluate(async () => { const b = document.querySelector('br-breadcrumb'); b.links = [{ label: 'Home', url: '/portal-mpa/' }, { label: 'Processos', active: true }]; await new Promise(r => setTimeout(r, 400)); return b.shadowRoot.querySelector('ul').outerHTML.replace(/<!---->/g,''); }));
await p.screenshot({ path: 'explor/v-breadcrumb-sem-home.png', clip: { x: 40, y: 120, width: 400, height: 70 } });
// table th/td vertical-align, row heights; pagination nav positions
console.log(JSON.stringify(await p.evaluate(() => { const ths=[...document.querySelectorAll('div.br-table thead th')].map(t=>getComputedStyle(t).verticalAlign+'/'+getComputedStyle(t).textAlign); const sel=document.querySelector('div.pagination-per-page .br-input'); return {ths, perpageWrapCls: sel.className, inputBorder: getComputedStyle(sel.querySelector('input')).border, avatarCls: document.querySelector('span.br-avatar').className}; })));
await b.close();
