// Conferência de construção da tela F: para cada entrada de lista-de-mudancas.json, mede a conferência
// dela no build semeado e no sem semente (Playwright headless 1280x900, sem oráculo e sem axe), confere
// que a página continua funcionando e atribui cada diferença de DOM/estilo computado a uma entrada.
// Uso: node conferir-construcao.mjs   → conferencia-construcao.json, diferencas-atribuidas.json,
//      funcionamento.json, capturas/<estado>-<build>.png
import {writeFile, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, PNG, pixelmatch, servir, abrir, ARVORES, ESTADOS, ROTA} from './comum.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CAPTURAS = join(AQUI, 'capturas');
await mkdir(CAPTURAS, {recursive: true});

// ---------- medidas por entrada (rodam na página) ----------
const MEDIR = {
   'F-01': () => {
      const ths = [...document.querySelectorAll('pnip-mpa-processos div.br-table table thead th')];
      const idx = ths.findIndex((t) => t.textContent.trim() === 'Solicitante');
      const tds = [...document.querySelectorAll('pnip-mpa-processos div.br-table table tbody tr')].map((r) => r.children[idx]);
      return {coluna: idx, celulas: tds.map((td) => { const c = getComputedStyle(td); return {whiteSpace: c.whiteSpace, overflow: c.overflow, textOverflow: c.textOverflow, scrollWidth: td.scrollWidth, clientWidth: td.clientWidth}; })};
   },
   'F-02': () => {
      const host = document.querySelector('pnip-search-table-utils br-input');
      const campo = host.shadowRoot?.querySelector('input') ?? host.querySelector('input') ?? host;
      const btn = document.querySelector('pnip-search-table-utils div.br-input > button.br-button[aria-label="Buscar"]');
      const rc = campo.getBoundingClientRect(), rb = btn.getBoundingClientRect();
      return {campo: {top: rc.top, bottom: rc.bottom}, botao: {top: rb.top, bottom: rb.bottom}, centroBotaoMenosCentroCampo: Math.round(((rb.top + rb.bottom) / 2 - (rc.top + rc.bottom) / 2) * 10) / 10};
   },
   'F-03': () => {
      const cont = [...document.querySelectorAll('pnip-mpa-processos div.d-flex.justify-content-end')].find((d) => /Voltar/.test(d.textContent) || d.querySelector('br-button[label="Voltar"]'));
      const voltar = cont.firstElementChild;
      const pag = document.querySelector('govbr-custom-pagination');
      const pagina = document.querySelector('govbr-custom-pagination input#page');
      const rv = voltar.getBoundingClientRect(), rp = pag.getBoundingClientRect(), rpi = pagina.getBoundingClientRect();
      const inter = !(rv.right <= rpi.left || rpi.right <= rv.left || rv.bottom <= rpi.top || rpi.bottom <= rv.top);
      return {distanciaPaginacaoVoltar: Math.round((rv.top - rp.bottom) * 10) / 10, intersectaCampoPagina: inter, voltar: [rv.left, rv.top, rv.width, rv.height].map(Math.round), campoPagina: [rpi.left, rpi.top, rpi.width, rpi.height].map(Math.round)};
   },
   'F-04': () => {
      const cont = [...document.querySelectorAll('pnip-mpa-processos div.d-flex.justify-content-end')].find((d) => /Voltar/.test(d.textContent) || d.querySelector('br-button[label="Voltar"]'));
      const el = cont.firstElementChild;
      const alvo = el.shadowRoot?.querySelector('button') ?? el;
      const exp = document.querySelector('pnip-mpa-processos br-button[label="Exportar"]');
      const expBtn = exp.shadowRoot?.querySelector('button') ?? exp;
      return {elemento: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''), luzDom: !el.shadowRoot, texto: (alvo.innerText || el.getAttribute('label') || '').trim(), borderRadius: getComputedStyle(alvo).borderTopLeftRadius, exportarBorderRadius: getComputedStyle(expBtn).borderTopLeftRadius};
   },
   'F-05': () => {
      const tag = [...document.querySelectorAll('pnip-mpa-processos div.tab-panel span.br-tag.interaction')].find((t) => /Meus processos/.test(t.textContent));
      const vizinhas = [...document.querySelectorAll('pnip-multiple-search-table-utils span.br-tag.interaction')].map((t) => getComputedStyle(t).borderTopLeftRadius);
      return {meusProcessos: getComputedStyle(tag).borderTopLeftRadius, tagsDeFiltro: [...new Set(vizinhas)]};
   },
   'F-06': () => [...document.querySelectorAll('pnip-mpa-processos div.br-table thead th')].map((t) => ({th: t.textContent.trim(), bg: getComputedStyle(t).backgroundColor})),
   'F-07': () => {
      const c = document.querySelector('pnip-header button#avatar-dropdown-trigger span.br-avatar > span.content');
      return {borderRadius: getComputedStyle(c).borderTopLeftRadius};
   },
   'F-08': () => {
      const h = document.querySelector('pnip-multiple-search-table-utils br-button[label="Limpar filtros"]');
      const b = h.shadowRoot?.querySelector('button') ?? h;
      return {textTransform: getComputedStyle(b).textTransform, textoRenderizado: b.innerText.trim()};
   },
   'F-09': () => {
      const td = [...document.querySelectorAll('pnip-mpa-processos div.br-table table tbody td')].map((t) => { const c = getComputedStyle(t); return `${c.paddingTop}/${c.paddingRight}/${c.paddingBottom}/${c.paddingLeft}`; });
      const th = [...document.querySelectorAll('pnip-mpa-processos div.br-table table thead th')].map((t) => { const c = getComputedStyle(t); return `${c.paddingTop}/${c.paddingRight}/${c.paddingBottom}/${c.paddingLeft}`; });
      return {td: [...new Set(td)], nTd: td.length, th: [...new Set(th)]};
   },
   'F-10': () => {
      const l = document.querySelector('pnip-multiple-search-table-utils div.br-select > div.br-list');
      return l ? {boxShadow: getComputedStyle(l).boxShadow} : {boxShadow: null, erro: 'lista ausente'};
   },
   'F-11': () => {
      const tag = document.querySelector('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction');
      if (!tag) return {erro: 'tag ausente'};
      const btn = tag.querySelector(':scope > button.br-button.inverted.circle');
      const ico = tag.querySelector(':scope > i');
      const rot = tag.querySelector(':scope > span.text-truncate');
      const x = (e) => Math.round(e.getBoundingClientRect().left);
      return {botao: x(btn), icone: x(ico), rotulo: x(rot), ordemDom: [...tag.children].map((c) => c.tagName.toLowerCase())};
   },
   'F-12': () => {
      const sel = (id) => { const l = document.querySelector(`govbr-custom-pagination input#${id}`).closest('.br-select').querySelector('.br-list'); const i = l.querySelector('.br-item.selected'); const c = getComputedStyle(i); return {listaVisivel: getComputedStyle(l).display !== 'none', item: i.textContent.trim(), bg: c.backgroundColor, cor: getComputedStyle(i.querySelector('label') ?? i).color}; };
      return {exibir: sel('total'), pagina: sel('page')};
   },
};

