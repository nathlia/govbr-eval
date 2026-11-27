// Uso: node medir.mjs <dirAntes> <dirDepois> <saida.json> <id> [<id> ...]
// Cada medida num contexto novo, nos dois builds (antes = sem semente, depois = semeada F3). Ala pnip-f3 nos dois.
// M-02, M-08, M-10 e M-11 reusam as medidas da F2 (M-01, M-05, M-09 e M-06 de lá).
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir} from './comum.mjs';

const [dirAntes, dirDepois, saida, ...ids] = process.argv.slice(2);
const LONGO = 'Pessoa Exemplo De Nome Comprido Para Teste Da Listagem';
const ORIGINAL = 'Pessoa Exemplo Dias'; // o nome que a 1ª linha de Tramitando tem sem semente
const normNome = (s) => s.split(LONGO).join(ORIGINAL);

const PREP = () => {
   window.__cs = (el, props) => { const c = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, c.getPropertyValue(p)])); };
   window.__r = (el) => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100}; };
   window.__proc = () => document.querySelector('pnip-mpa-processos');
};

async function conteudoTabela(p) {
   return p.evaluate(() => {
      const t = document.querySelector('pnip-mpa-processos .br-table table');
      const ths = [...t.querySelectorAll('thead th')].map((x) => x.textContent.replace(/\s+/g, ' ').trim());
      const linhas = [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
      const tag = [...document.querySelectorAll('pnip-mpa-processos span.br-tag.interaction span.text-truncate')].map((x) => x.textContent.trim());
      return {ths, linhas, tag};
   });
}
const aba = async (p, rotulo) => { await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: rotulo}).click(); await p.waitForTimeout(1500); };
const setas = (p) => p.evaluate(() => [...document.querySelectorAll('govbr-custom-pagination nav.br-pagination.small button.br-button.circle[aria-label]')].map((b) => ({rotulo: b.getAttribute('aria-label'), desabilitado: b.disabled, ...__r(b), raio: __cs(b, ['border-radius'])['border-radius'], estilo: b.getAttribute('style')})));
const paginaAtual = (p) => p.evaluate(() => document.querySelector('govbr-custom-pagination nav.br-pagination.small')?.getAttribute('data-current'));
const exibirEstado = (p) => p.evaluate(() => ({
   campo: document.querySelector('govbr-custom-pagination br-select-pnip[label="Exibir"] input#total').value,
   selecionado: [...document.querySelectorAll('govbr-custom-pagination br-select-pnip[label="Exibir"] .br-item.selected')].map((x) => x.textContent.trim()),
   linhas: document.querySelectorAll('pnip-mpa-processos table tbody tr').length,
   info: document.querySelector('govbr-custom-pagination .pagination-information')?.textContent.replace(/\s+/g, ' ').trim(),
   campoPagina: document.querySelector('govbr-custom-pagination br-select-pnip[label="Página"] input#page')?.value ?? null,
}));
async function escolherExibir(p, v) {
   const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
   await sel.scrollIntoViewIfNeeded();
   await sel.locator('button[aria-label="Exibir lista"]').click();
   await p.waitForTimeout(500);
   await sel.locator('div.br-list div.br-item', {hasText: new RegExp(`^\\s*${v}\\s*$`)}).click();
   await p.waitForTimeout(1500);
}
const nomesSolicitante = (p) => p.evaluate(() => {
   const t = document.querySelector('pnip-mpa-processos .br-table table');
   if (!t) return [];
   const k = [...t.querySelectorAll('thead th')].findIndex((x) => x.textContent.trim() === 'Solicitante');
   return [...t.querySelectorAll('tbody tr')].map((tr) => tr.children[k].textContent.replace(/\s+/g, ' ').trim());
});

