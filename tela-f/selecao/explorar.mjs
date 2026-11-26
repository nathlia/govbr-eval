// Exploração da tela Processos (somente leitura). Uso: node explorar.mjs [passo]
import { createRequire } from 'node:module';
const require = createRequire('F:/Dev Nath/TCC/govbr-eval/node_modules/');
const { chromium } = require('playwright');
import fs from 'node:fs';

const OUT = 'F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/selecao/explor';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:3411/pnip-d/portal-mpa/processos?mock-perfil=mpa';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`${m.type()}: ${m.text()}`));
page.on('requestfailed', r => logs.push(`FAIL ${r.url()}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/inicial.png`, fullPage: true });

// Dump DOM, piercing shadow roots
const dump = await page.evaluate(() => {
  const lines = [];
  const props = ['font-size','font-weight','line-height','color','background-color','padding','margin','border','border-radius','height','min-height','width','box-shadow','display','gap','text-transform','letter-spacing','font-family'];
  function desc(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList && el.classList.length) s += '.' + [...el.classList].join('.');
    const attrs = [...(el.attributes||[])].filter(a => !['class','id','style'].includes(a.name) && !a.name.startsWith('_ng')).map(a => `${a.name}="${a.value.slice(0,40)}"`);
    if (attrs.length) s += ' [' + attrs.join(' ') + ']';
    if (el.getAttribute && el.getAttribute('style')) s += ' style="' + el.getAttribute('style') + '"';
    return s;
  }
  function walk(node, depth, inShadow) {
    if (depth > 40) return;
    for (const ch of node.children || []) {
      if (['SCRIPT','STYLE','LINK','SVG','PATH'].includes(ch.tagName.toUpperCase())) continue;
      const r = ch.getBoundingClientRect();
      const txt = [...ch.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim().slice(0,60);
      const cs = getComputedStyle(ch);
      lines.push(`${'  '.repeat(depth)}${inShadow?'(S) ':''}${desc(ch)} {${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}} fs=${cs.fontSize} fw=${cs.fontWeight} c=${cs.color} bg=${cs.backgroundColor}${txt ? ' "' + txt + '"' : ''}`);
      if (ch.shadowRoot) { lines.push(`${'  '.repeat(depth+1)}#shadow-root`); walk(ch.shadowRoot, depth + 2, true); }
      walk(ch, depth + 1, inShadow);
    }
  }
  walk(document.body, 0, false);
  return lines.join('\n');
});
fs.writeFileSync(`${OUT}/dom-inicial.txt`, dump);
fs.writeFileSync(`${OUT}/console.txt`, logs.join('\n'));
console.log('linhas', dump.split('\n').length);
await browser.close();
