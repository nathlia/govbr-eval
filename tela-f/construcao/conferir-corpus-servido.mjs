// Confere que o corpus (vite preview do build do ramo tela-f) serve os bytes de pnip-f-semeada:
// cada arquivo da árvore por GET e a rota da tela (fallback de SPA) = index.html; depois abre a rota.
// Uso: node conferir-corpus-servido.mjs <base, ex. http://localhost:4319>
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from './comum.mjs';
const base = process.argv[2];
const RAIZ = 'F:/Dev Nath/TCC/.tmp-eval/pnip-f-semeada';
const listar = (d, p = '') => readdirSync(join(d, p), {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? listar(d, p ? `${p}/${e.name}` : e.name) : [p ? `${p}/${e.name}` : e.name]));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const divergentes = [];
const arqs = listar(RAIZ);
for (const r of arqs) {
   const res = await fetch(`${base}/pnip-f/${encodeURI(r)}`);
   const b = Buffer.from(await res.arrayBuffer());
   if (res.status !== 200 || sha(b) !== sha(readFileSync(join(RAIZ, r)))) divergentes.push(`${res.status} ${r}`);
}
const rota = Buffer.from(await (await fetch(`${base}/pnip-f/portal-mpa/processos?mock-perfil=mpa`)).arrayBuffer());
const rotaIgualIndex = sha(rota) === sha(readFileSync(join(RAIZ, 'index.html')));
const browser = await chromium.launch({headless: true});
const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
const p = await ctx.newPage();
const externas = [], erros = [];
p.on('request', (q) => { if (!q.url().startsWith(base)) externas.push(q.url()); });
p.on('pageerror', (e) => erros.push(String(e)));
await p.goto(`${base}/pnip-f/portal-mpa/processos?mock-perfil=mpa`, {waitUntil: 'networkidle'});
await p.waitForSelector('main .br-table tbody tr', {timeout: 20000});
const linhas = await p.locator('main .br-table tbody tr').count();
await browser.close();
const out = {base, arquivos: arqs.length, divergentes, rotaIgualIndex, linhas, externas, erros};
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'corpus-servido.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
