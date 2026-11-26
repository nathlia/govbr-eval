// Verifica se variáveis de foco definidas no host br-tab chegam ao botão interno (viabilidade da injeção de foco)
import { createRequire } from 'node:module';
const require = createRequire('F:/Dev Nath/TCC/govbr-eval/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://127.0.0.1:3411/pnip-d/portal-mpa/processos?mock-perfil=mpa', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const get = () => p.evaluate(() => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; const c = getComputedStyle(a); return a.tagName + ' ' + a.getAttribute('data-panel') + ' ' + c.outline + ' off=' + c.outlineOffset; });
await p.locator('br-button[label="Exportar"]').evaluate(h => h.shadowRoot.querySelector('button').focus());
await p.keyboard.press('Tab'); console.log('antes:', await get());
await p.evaluate(() => { const t = document.querySelector('br-tab'); t.style.setProperty('--focus-style', 'solid'); t.style.setProperty('--focus', '#1351b4'); t.style.setProperty('--focus-color', '#1351b4'); });
await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); console.log('depois:', await get());
// gaps entre tags de filtro e checagem de truncamento da coluna Solicitante
console.log(JSON.stringify(await p.evaluate(() => ({ tags: [...document.querySelectorAll('pnip-multiple-search-table-utils span.br-tag')].map(t => { const r = t.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.right), Math.round(r.y)]; }), solicitante: [...document.querySelectorAll('div.br-table tbody tr')].slice(0,3).map(tr => { const td = tr.children[4]; return [td.scrollWidth, td.clientWidth, getComputedStyle(td).whiteSpace, getComputedStyle(td).textOverflow]; }), meusLabelLines: (() => { const s = document.querySelector('div.tab-panel span.br-tag span.text-truncate'); return [s.getBoundingClientRect().height, getComputedStyle(s).whiteSpace]; })(), tagH: getComputedStyle(document.querySelector('div.tab-panel span.br-tag')).height }))));
await b.close();
