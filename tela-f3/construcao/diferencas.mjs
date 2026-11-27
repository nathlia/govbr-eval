// Uso: node diferencas.mjs <dirA> <dirB> <saida.json>
// Em cada estado, nos dois builds (contexto novo por estado e por build): DOM da rota (com shadow roots abertos),
// valor/marcação dos inputs e TODOS os estilos computados de cada elemento. Alinha os elementos por descritor
// estável (LCS) e atribui cada diferença a uma mudança pela região onde cai. O que não cai em região nenhuma é
// "sem atribuição". Adaptado da F2: estados novos (página 2, Exibir 25/50, linha marcada, × clicado), região por
// coluna (Solicitante) e, quando um elemento cai em regiões aninhadas, vale a mais interna.
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir, LISTAR, alinhar} from './comum.mjs';

const [dirA, dirB, saida] = process.argv.slice(2);

const aba = async (p, rotulo) => { await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: rotulo}).click(); await p.waitForTimeout(1500); };
const filtroStatus = async (p) => {
   await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Status'}).click();
   await p.waitForTimeout(400);
   await p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').first().click();
   await p.waitForTimeout(1500);
};
const descansar = async (p) => { await p.mouse.move(1, 1); await p.waitForTimeout(300); };
const exibir = async (p, v) => {
   const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
   await sel.scrollIntoViewIfNeeded();
   await sel.locator('button[aria-label="Exibir lista"]').click();
   await p.waitForTimeout(500);
   if (v) { await sel.locator('div.br-list div.br-item', {hasText: new RegExp(`^\\s*${v}\\s*$`)}).click(); await p.waitForTimeout(1500); }
};
const xClicar = async (p) => {
   await p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction > button').first().click();
   await p.waitForTimeout(1500);
};

// Estado: função (igual nos dois lados) ou {A, B} (preparos diferentes) + regiões próprias, se houver.
const ESTADOS = {
   inicial: async () => {},
   'rolado-hover-voltar': async (p) => {
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(300);
      await p.locator('pnip-mpa-processos br-button[label="Voltar"] button').hover();
      await p.waitForTimeout(500);
   },
   'exibir-aberto': async (p) => { await exibir(p, null); },
   'filtro-status-escolhido': async (p) => { await filtroStatus(p); await descansar(p); },
   'concluidos-pagina-2': async (p) => {
      await aba(p, 'Concluídos');
      await p.locator('govbr-custom-pagination button[aria-label="Página seguinte"]').click();
      await p.waitForTimeout(1500);
      await descansar(p);
   },
   'concluidos-exibir-25': async (p) => { await aba(p, 'Concluídos'); await exibir(p, '25'); await descansar(p); },
   'concluidos-exibir-50': async (p) => { await aba(p, 'Concluídos'); await exibir(p, '25'); await exibir(p, '50'); await descansar(p); },
   'linha-marcada-confirmar': async (p) => {
      await p.locator('pnip-mpa-processos table tbody input[type=checkbox]').first().check();
      await p.waitForTimeout(600);
      await descansar(p);
   },
   // A: sem semente com o filtro escolhido, SEM clicar no ×; B: semeada, filtro escolhido e × clicado.
   // Se o × da semeada não faz nada, sobram só as diferenças das outras mudanças.
   'filtro-x-clicado-vs-filtro': {A: async (p) => { await filtroStatus(p); await descansar(p); }, B: async (p) => { await filtroStatus(p); await xClicar(p); await descansar(p); }},
   // Os dois lados clicam no ×: na sem semente o filtro sai e a lista volta; na semeada nada muda. Tudo o que
   // está no conteúdo da tela (abaixo das abas) é consequência de M-03.
   'filtro-x-clicado': {A: async (p) => { await filtroStatus(p); await xClicar(p); await descansar(p); }, B: async (p) => { await filtroStatus(p); await xClicar(p); await descansar(p); },
      regioes: [['M-02', 'button#avatar-dropdown-trigger span.br-avatar > span'], ['M-07', 'pnip-mpa-processos br-breadcrumb'], ['M-08|M-11', 'pnip-mpa-processos br-tab'],
         ['M-05', 'pnip-mpa-processos div.tab-panel > div.col > div.row:first-child > div.col-auto > span.br-tag'], ['M-03', 'pnip-mpa-processos > div.p-5']]},
};

