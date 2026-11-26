// muito-dificil-3: depois da mudança (sem disabled, pointer-events:none no host),
// o botão "Assumir" ainda recebe foco e pode ser acionado por teclado?
import fs from 'node:fs';
import { chromium, abrir, OUT } from './comum.mjs';
const browser = await chromium.launch({ headless: true });
const { page } = await abrir(browser);
const btn = await page.evaluateHandle(() => [...document.querySelector('br-tab').shadowRoot.querySelectorAll('button')].find(b => /Aguardando/.test(b.textContent)));
await btn.asElement().click();
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelectorAll('div.br-table tbody br-button[title="Assumir processo"]').forEach(h => { const d = h.hasAttribute('disabled'); h.removeAttribute('disabled'); if (d) h.style.pointerEvents = 'none'; }));
await page.waitForTimeout(400);
const urlAntes = page.url();
const dialogs = [];
page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
// clique de mouse
let clique = 'ok';
try { await page.locator('div.br-table tbody br-button[title="Assumir processo"]').first().click({ timeout: 2000 }); } catch (e) { clique = 'bloqueado: ' + String(e).split('\n')[0].slice(0, 120); }
// teclado: foca o botão interno e pressiona Enter
const focou = await page.evaluate(() => { const b = document.querySelector('div.br-table tbody br-button[title="Assumir processo"]').shadowRoot.querySelector('button'); b.focus(); return document.activeElement?.tagName + '/' + (b.getRootNode().activeElement === b); });
const domAntes = await page.evaluate(() => document.body.innerText.length);
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);
const depois = await page.evaluate(() => ({ modal: !!document.querySelector('.br-modal, .swal2-container, [role=dialog]'), texto: document.body.innerText.length, alertas: [...document.querySelectorAll('.br-message, .swal2-title')].map(e => e.textContent.trim().slice(0, 80)) }));
const res = { clique, focou, urlAntes, urlDepois: page.url(), dialogs, domAntes, depois };
await page.screenshot({ path: `${OUT}/capturas/F-muito-dificil-3-teclado.png` });
fs.writeFileSync(`${OUT}/medidas-md3-teclado.json`, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1));
await browser.close();
