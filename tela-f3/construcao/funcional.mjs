// Uso: node funcional.mjs <dirA> <dirB> <saida.json>
// A página continua funcionando? Abas, filtros, busca, ordenação, paginação, Exibir, Meus processos, Voltar, nos dois
// builds (contexto novo por roteiro). Os textos da tabela são comparados com o nome comprido da 1ª linha de
// Tramitando (M-04, dado) trocado pelo nome que a linha tem sem semente. As diferenças de comportamento esperadas
// (03, 09, 12) estão listadas em ESPERADAS: o roteiro só é "igual" se, tirando essas chaves, A e B coincidem, e as
// chaves listadas de fato diferem.
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir, ALA} from './comum.mjs';

const [dirA, dirB, saida] = process.argv.slice(2);
const LONGO = 'Pessoa Exemplo De Nome Comprido Para Teste Da Listagem';
const norm = (v) => JSON.parse(JSON.stringify(v).split(LONGO).join('Pessoa Exemplo Dias'));

const tabela = (p) => p.evaluate(() => {
   const t = document.querySelector('pnip-mpa-processos .br-table table');
   const linhas = t ? [...t.querySelectorAll('tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()) : [];
   const info = document.querySelector('govbr-custom-pagination .pagination-information')?.textContent.replace(/\s+/g, ' ').trim() ?? null;
   const pag = document.querySelector('govbr-custom-pagination nav.br-pagination.small');
   return {n: linhas.length, primeira: linhas[0] ?? null, ultima: linhas.at(-1) ?? null, info, paginaAtual: pag?.getAttribute('data-current') ?? null, totalPaginas: pag?.getAttribute('data-total') ?? null, vazio: document.querySelector('pnip-mpa-processos .mt-5.text-center p')?.textContent.trim() ?? null};
});
const aba = async (p, rotulo) => { await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: rotulo}).click(); await p.waitForTimeout(1500); };
const etiquetas = (p) => p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag').allTextContents().then((x) => x.map((s) => s.trim()));
const exibir = async (p, v) => {
   const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
   await sel.scrollIntoViewIfNeeded();
   await sel.locator('button[aria-label="Exibir lista"]').click();
   await p.waitForTimeout(500);
   const itens = await sel.locator('div.br-list div.br-item').allTextContents().then((x) => x.map((s) => s.trim()));
   await sel.locator('div.br-list div.br-item', {hasText: new RegExp(`^\\s*${v}\\s*$`)}).click();
   await p.waitForTimeout(1500);
   return {itens, campo: await sel.locator('input#total').inputValue()};
};

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
      r.etiquetas = await etiquetas(p);
      r.limparHabilitado = await p.evaluate(() => !document.querySelector('pnip-multiple-search-table-utils br-button[label="Limpar filtros"]').hasAttribute('disabled'));
      await p.locator('pnip-multiple-search-table-utils br-button[label="Limpar filtros"] button').click();
      await p.waitForTimeout(1500);
      r.depoisDeLimpar = await tabela(p);
      r.etiquetasDepoisDeLimpar = (await etiquetas(p)).length;
      return r;
   },
   busca: async (p) => {
      const r = {};
      await p.locator('pnip-search-table-utils br-input#search input').fill('Exemplo Alfa');
      await p.keyboard.press('a'); await p.keyboard.press('Backspace');
      await p.waitForTimeout(1500);
      r.alfa = await tabela(p);
      await p.locator('pnip-search-table-utils br-input#search input').fill('Dias');
      await p.keyboard.press('s'); await p.keyboard.press('Backspace');
      await p.waitForTimeout(1500);
      r.dias = await tabela(p);
      return r;
   },
   ordenacao: async (p) => {
      const r = {antes: await tabela(p)};
      await p.locator('pnip-mpa-processos table thead br-icon-base').first().click();
      await p.waitForTimeout(800);
      r.asc = await tabela(p);
      await p.locator('pnip-mpa-processos table thead br-icon-base').first().click();
      await p.waitForTimeout(800);
      r.desc = await tabela(p);
      return r;
   },
   meusProcessos: async (p) => {
      const r = {com: await tabela(p)};
      await p.locator('pnip-mpa-processos span.br-tag.interaction', {hasText: 'Meus processos'}).click();
      await p.waitForTimeout(1500);
      r.sem = await tabela(p);
      await p.locator('pnip-mpa-processos span.br-tag.interaction', {hasText: 'Meus processos'}).click();
      await p.waitForTimeout(1500);
      r.comDeNovo = await tabela(p);
      return r;
   },
   paginacao: async (p) => {
      const r = {};
      await aba(p, 'Concluídos');
      r.concluidos = await tabela(p);
      const prox = p.locator('govbr-custom-pagination button[aria-label="Página seguinte"]');
      r.seguinteHabilitado = await prox.isEnabled();
      if (r.seguinteHabilitado) { await prox.click(); await p.waitForTimeout(1500); r.depoisDeSeguinte = await tabela(p); }
      r.seguinteNaUltima = await prox.isEnabled();
      await p.locator('govbr-custom-pagination nav.br-pagination.small a.page', {hasText: /^\s*1\s*$/}).click();
      await p.waitForTimeout(1500);
      r.depoisDeClicarNa1 = await tabela(p);
      const selPag = p.locator('govbr-custom-pagination br-select-pnip[label="Página"]');
      await selPag.scrollIntoViewIfNeeded();
      await selPag.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
      await selPag.locator('div.br-list div.br-item', {hasText: /^\s*2\s*$/}).click();
      await p.waitForTimeout(1500);
      r.depoisDoSeletorPagina2 = {...(await tabela(p)), campoPagina: await selPag.locator('input#page').inputValue()};
      return r;
   },
   exibir: async (p) => {
      const r = {};
      await aba(p, 'Concluídos');
      const e25 = await exibir(p, '25');
      r.itensExibir = e25.itens; r.campoDepoisDe25 = e25.campo; r.depoisDe25 = await tabela(p);
      const e50 = await exibir(p, '50');
      r.campoDepoisDe50 = e50.campo; r.depoisDe50 = await tabela(p);
      const e10 = await exibir(p, '10');
      r.campoDepoisDe10 = e10.campo; r.depoisDe10 = await tabela(p);
      return r;
   },
   xDoFiltro: async (p) => {
      const r = {};
      await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Status'}).click();
      await p.waitForTimeout(400);
      await p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').first().click();
      await p.waitForTimeout(1500);
      r.comFiltro = {tabela: await tabela(p), etiquetas: await etiquetas(p)};
      await p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction > button').first().click();
      await p.waitForTimeout(1500);
      r.depoisDoX = {tabela: await tabela(p), etiquetas: await etiquetas(p)};
      // "Limpar filtros" só está habilitado se ainda houver filtro (na sem semente o × já o tirou)
      const limpar = p.locator('pnip-multiple-search-table-utils br-button[label="Limpar filtros"] button');
      r.limparHabilitadoDepoisDoX = await limpar.isEnabled();
      if (r.limparHabilitadoDepoisDoX) { await limpar.click(); await p.waitForTimeout(1500); }
      r.depoisDeLimparSeHabilitado = {tabela: await tabela(p), etiquetas: await etiquetas(p)};
      return r;
   },
   assinaturaEmLote: async (p) => {
      const r = {};
      const rotulo = () => p.evaluate(() => [...document.querySelectorAll('pnip-mpa-processos div.mt-3 > br-button')].map((b) => b.getAttribute('label')));
      r.antes = await rotulo();
      await p.locator('pnip-mpa-processos table tbody input[type=checkbox]').first().check();
      await p.waitForTimeout(600);
      r.rotuloComLinhaMarcada = await rotulo();
      await p.locator('pnip-mpa-processos div.mt-3 > br-button button').click();
      await p.waitForTimeout(800);
      r.dialogo = await p.evaluate(() => ({titulo: document.querySelector('.swal2-title')?.textContent ?? null, texto: document.querySelector('.swal2-html-container')?.textContent.replace(/\s+/g, ' ').trim() ?? null}));
      await p.locator('.swal2-cancel').click(); // nunca assinar
      await p.waitForTimeout(800);
      r.depoisDeCancelar = {dialogo: await p.evaluate(() => !!document.querySelector('.swal2-container')), tabela: await tabela(p)};
      r.rotuloDepoisDeCancelar = await rotulo();
      await p.locator('pnip-mpa-processos table tbody input[type=checkbox]').first().uncheck();
      await p.waitForTimeout(600);
      r.depoisDeDesmarcar = await rotulo();
      return r;
   },
   voltar: async (p, base) => {
      await p.goto(base + `/${ALA}/portal-mpa?mock-perfil=mpa`, {waitUntil: 'networkidle'});
      await p.goto(base + `/${ALA}/portal-mpa/processos?mock-perfil=mpa`, {waitUntil: 'networkidle'});
      await p.waitForSelector('main .br-table tbody tr', {timeout: 20000});
      await p.waitForTimeout(1000);
      const antes = new URL(p.url()).pathname;
      await p.locator('pnip-mpa-processos br-button[label="Voltar"] button').click();
      await p.waitForTimeout(2000);
      return {antes, depois: new URL(p.url()).pathname + new URL(p.url()).search};
   },
   // Só observação (M-07): o que acontece ao clicar no último item do breadcrumb.
   breadcrumbProcessos: async (p) => {
      const temLink = await p.evaluate(() => !!document.querySelector('pnip-mpa-processos br-breadcrumb').shadowRoot.querySelector('li.crumb:last-child a'));
      if (!temLink) return {temLink};
      await p.locator('pnip-mpa-processos br-breadcrumb li.crumb:last-child a').click();
      await p.waitForTimeout(2500);
      const u = new URL(p.url());
      return {temLink, depois: u.pathname + u.search, linhas: await p.evaluate(() => document.querySelectorAll('main .br-table tbody tr').length), titulo: await p.evaluate(() => document.querySelector('pnip-mpa-processos h2')?.textContent.trim() ?? null)};
   },
};

