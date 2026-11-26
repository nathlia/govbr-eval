// Reconhecimento inicial do DOM (estado inicial) para escrever as medições.
import fs from 'node:fs';
import { chromium, abrir, OUT } from './comum.mjs';
const browser = await chromium.launch({ headless: true });
const { page } = await abrir(browser);
const info = await page.evaluate(() => {
  const ths = [...document.querySelectorAll('div.br-table thead th')].map((th, i) => ({ i: i + 1, t: th.textContent.trim(), bg: getComputedStyle(th).backgroundColor }));
  const tr = document.querySelector('div.br-table tbody tr');
  const tds = [...tr.children].map((td, i) => ({ i: i + 1, t: td.textContent.trim().slice(0, 50), ws: getComputedStyle(td).whiteSpace }));
  const tags = [...document.querySelectorAll('span.br-tag')].map(t => ({ t: t.textContent.trim().slice(0, 30), cls: t.className, r: getComputedStyle(t).borderRadius, h: t.getBoundingClientRect().height }));
  const btns = [...document.querySelectorAll('br-button')].map(b => ({ label: b.getAttribute('label'), title: b.getAttribute('title'), type: b.getAttribute('type'), dis: b.hasAttribute('disabled'), inner: b.shadowRoot?.querySelector('button')?.className }));
  const tabs = [...document.querySelectorAll('br-tab-item')].map(t => t.outerHTML.slice(0, 120));
  const brtab = document.querySelector('br-tab');
  const tabShadow = brtab?.shadowRoot?.innerHTML.slice(0, 1500);
  return { ths, tds, tags, btns, tabs, tabShadow, rows: document.querySelectorAll('div.br-table tbody tr').length, h: document.documentElement.scrollHeight };
});
fs.writeFileSync(OUT + '/dom-inicial.json', JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 1).slice(0, 6000));
await page.screenshot({ path: OUT + '/capturas/inicial.png', fullPage: true });
await browser.close();
