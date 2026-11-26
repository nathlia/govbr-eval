// Uso: node diferencas.mjs <dirA> <dirB> <saida.json> [--reservas]
// Em cada estado da lista, nos dois builds (contexto novo por estado): DOM da rota (com shadow roots abertos) e
// TODOS os estilos computados de cada elemento. Alinha os elementos por descritor estável (LCS) e atribui cada
// diferença a uma mudança pela região onde cai. O que não cai em região nenhuma é "sem atribuição".
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir, LISTAR, alinhar} from './comum.mjs';

const args = process.argv.slice(2);
const reservas = args.includes('--reservas');
const [dirA, dirB, saida] = args.filter((x) => !x.startsWith('--'));

const ESTADOS = {
   inicial: async () => {},
   'rolado-hover-voltar': async (p) => {
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(300);
      await p.locator('pnip-mpa-processos br-button[label="Voltar"] button').hover();
      await p.waitForTimeout(500);
   },
   'exibir-aberto': async (p) => {
      const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
      await sel.scrollIntoViewIfNeeded();
      await sel.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
   },
   'filtro-status-escolhido': async (p) => {
      await p.locator('pnip-multiple-search-table-utils span.br-tag.interaction', {hasText: 'Status'}).click();
      await p.waitForTimeout(400);
      await p.locator('pnip-multiple-search-table-utils div.br-list .br-item .br-radio').first().click();
      await p.waitForTimeout(1500);
      await p.mouse.move(1, 1);
      await p.waitForTimeout(300);
   },
};
if (reservas) {
   ESTADOS['busca-focada'] = async (p) => {
      await p.locator('pnip-search-table-utils br-input#search input').click();
      await p.waitForTimeout(400);
   };
   ESTADOS['exibir-aberto-hover-25'] = async (p) => {
      const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
      await sel.scrollIntoViewIfNeeded();
      await sel.locator('button[aria-label="Exibir lista"]').click();
      await p.waitForTimeout(500);
      await sel.locator('div.br-list div.br-item', {hasText: /^\s*25\s*$/}).hover();
      await p.waitForTimeout(500);
   };
   ESTADOS['rolado'] = async (p) => {
      await p.evaluate(() => window.scrollTo(0, 600));
      await p.waitForTimeout(500);
   };
}

// Regiões: raiz (seletor em light DOM ou "host >>> seletor" para shadow) → mudança. Subárvore composta da raiz.
const REGIOES = [
   ['M-01', 'button#avatar-dropdown-trigger span.br-avatar > span'],
   ['M-02', 'pnip-mpa-processos br-breadcrumb'],
   ['M-03', 'pnip-mpa-processos br-divider'],
   ['M-04', 'pnip-mpa-processos h2'],
   ['M-05|M-06', 'pnip-mpa-processos br-tab'],
   ['M-07', 'pnip-mpa-processos span.br-tag.interaction span.text-truncate'],
   ['M-08', 'pnip-mpa-processos br-button[label="Voltar"]'],
   ['M-09', 'pnip-mpa-processos table tbody br-button[disabled]'],
   ['M-10', 'govbr-custom-pagination br-select-pnip div.br-select > div.br-list'],
   ['M-11', 'govbr-custom-pagination nav.br-pagination.small > ul'],
   ['M-12', 'pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center)'],
   ['R-01', 'br-header'],
   ['R-02', 'pnip-search-table-utils div.br-input > button.br-button[aria-label="Buscar"]'],
   ['R-03', 'pnip-search-table-utils br-input#search'],
   ['R-04', 'govbr-custom-pagination br-select-pnip div.br-list > div.br-item'],
].filter(([id]) => reservas || !id.startsWith('R-'));

// Marca, para cada elemento listado (mesma ordem de LISTAR), as regiões que o contêm e as regiões de que é ancestral.
const MARCAR = (regioes) => {
   const raizes = [];
   for (const [id, sel] of regioes) for (const el of document.querySelectorAll(sel)) raizes.push([id, el]);
   const pai = (n) => n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentElement;
   const out = [];
   const andar = (el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'head') return;
      const dentro = new Set(), acima = new Set();
      for (const [id, r] of raizes) {
         for (let n = el; n; n = pai(n)) if (n === r) { dentro.add(id); break; }
         for (let n = pai(r); n; n = pai(n)) if (n === el) { acima.add(id); break; }
      }
      out.push({dentro: [...dentro], acima: [...acima]});
      if (el.shadowRoot) for (const c of el.shadowRoot.children) andar(c);
      for (const c of el.children) andar(c);
   };
   andar(document.documentElement);
   return out;
};

// Propriedades que mudam num ancestral só porque o tamanho de um descendente mudou.
const GEOM = new Set(['width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin', 'min-height', 'min-width', 'max-height', 'max-width']);
// Em br-tab (M-05 e M-06 no mesmo componente): tipografia e tamanho → M-05; estado ativo → M-06.
const M05 = new Set(['--font-size-scale-up-02', 'font-size', 'line-height', 'width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end', 'min-height', 'min-width', 'margin-top', 'margin-bottom', 'margin-block-start', 'margin-block-end']);

function atribuir(prop, marca, tipo, attrB = '') {
   // tipo: 'estilo' | 'dom'. Diferença de geometria num ancestral: candidata cada região que ele contém
   // (filtrada depois às que mudaram de tamanho por dentro).
   const ids = marca.dentro.length ? marca.dentro : (tipo === 'estilo' && GEOM.has(prop) ? marca.acima.map((x) => '^' + x) : []);
   const out = new Set();
   for (const id of ids) {
      if (id.endsWith('M-05|M-06')) {
         const pre = id.startsWith('^') ? '^' : '';
         if (tipo === 'estilo') out.add(pre + (M05.has(prop) ? 'M-05' : 'M-06'));
         else out.add(/--font-size-scale-up-02/.test(attrB) ? 'M-05' : 'M-06');
      } else out.add(id);
   }
   return [...out].sort();
}

const sA = await servir(dirA, 4731), sB = await servir(dirB, 4732);
const browser = await chromium.launch({headless: true});
const res = {estados: {}};
try {
   for (const [nome, preparar] of Object.entries(ESTADOS)) {
      const lado = {};
      for (const [rot, base] of [['A', sA.base], ['B', sB.base]]) {
         const {ctx, pagina, eventos} = await abrir(browser, base);
         await preparar(pagina);
         const lista = await pagina.evaluate(LISTAR, true);
         const marcas = await pagina.evaluate(MARCAR, REGIOES);
         lado[rot] = {lista, marcas, eventos};
         await ctx.close();
      }
      const {lista: A, marcas: mA} = lado.A, {lista: B, marcas: mB} = lado.B;
      const {pares, soA, soB} = alinhar(A, B);
      const difs = [];
      for (const i of soA) difs.push({tipo: 'dom', o: 'elemento só em A', caminho: A[i].caminho, desc: A[i].desc, attrs: A[i].attrs, m: atribuir(null, mA[i], 'dom')});
      for (const j of soB) difs.push({tipo: 'dom', o: 'elemento só em B', caminho: B[j].caminho, desc: B[j].desc, attrs: B[j].attrs, m: atribuir(null, mB[j], 'dom')});
      for (const [i, j] of pares) {
         const marca = {dentro: [...new Set([...mA[i].dentro, ...mB[j].dentro])], acima: [...new Set([...mA[i].acima, ...mB[j].acima])]};
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
         diferencas: difs.length, porMudanca: porM,
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
