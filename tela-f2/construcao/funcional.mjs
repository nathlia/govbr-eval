// Uso: node funcional.mjs <dirA> <dirB> <saida.json>
// A página continua funcionando? Tabela, abas, filtros, paginação e Voltar, nos dois builds (contexto novo por roteiro).
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir} from './comum.mjs';

const [dirA, dirB, saida] = process.argv.slice(2);

const tabela = (p) => p.evaluate(() => {
   const t = document.querySelector('pnip-mpa-processos .br-table table');
   const linhas = t ? [...t.querySelectorAll('tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()) : [];
   const info = document.querySelector('govbr-custom-pagination .pagination-information')?.textContent.replace(/\s+/g, ' ').trim() ?? null;
   const pag = document.querySelector('govbr-custom-pagination nav.br-pagination.small');
   return {n: linhas.length, primeira: linhas[0] ?? null, ultima: linhas.at(-1) ?? null, info, paginaAtual: pag?.getAttribute('data-current') ?? null, totalPaginas: pag?.getAttribute('data-total') ?? null};
});
const aba = async (p, rotulo) => { await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: rotulo}).click(); await p.waitForTimeout(1500); };

const ROTEIROS = {
   abas: async (p) => {
      const r = {inicial: await tabela(p)};
      for (const rot of ['Concluídos', 'Aguardando análise', 'Tramitando']) {
         await aba(p, rot);
         r[rot] = {...(await tabela(p)), ativa: await p.evaluate(() => [...document.querySelector('pnip-mpa-processos br-tab').shadowRoot.querySelectorAll('li.tab-item.active')].map((li) => li.textContent.trim()))};
      }
      return r;
   },
   filtros: async (p) => {
      const r = {};
      await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Tipo de processo'}).click();
      await p.waitForTimeout(400);
      const ops = p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio');
      r.opcoesTipo = await ops.allTextContents().then((x) => x.map((s) => s.trim()));
      await ops.first().click();
      await p.waitForTimeout(1500);
      r.depoisDeEscolher = await tabela(p);
      r.etiquetas = await p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag').allTextContents().then((x) => x.map((s) => s.trim()));
      r.limparHabilitado = await p.evaluate(() => !document.querySelector('pnip-multiple-search-table-utils br-button[label="Limpar filtros"]').hasAttribute('disabled'));
      await p.locator('pnip-multiple-search-table-utils br-button[label="Limpar filtros"] button').click();
      await p.waitForTimeout(1500);
      r.depoisDeLimpar = await tabela(p);
      r.etiquetasDepoisDeLimpar = await p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag').count();
      await p.locator('pnip-search-table-utils br-input#search input').fill('Exemplo Alfa');
      await p.keyboard.press('a'); await p.keyboard.press('Backspace');
      await p.waitForTimeout(1500);
      r.busca = await tabela(p);
      return r;
   },
   paginacao: async (p) => {
      const r = {};
      await aba(p, 'Concluídos');
      r.concluidos = await tabela(p);
      const prox = p.locator('govbr-custom-pagination button[aria-label="Página seguinte"]');
      r.seguinteHabilitado = await prox.isEnabled();
      if (r.seguinteHabilitado) { await prox.click(); await p.waitForTimeout(1500); r.depoisDeSeguinte = await tabela(p); }
      const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
      await sel.scrollIntoViewIfNeeded();
      await sel.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
      r.itensExibir = await sel.locator('div.br-list div.br-item').allTextContents().then((x) => x.map((s) => s.trim()));
      await sel.locator('div.br-list div.br-item', {hasText: /^\s*25\s*$/}).click();
      await p.waitForTimeout(1500);
      r.exibirValor = await sel.locator('input#total').inputValue();
      r.depoisDe25 = await tabela(p);
      return r;
   },
   voltar: async (p, base) => {
      await p.goto(base + '/pnip-f2/portal-mpa?mock-perfil=mpa', {waitUntil: 'networkidle'});
      await p.goto(base + '/pnip-f2/portal-mpa/processos?mock-perfil=mpa', {waitUntil: 'networkidle'});
      await p.waitForSelector('main .br-table tbody tr', {timeout: 20000});
      await p.waitForTimeout(1000);
      const antes = new URL(p.url()).pathname;
      await p.locator('pnip-mpa-processos br-button[label="Voltar"] button').click();
      await p.waitForTimeout(2000);
      return {antes, depois: new URL(p.url()).pathname + new URL(p.url()).search};
   },
};

const sA = await servir(dirA, 4731), sB = await servir(dirB, 4732);
const browser = await chromium.launch({headless: true});
const res = {};
try {
   for (const [nome, f] of Object.entries(ROTEIROS)) {
      const v = {};
      for (const [rot, base] of [['A', sA.base], ['B', sB.base]]) {
         const {ctx, pagina, eventos} = await abrir(browser, base);
         try { v[rot] = await f(pagina, base); } catch (e) { v[rot] = {erro: String(e).slice(0, 500)}; }
         v[rot + 'Eventos'] = eventos;
         await ctx.close();
      }
      v.iguais = JSON.stringify(v.A) === JSON.stringify(v.B);
      res[nome] = v;
      console.log(nome, v.iguais ? 'IGUAL' : 'DIFERENTE');
   }
} finally {
   await browser.close();
   sA.s.close(); sB.s.close();
}
await writeFile(saida, JSON.stringify(res, null, 1));