// Regiões: [id, seletor, tipo]. 'col:Solicitante' = células e cabeçalho dessa coluna da tabela da tela.
// tipo 'geom': a região só conta para propriedades de geometria (largura/altura) — a tabela redistribui as colunas.
const REGIOES = [
   ['M-01', 'govbr-custom-pagination nav.br-pagination.small > ul'],
   ['M-02', 'button#avatar-dropdown-trigger span.br-avatar > span'],
   ['M-03', 'pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center)'],
   ['M-04', 'col:Solicitante'],
   ['M-04', 'pnip-mpa-processos .br-table', 'geom'],
   ['M-05', 'pnip-mpa-processos div.tab-panel > div.col > div.row:first-child > div.col-auto > span.br-tag'],
   ['M-06', 'govbr-custom-pagination nav.br-pagination.small button[aria-label="Página seguinte"]'],
   ['M-07', 'pnip-mpa-processos br-breadcrumb'],
   ['M-08|M-11', 'pnip-mpa-processos br-tab'],
   ['M-09', 'govbr-custom-pagination br-select-pnip[label="Exibir"] input#total'],
   ['M-10', 'pnip-mpa-processos table tbody br-button[disabled]'],
   ['M-12', 'pnip-mpa-processos div.mt-3 > br-button'],
   // O hospedeiro govbr-custom-pagination recebe os dois atributos estáticos nextButtonRadius (M-06) e
   // fixedPageSizeLabel (M-09). Tipo 'proprio-dom': só a diferença de atributos do próprio elemento.
   ['M-06+M-09', 'pnip-mpa-processos govbr-custom-pagination', 'proprio-dom'],
];

// Para cada elemento listado (mesma ordem de LISTAR): regiões que o contêm (com a distância até a raiz) e
// regiões de que é ancestral.
const MARCAR = (regioes) => {
   const raizes = [];
   for (const [id, sel, tipo] of regioes) {
      if (sel.startsWith('col:')) {
         const t = document.querySelector('pnip-mpa-processos .br-table table');
         if (!t) continue;
         const k = [...t.querySelectorAll('thead th')].findIndex((x) => x.textContent.trim() === sel.slice(4));
         if (k < 0) continue;
         for (const tr of t.querySelectorAll('tr')) if (tr.children[k]) raizes.push([id, tr.children[k], tipo ?? 'tudo']);
      } else for (const el of document.querySelectorAll(sel)) raizes.push([id, el, tipo ?? 'tudo']);
   }
   const pai = (n) => n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentElement;
   const out = [];
   const andar = (el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'head') return;
      const dentro = [], acima = new Set();
      for (const [id, r, tipo] of raizes) {
         let d = 0;
         for (let n = el; n; n = pai(n), d++) if (n === r) { dentro.push([id, d, tipo]); break; }
         if (tipo !== 'proprio-dom') for (let n = pai(r); n; n = pai(n)) if (n === el) { acima.add(id); break; }
      }
      out.push({dentro, acima: [...acima]});
      if (el.shadowRoot) for (const c of el.shadowRoot.children) andar(c);
      for (const c of el.children) andar(c);
   };
   andar(document.documentElement);
   return out;
};

const GEOM = new Set(['width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin', 'min-height', 'min-width', 'max-height', 'max-width']);
// Em br-tab (M-08 e M-11 no mesmo componente): tipografia e tamanho → M-08; estado ativo → M-11.
const M08 = new Set(['--font-size-scale-up-02', 'font-size', 'line-height', 'width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end', 'min-height', 'min-width', 'margin-top', 'margin-bottom', 'margin-block-start', 'margin-block-end']);

function atribuir(prop, marca, tipo, attrB = '') {
   const geom = tipo === 'estilo' && GEOM.has(prop);
   const validas = marca.dentro.filter(([, d, t]) => t === 'tudo' || (t === 'geom' && geom) || (t === 'proprio-dom' && d === 0 && tipo === 'dom'));
   let ids;
   if (validas.length) {
      const min = Math.min(...validas.map(([, d]) => d));
      // regiões aninhadas: vale a mais interna; para geometria, valem todas as que contêm o elemento
      ids = [...new Set((geom ? validas : validas.filter(([, d]) => d === min)).map(([id]) => id))];
   } else ids = geom ? marca.acima.map((x) => '^' + x) : [];
   const out = new Set();
   for (const id of ids) {
      if (id.endsWith('M-08|M-11')) {
         const pre = id.startsWith('^') ? '^' : '';
         if (tipo === 'estilo') out.add(pre + (M08.has(prop) ? 'M-08' : 'M-11'));
         else out.add(/--font-size-scale-up-02/.test(attrB) ? 'M-08' : 'M-11');
      } else out.add(id);
   }
   return [...out].sort();
}