// Diferenças de comportamento esperadas, por roteiro: chave → mudança.
const ESPERADAS = {
   exibir: {campoDepoisDe25: 'M-09', campoDepoisDe50: 'M-09'},
   xDoFiltro: {depoisDoX: 'M-03', limparHabilitadoDepoisDoX: 'M-03 (o filtro continua lá)'},
   assinaturaEmLote: {rotuloComLinhaMarcada: 'M-12', rotuloDepoisDeCancelar: 'M-12'},
   breadcrumbProcessos: {'*': 'M-07 (observação: só a semeada tem o link)'},
};

const sA = await servir(dirA, 4731), sB = await servir(dirB, 4732);
const browser = await chromium.launch({headless: true});
const res = {};
try {
   for (const [nome, f] of Object.entries(ROTEIROS)) {
      const v = {};
      for (const [rot, base] of [['A', sA.base], ['B', sB.base]]) {
         const {ctx, pagina, eventos} = await abrir(browser, base);
         try { v[rot] = norm(await f(pagina, base)); } catch (e) { v[rot] = {erro: String(e).slice(0, 500)}; }
         v[rot + 'Eventos'] = eventos;
         await ctx.close();
      }
      const esp = ESPERADAS[nome] ?? {};
      if (esp['*']) {
         v.esperado = esp['*'];
         v.iguais = null;
      } else {
         const tirar = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !(k in esp)));
         v.iguaisForaDasEsperadas = JSON.stringify(tirar(v.A)) === JSON.stringify(tirar(v.B));
         v.esperadasDiferem = Object.fromEntries(Object.entries(esp).map(([k, m]) => [k, {m, A: v.A[k], B: v.B[k], difere: JSON.stringify(v.A[k]) !== JSON.stringify(v.B[k])}]));
         v.iguais = Object.keys(esp).length ? null : v.iguaisForaDasEsperadas;
      }
      res[nome] = v;
      console.log(nome, Object.keys(esp).length ? `fora das esperadas: ${v.iguaisForaDasEsperadas ?? '-'}; esperadas diferem: ${JSON.stringify(Object.fromEntries(Object.entries(v.esperadasDiferem ?? {}).map(([k, x]) => [k, x.difere])))}` : (v.iguais ? 'IGUAL' : 'DIFERENTE'));
   }
} finally {
   await browser.close();
   sA.s.close(); sB.s.close();
}
await writeFile(saida, JSON.stringify(res, null, 1));