const ESTADO_DE = {'F-10': 'filtro-aberto', 'F-11': 'filtro-escolhido', 'F-12': 'lista-exibir'};
const estadoDe = (id) => ESTADO_DE[id] ?? 'inicial';

const px = (s) => parseFloat(s);
// Veredito: [violado no semeado?, conforme no sem semente?]
const JULGAR = {
   'F-01': (s, u) => [s.celulas.every((c) => c.whiteSpace === 'nowrap' && c.overflow === 'hidden' && c.textOverflow === 'clip') && s.celulas.some((c) => c.scrollWidth > c.clientWidth),
      u.celulas.every((c) => c.whiteSpace === 'normal' && c.scrollWidth === c.clientWidth)],
   'F-02': (s, u) => [s.centroBotaoMenosCentroCampo >= 24 && s.centroBotaoMenosCentroCampo <= 30, Math.abs(u.centroBotaoMenosCentroCampo) <= 2],
   'F-03': (s, u) => [s.intersectaCampoPagina && s.distanciaPaginacaoVoltar < 0, !u.intersectaCampoPagina && Math.abs(u.distanciaPaginacaoVoltar - 24) <= 2],
   'F-04': (s, u) => [s.luzDom && s.elemento === 'button.br-button.secondary' && s.borderRadius === '4px' && s.texto === 'Voltar' && s.cliqueVolta && px(s.exportarBorderRadius) >= 100,
      px(u.borderRadius) >= 100 && u.cliqueVolta],
   'F-05': (s, u) => [px(s.meusProcessos) >= 16 && s.tagsDeFiltro.every((r) => r === '4px'), u.meusProcessos === '4px'],
   'F-06': (s, u) => [s.every((t) => (t.th === 'Téc. Adm.' ? t.bg === 'rgb(255, 255, 255)' : t.bg === 'rgb(240, 240, 240)')), u.every((t) => t.bg === 'rgb(240, 240, 240)')],
   'F-07': (s, u) => [s.borderRadius === '4px', u.borderRadius === '50%'],
   'F-08': (s, u) => [s.textTransform === 'uppercase', u.textTransform === 'none'],
   'F-09': (s, u) => [s.td.length === 1 && /^12px\/24px\/12px\/24px$/.test(s.td[0]) && s.th.every((t) => t === '16px/24px/16px/24px'), u.td.length === 1 && u.td[0] === '16px/24px/16px/24px'],
   'F-10': (s, u) => [s.boxShadow === 'none', u.boxShadow === 'rgba(0, 0, 0, 0.16) 0px 3px 6px 0px'],
   'F-11': (s, u) => [s.botao < s.icone && s.icone < s.rotulo && s.removeFiltro, u.icone < u.rotulo && u.rotulo < u.botao && u.removeFiltro],
   'F-12': (s, u) => [s.exibir.listaVisivel && s.exibir.bg === 'rgb(19, 81, 180)' && s.exibir.cor === 'rgb(255, 255, 255)' && s.pagina.bg === u.pagina.bg,
      u.exibir.listaVisivel && u.exibir.bg === 'rgb(38, 112, 232)'],
};