const sA = await servir(dirA, 4731), sB = await servir(dirB, 4732);
const browser = await chromium.launch({headless: true});
const res = {estados: {}};
try {
   for (const [nome, est] of Object.entries(ESTADOS)) {
      const regioes = est.regioes ?? REGIOES;
      const lado = {};
      for (const [rot, base] of [['A', sA.base], ['B', sB.base]]) {
         const {ctx, pagina, eventos} = await abrir(browser, base);
         await (typeof est === 'function' ? est : est[rot])(pagina);
         const lista = await pagina.evaluate(LISTAR, true);
         const marcas = await pagina.evaluate(MARCAR, regioes);
         lado[rot] = {lista, marcas, eventos};
         await ctx.close();
      }
      const {lista: A, marcas: mA} = lado.A, {lista: B, marcas: mB} = lado.B;
      const {pares, soA, soB} = alinhar(A, B);
      const difs = [];
      for (const i of soA) difs.push({tipo: 'dom', o: 'elemento só em A', caminho: A[i].caminho, desc: A[i].desc, attrs: A[i].attrs, m: atribuir(null, mA[i], 'dom')});
      for (const j of soB) difs.push({tipo: 'dom', o: 'elemento só em B', caminho: B[j].caminho, desc: B[j].desc, attrs: B[j].attrs, m: atribuir(null, mB[j], 'dom')});
      for (const [i, j] of pares) {
         const vistos = new Set();
         const dentro = [...mA[i].dentro, ...mB[j].dentro].filter(([id, d, t]) => { const k = id + d + t; if (vistos.has(k)) return false; vistos.add(k); return true; });
         const marca = {dentro, acima: [...new Set([...mA[i].acima, ...mB[j].acima])]};
         if (A[i].attrs !== B[j].attrs) difs.push({tipo: 'dom', o: 'atributos', caminho: B[j].caminho, desc: B[j].desc, a: A[i].attrs, b: B[j].attrs, m: atribuir(null, marca, 'dom', B[j].attrs)});
         const ea = A[i].estilos, eb = B[j].estilos;
         for (const k of new Set([...Object.keys(ea), ...Object.keys(eb)])) {
            if (ea[k] !== eb[k]) difs.push({tipo: 'estilo', prop: k, caminho: B[j].caminho, desc: B[j].desc, a: ea[k], b: eb[k], m: atribuir(k, marca, 'estilo')});
         }
      }
      // Regiões que mudaram de tamanho por dentro (diferença de altura/largura num elemento da própria região).
      const cresceu = new Set();
      for (const d of difs) if (d.tipo === 'estilo' && ['height', 'width', 'block-size', 'inline-size'].includes(d.prop)) for (const m of d.m) if (!m.startsWith('^')) cresceu.add(m);
      for (const d of difs) {
         if (!d.m.some((m) => m.startsWith('^'))) continue;
         const cand = d.m.map((m) => m.slice(1));
         const f = cand.filter((m) => cresceu.has(m));
         d.candidatasAncestral = cand;
         d.m = f.length ? f : cand;
         d.viaAncestral = true;
      }
      const porM = {};
      for (const d of difs) { const k = d.m.length ? d.m.join('+') : 'SEM-ATRIBUICAO'; porM[k] = (porM[k] ?? 0) + 1; }
      res.estados[nome] = {
         elementos: [A.length, B.length], pares: pares.length, soA: soA.length, soB: soB.length,
         eventos: {A: lado.A.eventos, B: lado.B.eventos},
         diferencas: difs.length, dom: difs.filter((d) => d.tipo === 'dom').length, estilo: difs.filter((d) => d.tipo === 'estilo').length, porMudanca: porM,
         semAtribuicao: difs.filter((d) => !d.m.length),
         todas: difs,
      };
      console.log(nome, JSON.stringify({elementos: [A.length, B.length], diferencas: difs.length, porM}));
   }
} finally {
   await browser.close();
   sA.s.close(); sB.s.close();
}
let total = 0, sem = 0;
for (const e of Object.values(res.estados)) { total += e.diferencas; sem += e.semAtribuicao.length; }
res.resumo = {total, semAtribuicao: sem};
console.log(JSON.stringify(res.resumo));
await writeFile(saida, JSON.stringify(res, null, 1));