const MEDIDAS = {
   // 01: seta "Página anterior" ausente (inicial; Concluídos p. 1 e p. 2; Aguardando análise)
   'M-01': async (p) => {
      const r = {inicial: await setas(p)};
      await aba(p, 'Concluídos');
      r.concluidosP1 = await setas(p);
      await p.locator('govbr-custom-pagination button[aria-label="Página seguinte"]').click();
      await p.waitForTimeout(1500);
      r.concluidosP2 = await setas(p);
      r.paginaDepoisDeSeguinte = await paginaAtual(p);
      r.numerosP2 = await p.evaluate(() => [...document.querySelectorAll('govbr-custom-pagination nav.br-pagination.small a.page')].map((a) => a.textContent.trim()));
      await aba(p, 'Aguardando análise');
      r.aguardando = await setas(p);
      return r;
   },
   // 02 (= F2 M-01): avatar sem a classe content
   'M-02': async (p) => p.evaluate(() => {
      const el = document.querySelector('button#avatar-dropdown-trigger span.br-avatar > span');
      return {classe: el.className, ...__r(el), ...__cs(el, ['display', 'border-radius', 'background-color', 'font-size'])};
   }),
   // 03: × da etiqueta do filtro escolhido igual por fora, mas clicar não remove
   'M-03': async (p) => {
      await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Status'}).click();
      await p.waitForTimeout(400);
      const opcao = p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').first();
      const rotuloOpcao = (await opcao.textContent()).trim();
      await opcao.click();
      await p.waitForTimeout(1500);
      const sel = 'pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction';
      const estado = () => p.evaluate((s) => ({etiquetas: [...document.querySelectorAll(s)].map((x) => x.textContent.trim()), linhas: document.querySelectorAll('pnip-mpa-processos table tbody tr').length, vazio: !!document.querySelector('pnip-mpa-processos .mt-5.text-center p')}), sel);
      const x = p.locator(sel + ' > button').first();
      const botao = await x.evaluate((b) => { b.focus(); return {classe: b.className, ...__r(b), ...__cs(b, ['border-radius', 'background-color', 'border-top-style', 'cursor']), tabIndex: b.tabIndex, disabled: b.disabled, focavel: document.activeElement === b}; });
      const comFiltro = await estado();
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1500);
      const depoisDeEnter = await estado();
      let depoisDeClicar = depoisDeEnter;
      if (depoisDeEnter.etiquetas.length) {
         await x.click();
         await p.waitForTimeout(1500);
         depoisDeClicar = await estado();
      }
      return {rotuloOpcao, botao, comFiltro, depoisDeEnter, depoisDeClicar};
   },
   // 04: nome comprido na 1ª linha de Tramitando, cortado sem reticências e sem title
   'M-04': async (p) => {
      const celulas = await p.evaluate(() => {
         const t = document.querySelector('pnip-mpa-processos .br-table table');
         const k = [...t.querySelectorAll('thead th')].findIndex((x) => x.textContent.trim() === 'Solicitante');
         return [...t.querySelectorAll('tbody tr')].map((tr) => {
            const td = tr.children[k];
            return {texto: td.textContent.replace(/\s+/g, ' ').trim(), classe: td.className, ...__cs(td, ['max-width', 'overflow-x', 'white-space', 'text-overflow']), scrollW: td.scrollWidth, clientW: td.clientWidth, cortada: td.scrollWidth > td.clientWidth,
               title: td.getAttribute('title'), titleDentro: [...td.querySelectorAll('[title]')].length, aria: td.getAttribute('aria-label')};
         });
      });
      const porAba = {inicial: await nomesSolicitante(p)};
      for (const a of ['Aguardando análise', 'Concluídos', 'Tramitando']) { await aba(p, a); porAba[a] = await nomesSolicitante(p); }
      return {linha1: celulas[0], celulasCortadas: celulas.filter((c) => c.cortada).length, nCelulas: celulas.length, celulas, porAba};
   },
   // 05: fundo da etiqueta "Meus processos" #1755A9 (inline) em vez de #1351B4
   'M-05': async (p) => {
      const ler = () => p.evaluate(() => {
         const t = [...__proc().querySelectorAll('span.br-tag.interaction')].find((x) => x.textContent.trim() === 'Meus processos');
         return {estilo: t.getAttribute('style'), ...__cs(t, ['background-color', 'color']), classe: t.className};
      });
      const ativa = await ler();
      await p.locator('pnip-mpa-processos span.br-tag.interaction', {hasText: 'Meus processos'}).click();
      await p.waitForTimeout(1500);
      return {ativa, desativada: await ler()};
   },
   // 06: raio da seta "Página seguinte" 7px em vez de circular
   'M-06': async (p) => {
      await p.locator('govbr-custom-pagination nav.br-pagination').first().scrollIntoViewIfNeeded();
      return (await setas(p)).find((b) => b.rotulo === 'Página seguinte');
   },
   // 07: último item do breadcrumb ("Processos") renderizado como link para a própria página
   'M-07': async (p) => p.evaluate(() => {
      const sr = __proc().querySelector('br-breadcrumb').shadowRoot;
      const lis = [...sr.querySelectorAll('li.crumb')];
      const ult = lis.at(-1);
      const a = ult.querySelector('a');
      return {n: lis.length, texto: ult.textContent.trim(), dataActive: ult.getAttribute('data-active'), temLink: !!a, href: a?.getAttribute('href') ?? null, hrefAbs: a ? new URL(a.href).pathname : null, span: !!ult.querySelector(':scope > span'), cor: __cs(a ?? ult.querySelector('span'), ['color']).color};
   }),
   // 08 (= F2 M-05): rótulos das abas 16.8px
   'M-08': async (p) => p.evaluate(() => [...__proc().querySelector('br-tab').shadowRoot.querySelectorAll('li.tab-item > button')].map((b) => ({rotulo: b.textContent.trim(), ...__cs(b, ['font-size', 'font-weight'])}))),
   // 09: Exibir 25 e 50 mudam a tabela, mas o campo continua mostrando 10 (aba Concluídos, 14 itens)
   'M-09': async (p) => {
      await aba(p, 'Concluídos');
      const r = {antes: await exibirEstado(p)};
      await escolherExibir(p, '25'); r.depois25 = await exibirEstado(p);
      await escolherExibir(p, '50'); r.depois50 = await exibirEstado(p);
      await escolherExibir(p, '10'); r.depois10 = await exibirEstado(p);
      return r;
   },
   // 10 (= F2 M-09): os "Desassociar" desabilitados com opacidade 1
   'M-10': async (p) => p.evaluate(() => {
      const m = (b) => ({host: __cs(b, ['opacity']).opacity, botao: __cs(b.shadowRoot.querySelector('button'), ['opacity', 'cursor'])});
      const todos = [...__proc().querySelectorAll('table tbody br-button')].filter((b) => (b.getAttribute('title') ?? '').startsWith('Desassociar'));
      const des = todos.filter((b) => b.hasAttribute('disabled'));
      const limpar = document.querySelector('pnip-multiple-search-table-utils br-button[label="Limpar filtros"]');
      return {nDesabilitados: des.length, desabilitados: des.map(m), habilitado1: m(todos[0]), habilitado1Disabled: todos[0].hasAttribute('disabled'), limpar: {...m(limpar), disabled: limpar.hasAttribute('disabled')}};
   }),
   // 11 (= F2 M-06): "Aguardando análise" ativo com a lista de Tramitando
   'M-11': async (p) => {
      const ativo = await p.evaluate(() => [...__proc().querySelector('br-tab').shadowRoot.querySelectorAll('li.tab-item')].filter((li) => li.classList.contains('active')).map((li) => ({rotulo: li.textContent.trim(), cor: __cs(li.querySelector('button'), ['color']).color})));
      const conteudo = await conteudoTabela(p);
      await aba(p, 'Concluídos');
      const depoisConcluidos = await conteudoTabela(p);
      return {ativo, conteudo, depoisConcluidos, mudouAoClicarConcluidos: JSON.stringify(conteudo) !== JSON.stringify(depoisConcluidos)};
   },
   // 12: botão "Assinar selecionados" rotulado "Confirmar"; abre o diálogo de assinatura (cancelado, nunca assinado)
   'M-12': async (p) => {
      const botoes = () => p.evaluate(() => [...__proc().querySelectorAll('div.mt-3 > br-button')].map((b) => ({label: b.getAttribute('label'), icon: b.getAttribute('icon'), type: b.getAttribute('type'), texto: b.shadowRoot?.querySelector('button')?.textContent.trim()})));
      const antes = await botoes();
      const chk = p.locator('pnip-mpa-processos table tbody input[type=checkbox]').first();
      await chk.check();
      await p.waitForTimeout(600);
      const depoisDeMarcar = await botoes();
      await p.locator('pnip-mpa-processos div.mt-3 > br-button button').click();
      await p.waitForTimeout(800);
      const dialogo = await p.evaluate(() => ({titulo: document.querySelector('.swal2-title')?.textContent ?? null, botoes: [...document.querySelectorAll('.swal2-actions button')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => b.textContent)}));
      await p.locator('.swal2-cancel').click();
      await p.waitForTimeout(800);
      const fechou = await p.evaluate(() => !document.querySelector('.swal2-container'));
      return {antes, depoisDeMarcar, dialogo, fechouAoCancelar: fechou};
   },
};