// ---------- extras interativos ----------
async function cliqueVolta(browser, base) {
   const {ctx, pagina} = await abrir(browser, base);
   const antes = pagina.url();
   const cont = pagina.locator('pnip-mpa-processos div.d-flex.justify-content-end', {hasText: 'Voltar'}).first();
   const alvo = (await pagina.locator('pnip-mpa-processos br-button[label="Voltar"]').count()) ? pagina.locator('pnip-mpa-processos br-button[label="Voltar"]') : cont.locator('button');
   await alvo.click();
   await pagina.waitForTimeout(800);
   const depois = pagina.url();
   await ctx.close();
   return antes !== depois;
}
async function removeFiltro(pagina) {
   const n0 = await pagina.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction').count();
   await pagina.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction button.br-button.inverted.circle').first().click();
   await pagina.waitForTimeout(800);
   const n1 = await pagina.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction').count();
   return n0 === 1 && n1 === 0;
}

// ---------- serialização com estilo computado e zonas de atribuição ----------
const SERIALIZAR = () => {
   const pai = (e) => e.parentElement ?? (e.getRootNode() instanceof ShadowRoot ? e.getRootNode().host : null);
   const ancs = (e) => { const out = []; for (let a = e; a; a = pai(a)) out.push(a); return out; };
   const proc = document.querySelector('pnip-mpa-processos');
   const ths = [...proc.querySelectorAll('div.br-table table thead th')];
   const idxSol = ths.findIndex((t) => t.textContent.trim() === 'Solicitante');
   const contVoltar = [...proc.querySelectorAll('div.d-flex.justify-content-end')].find((d) => /Voltar/.test(d.textContent) || d.querySelector('br-button[label="Voltar"]'));
   const raizes = {
      'F-01': [...proc.querySelectorAll('div.br-table table tbody tr')].map((r) => r.children[idxSol]),
      'F-02': [...document.querySelectorAll('pnip-search-table-utils div.br-input > button.br-button')],
      'F-03': [contVoltar],
      'F-04': [contVoltar?.firstElementChild],
      'F-05': [...proc.querySelectorAll('div.tab-panel span.br-tag.interaction')].filter((t) => /Meus processos/.test(t.textContent)),
      'F-06': ths.filter((t) => t.textContent.trim() === 'Téc. Adm.'),
      'F-07': [document.querySelector('pnip-header button#avatar-dropdown-trigger span.br-avatar > span.content')],
      'F-08': [document.querySelector('pnip-multiple-search-table-utils br-button[label="Limpar filtros"]')],
      'F-09': [...proc.querySelectorAll('div.br-table table tbody td')],
      'F-10': [...document.querySelectorAll('pnip-multiple-search-table-utils div.br-select > div.br-list')],
      'F-11': [...document.querySelectorAll('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction')],
      'F-12': [document.querySelector('govbr-custom-pagination input#total')?.closest('.pagination-per-page')],
   };
   const conjuntos = Object.fromEntries(Object.entries(raizes).map(([k, v]) => [k, new Set(v.filter(Boolean))]));
   const linhas = [];
   const andar = (n, prof) => {
      if (n.nodeType === 1) {
         const tag = n.tagName.toLowerCase();
         const anc = ancs(n);
         const zonas = Object.keys(conjuntos).filter((k) => anc.some((a) => conjuntos[k].has(a)));
         // ancestral de alguma raiz: diferenças de tamanho propagadas pelo layout
         const ancestralDe = Object.keys(conjuntos).filter((k) => [...conjuntos[k]].some((r) => r !== n && ancs(r).includes(n)));
         const cls = [...n.classList].sort().join('.');
         const chave = `${prof}|${tag}${n.id ? '#' + n.id : ''}${cls ? '.' + cls : ''}`;
         const attrs = [...n.attributes].map((a) => [a.name.replace(/^(_ngcontent|_nghost)-?[a-z0-9]{3,}-?c(\d+)$/, '$1-X-c$2'), a.value]).filter(([k]) => k !== 'class').sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}="${v}"`).join(' ');
         const texto = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.replace(/\s+/g, ' ').trim().replace(/(_ngcontent|_nghost)-[a-z0-9]{3,}-c(\d+)/g, '$1-X-c$2')).filter(Boolean).join(' ¦ ');
         const cs = getComputedStyle(n);
         const estilo = {};
         for (let i = 0; i < cs.length; i++) estilo[cs[i]] = cs.getPropertyValue(cs[i]);
         const r = n.getBoundingClientRect();
         linhas.push({chave, attrs, texto, estilo, caixa: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10), zonas, ancestralDe, desc: `${tag}${n.id ? '#' + n.id : ''}${cls ? '.' + cls : ''}`});
         if (tag === 'script' || tag === 'style') return;
         if (n.shadowRoot) for (const c of n.shadowRoot.childNodes) andar(c, prof + 1);
         for (const c of n.childNodes) andar(c, prof + 1);
      }
   };
   andar(document.documentElement, 0);
   return linhas;
};

const TAMANHO = new Set(['width', 'height', 'inline-size', 'block-size', 'transform-origin', 'perspective-origin', 'min-inline-size', 'min-block-size']);

function lcs(a, b) {
   const n = a.length, m = b.length;
   const dp = Array.from({length: n + 1}, () => new Uint16Array(m + 1));
   for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
   const pares = [], soA = [], soB = [];
   let i = 0, j = 0;
   while (i < n && j < m) {
      if (a[i] === b[j]) { pares.push([i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) soA.push(i++); else soB.push(j++);
   }
   while (i < n) soA.push(i++);
   while (j < m) soB.push(j++);
   return {pares, soA, soB};
}

function diferencas(estado, U, S) {
   const {pares, soA, soB} = lcs(U.map((l) => l.chave), S.map((l) => l.chave));
   const difs = [];
   const atribuir = (l1, l2, tipo) => {
      const z = [...new Set([...(l1?.zonas ?? []), ...(l2?.zonas ?? [])])];
      if (z.length) return z;
      // nomes de arquivo com hash (index.html cita runtime/main/styles novos): efeito de qualquer mudança no build
      const semHash = (t) => t?.replace(/\.[0-9a-f]{16}\.(js|css)/g, '.H.$1');
      if ((tipo === 'atributos' || tipo === 'texto') && l1 && l2 && semHash(l1.attrs) === semHash(l2.attrs) && semHash(l1.texto) === semHash(l2.texto)) return ['nomes com hash do build (todas as mudanças)'];
      // CSS compilado do componente da tela: a única diferença admitida é a regra da F-09
      const F09 = '.br-table[_ngcontent-X-c41] .table[_ngcontent-X-c41] tbody[_ngcontent-X-c41] td[_ngcontent-X-c41]{padding-top:12px!important;padding-bottom:12px!important}';
      if (tipo === 'texto' && l1 && l2 && l2.texto.includes(F09) && l2.texto.replace(F09, '') === l1.texto) return ['F-09'];
      if (tipo === 'tamanho') { const a = [...new Set([...(l1?.ancestralDe ?? []), ...(l2?.ancestralDe ?? [])])]; if (a.length) return a.map((x) => `${x} (propagação de layout)`); }
      return [];
   };
   for (const i of soA) difs.push({estado, tipo: 'so-no-sem-semente', elemento: U[i].desc, atribuida: atribuir(U[i], null, 'estrutura')});
   for (const j of soB) difs.push({estado, tipo: 'so-no-semeado', elemento: S[j].desc, atribuida: atribuir(null, S[j], 'estrutura')});
   for (const [i, j] of pares) {
      const u = U[i], s = S[j];
      if (u.attrs !== s.attrs) difs.push({estado, tipo: 'atributos', elemento: s.desc, semSemente: u.attrs, semeado: s.attrs, atribuida: atribuir(u, s, 'atributos')});
      if (u.texto !== s.texto) difs.push({estado, tipo: 'texto', elemento: s.desc, semSemente: u.texto, semeado: s.texto, atribuida: atribuir(u, s, 'texto')});
      const props = [...new Set([...Object.keys(u.estilo), ...Object.keys(s.estilo)])].filter((p) => u.estilo[p] !== s.estilo[p]);
      const estilo = props.filter((p) => !TAMANHO.has(p)), tam = props.filter((p) => TAMANHO.has(p));
      if (estilo.length) difs.push({estado, tipo: 'estilo', elemento: s.desc, propriedades: Object.fromEntries(estilo.map((p) => [p, [u.estilo[p], s.estilo[p]]])), atribuida: atribuir(u, s, 'estilo')});
      if (tam.length || u.caixa[2] !== s.caixa[2] || u.caixa[3] !== s.caixa[3]) difs.push({estado, tipo: 'tamanho', elemento: s.desc, caixa: [u.caixa, s.caixa], propriedades: Object.fromEntries(tam.map((p) => [p, [u.estilo[p], s.estilo[p]]])), atribuida: atribuir(u, s, 'tamanho')});
   }
   return difs;
}

// ---------- funcionamento (i) ----------
async function funcionamento(browser, base) {
   const {ctx, pagina: p, reg} = await abrir(browser, base);
   const linhas = () => p.locator('main .br-table tbody tr').count();
   const out = {inicial: await linhas()};
   await ESTADOS['filtro-escolhido'](p);
   out.comFiltro = await linhas();
   await p.locator('pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction button.br-button.inverted.circle').first().click();
   await p.waitForTimeout(800);
   out.semFiltro = await linhas();
   await p.locator('pnip-search-table-utils br-input input').click();
   await p.keyboard.type('000010');
   await p.waitForTimeout(1200);
   out.busca = await linhas();
   out.botaoLimparBusca = await p.locator('pnip-search-table-utils button[aria-label="Limpar"]').count();
   await p.locator('pnip-search-table-utils button[aria-label="Limpar"]').click();
   await p.waitForTimeout(1200);
   out.buscaLimpa = await linhas();
   await p.locator('span.br-tag.interaction', {hasText: 'Meus processos'}).click();
   await p.waitForTimeout(1200);
   out.todosOsProcessos = await linhas();
   out.paginaInfo1 = (await p.locator('govbr-custom-pagination .pagination-information').innerText()).replace(/\s+/g, ' ');
   await p.locator('govbr-custom-pagination button[aria-label="Página seguinte"]').click();
   await p.waitForTimeout(1200);
   out.pagina2 = await linhas();
   out.paginaInfo2 = (await p.locator('govbr-custom-pagination .pagination-information').innerText()).replace(/\s+/g, ' ');
   await ESTADOS['lista-exibir'](p);
   await p.locator('govbr-custom-pagination .br-select', {has: p.locator('input#total')}).locator('.br-item', {hasText: '25'}).click();
   await p.waitForTimeout(1500);
   out.exibir25 = await linhas();
   out.paginaInfo25 = (await p.locator('govbr-custom-pagination .pagination-information').innerText()).replace(/\s+/g, ' ');
   for (const aba of ['Aguardando análise', 'Concluídos']) {
      await p.locator('pnip-mpa-processos br-tab').getByText(aba, {exact: true}).first().click();
      await p.waitForTimeout(1500);
      out[`aba ${aba}`] = await linhas();
   }
   out.registro = reg;
   await ctx.close();
   return out;
}

// ---------- execução ----------
const browser = await chromium.launch({headless: true});
const servidores = {};
for (const [nome, dir] of Object.entries(ARVORES)) servidores[nome] = await servir(dir);
try {
   const medidas = {'sem-semente': {}, semeada: {}};
   const serial = {'sem-semente': {}, semeada: {}};
   const capturas = {};
   for (const estado of Object.keys(ESTADOS)) {
      for (const nome of Object.keys(ARVORES)) {
         const {ctx, pagina, reg} = await abrir(browser, servidores[nome].base);
         await ESTADOS[estado](pagina);
         for (const id of Object.keys(MEDIR)) if (estadoDe(id) === estado) medidas[nome][id] = await pagina.evaluate(MEDIR[id]);
         if (estado === 'filtro-escolhido') medidas[nome]['F-11'].removeFiltro = await removeFiltro(await (async () => pagina)());
         // a remoção muda o estado: refaz a página para a serialização e a captura
         let pg = pagina, c2 = ctx;
         if (estado === 'filtro-escolhido') { await ctx.close(); const o = await abrir(browser, servidores[nome].base); pg = o.pagina; c2 = o.ctx; await ESTADOS[estado](pg); }
         serial[nome][estado] = await pg.evaluate(SERIALIZAR);
         const png = await pg.screenshot({fullPage: true});
         await writeFile(join(CAPTURAS, `${estado}-${nome}.png`), png);
         capturas[`${estado}-${nome}`] = png;
         serial[nome][estado + ':registro'] = reg;
         await c2.close();
      }
   }
   for (const nome of Object.keys(ARVORES)) medidas[nome]['F-04'].cliqueVolta = await cliqueVolta(browser, servidores[nome].base);

   const lista = [];
   for (const id of Object.keys(MEDIR)) {
      const s = medidas.semeada[id], u = medidas['sem-semente'][id];
      const [violado, conforme] = JULGAR[id](s, u);
      lista.push({id, estado: estadoDe(id), medidoSemeado: s, medidoSemSemente: u, violadoNoSemeado: violado, conformeNoSemSemente: conforme, veredito: violado && conforme ? 'pegou' : 'nao-pegou'});
   }

   const difs = [];
   const pixels = {};
   for (const estado of Object.keys(ESTADOS)) {
      difs.push(...diferencas(estado, serial['sem-semente'][estado], serial.semeada[estado]));
      const A = PNG.sync.read(capturas[`${estado}-sem-semente`]), B = PNG.sync.read(capturas[`${estado}-semeada`]);
      pixels[estado] = A.width === B.width && A.height === B.height ? pixelmatch(A.data, B.data, null, A.width, A.height, {threshold: 0}) : `tamanhos diferentes ${A.width}x${A.height} / ${B.width}x${B.height}`;
   }
   const naoAtribuidas = difs.filter((d) => !d.atribuida.length);
   const porId = {};
   for (const d of difs) for (const z of d.atribuida) porId[z] = (porId[z] ?? 0) + 1;

   const func = {};
   for (const nome of Object.keys(ARVORES)) func[nome] = await funcionamento(browser, servidores[nome].base);
   const registros = Object.fromEntries(Object.keys(ARVORES).map((n) => [n, Object.fromEntries(Object.keys(ESTADOS).map((e) => [e, serial[n][e + ':registro']]))]));
   const {registro: rs, ...fs} = func.semeada, {registro: ru, ...fu} = func['sem-semente'];
   const funcIgual = JSON.stringify(fs) === JSON.stringify(fu);
   const limpo = (r) => !r.externas.length && !r.erros.length && !r.falhas.length;
   const tudoLimpo = limpo(rs) && limpo(ru) && Object.values(registros).every((m) => Object.values(m).every(limpo));

   await writeFile(join(AQUI, 'conferencia-construcao.json'), JSON.stringify({
      _meta: {rota: ROTA, viewport: '1280x900', navegador: 'Chromium headless (Playwright do govbr-eval)', semOraculo: true, semAxe: true, arvores: ARVORES, geradoEm: new Date().toISOString()},
      resumo: {pegou: lista.filter((l) => l.veredito === 'pegou').length, de: lista.length, naoPegou: lista.filter((l) => l.veredito !== 'pegou').map((l) => l.id)},
      mudancas: lista,
   }, null, 1));
   await writeFile(join(AQUI, 'diferencas-atribuidas.json'), JSON.stringify({
      _meta: {comparacao: 'DOM serializado com shadow roots abertos + estilo computado de cada elemento + caixa; semeado × sem semente, por estado', normalizacao: 'atributos de escopo _ngcontent/_nghost com prefixo sorteado por carga', tamanho: [...TAMANHO], pseudoElementos: 'não comparados'},
      resumo: {total: difs.length, naoAtribuidas: naoAtribuidas.length, porId, pixelsDiferentesPorEstado: pixels},
      naoAtribuidas, diferencas: difs,
   }, null, 1));
   await writeFile(join(AQUI, 'funcionamento.json'), JSON.stringify({iguais: funcIgual, semRequisicoesExternasErrosOuFalhas: tudoLimpo, semeada: func.semeada, 'sem-semente': func['sem-semente'], registrosPorEstado: registros}, null, 1));
   console.log(JSON.stringify({pegou: lista.filter((l) => l.veredito === 'pegou').length, naoPegou: lista.filter((l) => l.veredito !== 'pegou').map((l) => l.id), diferencas: difs.length, naoAtribuidas: naoAtribuidas.length, porId, pixels, funcIgual, tudoLimpo}, null, 1));
} finally {
   await browser.close();
   for (const {s} of Object.values(servidores)) s.close();
}