const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ok = {
   'M-01': (a, d) => {
      const rot = (l) => l.map((b) => b.rotulo).join();
      return rot(a.inicial) === 'Página anterior,Página seguinte' && rot(d.inicial) === 'Página seguinte'
         && rot(a.concluidosP1) === 'Página anterior,Página seguinte' && rot(d.concluidosP1) === 'Página seguinte'
         && a.paginaDepoisDeSeguinte === '2' && d.paginaDepoisDeSeguinte === '2'
         && rot(a.concluidosP2) === 'Página anterior,Página seguinte' && a.concluidosP2[0].desabilitado === false && rot(d.concluidosP2) === 'Página seguinte'
         && igual(a.numerosP2, d.numerosP2) && rot(d.aguardando) === 'Página seguinte' && rot(a.aguardando) === 'Página anterior,Página seguinte';
   },
   'M-02': (a, d) => a.classe.split(' ').includes('content') && near(a.w, 40) && near(a.h, 40) && a.display === 'flex' && a['border-radius'] === '50%' && a['background-color'] === 'rgb(255, 140, 0)' && a['font-size'] === '24.192px'
      && !d.classe.split(' ').includes('content') && d.w > 10 && d.w < 26 && near(d.h, 40, 3) && d.display === 'block' && d['border-radius'] === '0px' && d['background-color'] === a['background-color'] && d['font-size'] === a['font-size'],
   'M-03': (a, d) => {
      const bOk = (b) => b.classe === 'br-button inverted circle' && near(b.w, 28) && near(b.h, 28) && b['border-radius'] === '50%' && b['background-color'] === 'rgb(19, 81, 180)' && b.tabIndex === 0 && !b.disabled && b.focavel;
      return a.rotuloOpcao === 'Aguardando análise' && d.rotuloOpcao === a.rotuloOpcao && bOk(a.botao) && bOk(d.botao) && igual(a.botao, d.botao)
         && igual(a.comFiltro, d.comFiltro) && a.comFiltro.etiquetas.length === 1
         && a.depoisDeEnter.etiquetas.length === 0 && a.depoisDeEnter.linhas > 0
         && d.depoisDeEnter.etiquetas.length === 1 && igual(d.depoisDeClicar, d.comFiltro);
   },
   'M-04': (a, d) => {
      const L = d.linha1, A = a.linha1;
      return L.texto.startsWith(LONGO) && L.classe === 'solicitante' && L['max-width'] === '150px' && L['overflow-x'] === 'hidden' && L['white-space'] === 'nowrap' && L['text-overflow'] === 'clip' && L.cortada && L.title === null && L.titleDentro === 0
         && A.texto.startsWith(ORIGINAL + ' ') && A['max-width'] === 'none' && A['white-space'] === 'normal' && !A.cortada && A.title === null
         && d.porAba.Tramitando[0].startsWith(LONGO) && d.porAba.Tramitando.slice(1).every((x) => !x.includes('Comprido'))
         && !d.porAba['Aguardando análise'].some((x) => x.includes('Comprido')) && !d.porAba['Concluídos'].some((x) => x.includes('Comprido'))
         && igual(d.porAba['Concluídos'], a.porAba['Concluídos']) && igual(d.porAba['Aguardando análise'], a.porAba['Aguardando análise'])
         && igual(d.porAba.Tramitando.map(normNome), a.porAba.Tramitando);
   },
   'M-05': (a, d) => a.ativa['background-color'] === 'rgb(19, 81, 180)' && !/background/.test(a.ativa.estilo ?? '')
      && d.ativa['background-color'] === 'rgb(23, 85, 169)' && /background-color: rgb\(23, 85, 169\)/.test(d.ativa.estilo ?? '')
      && a.ativa.color === d.ativa.color && igual(a.desativada, d.desativada),
   'M-06': (a, d) => a.raio === '50%' && d.raio === '7px' && /border-radius: 7px/.test(d.estilo ?? '') && near(a.w, 40) && near(d.w, 40) && near(a.h, 40) && near(d.h, 40),
   'M-07': (a, d) => a.n === 2 && d.n === 2 && a.texto === 'Processos' && d.texto === 'Processos' && a.dataActive === 'active' && !a.temLink && a.span
      && d.dataActive === null && d.temLink && d.href === 'portal-mpa/processos' && d.hrefAbs === '/pnip-f3/portal-mpa/processos',
   'M-08': (a, d) => a.length === 3 && d.length === 3 && a.every((x) => x['font-size'] === '20.16px' && x['font-weight'] === '500') && d.every((x) => x['font-size'] === '16.8px' && x['font-weight'] === '500'),
   'M-09': (a, d) => {
      const sem = (x) => { const {campo, ...resto} = x; return resto; };
      return a.antes.campo === '10' && d.antes.campo === '10'
         && a.depois25.campo === '25' && d.depois25.campo === '10' && a.depois50.campo === '50' && d.depois50.campo === '10' && a.depois10.campo === '10' && d.depois10.campo === '10'
         && a.antes.linhas === 10 && a.depois25.linhas === 14 && a.depois50.linhas === 14 && a.depois10.linhas === 10
         && igual(sem(a.antes), sem(d.antes)) && igual(sem(a.depois25), sem(d.depois25)) && igual(sem(a.depois50), sem(d.depois50)) && igual(sem(a.depois10), sem(d.depois10))
         && igual(a.depois25.selecionado, ['25']) && igual(a.depois50.selecionado, ['50']);
   },
   'M-10': (a, d) => {
      const op = (x, v) => x.host === v && x.botao.opacity === v;
      return a.nDesabilitados === 8 && d.nDesabilitados === 8 && a.desabilitados.every((x) => op(x, '0.45') && x.botao.cursor === 'not-allowed') && d.desabilitados.every((x) => op(x, '1') && x.botao.cursor === 'not-allowed')
         && !a.habilitado1Disabled && op(a.habilitado1, '1') && op(d.habilitado1, '1') && a.limpar.disabled && d.limpar.disabled && op(a.limpar, '0.45') && op(d.limpar, '0.45');
   },
   'M-11': (a, d) => {
      const n = (c) => ({...c, linhas: c.linhas.map(normNome)});
      return a.ativo.length === 1 && a.ativo[0].rotulo === 'Tramitando' && a.ativo[0].cor === 'rgb(12, 50, 111)' && d.ativo.length === 1 && d.ativo[0].rotulo === 'Aguardando análise'
         && a.conteudo.tag.includes('Meus processos') && a.conteudo.ths.some((t) => t.includes('Analista')) && a.conteudo.ths.some((t) => t.includes('Téc. Adm.'))
         && igual(n(a.conteudo), n(d.conteudo)) && a.mudouAoClicarConcluidos && d.mudouAoClicarConcluidos && igual(a.depoisConcluidos, d.depoisConcluidos);
   },
   'M-12': (a, d) => a.antes.length === 0 && d.antes.length === 0
      && a.depoisDeMarcar.length === 1 && a.depoisDeMarcar[0].label === 'Assinar selecionados' && a.depoisDeMarcar[0].texto === 'Assinar selecionados'
      && d.depoisDeMarcar.length === 1 && d.depoisDeMarcar[0].label === 'Confirmar' && d.depoisDeMarcar[0].texto === 'Confirmar'
      && a.depoisDeMarcar[0].icon === 'check' && d.depoisDeMarcar[0].icon === 'check' && a.depoisDeMarcar[0].type === 'primary' && d.depoisDeMarcar[0].type === 'primary'
      && a.dialogo.titulo === 'Confirma a assinatura de 1 processo(s)?' && igual(a.dialogo, d.dialogo) && igual(a.dialogo.botoes, ['Assinar', 'Cancelar']) && a.fechouAoCancelar && d.fechouAoCancelar,
};

const sA = await servir(dirAntes, 4731), sD = await servir(dirDepois, 4732);
const browser = await chromium.launch({headless: true});
const res = {};
try {
   for (const id of ids) {
      const val = {};
      for (const [rot, base] of [['antes', sA.base], ['depois', sD.base]]) {
         const {ctx, pagina, eventos} = await abrir(browser, base);
         await pagina.evaluate(PREP);
         try { val[rot] = await MEDIDAS[id](pagina); } catch (e) { val[rot] = {erro: String(e)}; }
         val[rot + 'Eventos'] = eventos;
         await ctx.close();
      }
      let passou = false;
      try { passou = !!ok[id](val.antes, val.depois); } catch (e) { val.erroCriterio = String(e); }
      res[id] = {passou, ...val};
      console.log(id, passou ? 'PASSOU' : 'FALHOU');
   }
} finally {
   await browser.close();
   sA.s.close(); sD.s.close();
}
await writeFile(saida, JSON.stringify(res, null, 1));
