// Re-medida independente (segundo agente) da referência candidata ground-truth-processos.json
// (1.0.0-candidata). Código próprio (base.mjs + este arquivo); nada de tela-d/*.mjs, tela-b/**,
// validator, axe, comparadores, scorers ou saídas de execução. Lê da referência só a sequência de
// paradas (_meta.url/waitFor/setup/states), as âncoras e o que cada spec/controle alega; os valores
// alegados estão escritos abaixo (ALEGADO) para a comparação.
// Uso: node tela-d/remedida/remedir.mjs [--saida caminho.json] [--headed]
import fs from 'node:fs';
import path from 'node:path';
import { AQUI, GT, META, servir, abrir, carregar, passosDe, conferirArvore } from './base.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SAIDA = arg('--saida', path.join(AQUI, 'resultado.json'));
const headed = process.argv.includes('--headed');

const arvore = conferirArvore();
const srv = await servir();
const { browser, ctx } = await abrir(!headed);
const BASE = srv.base;
const externos = [], consoles = [];
const nova = async (estado) => { const p = await carregar(ctx, BASE, passosDe(estado)); return p; };
const fechar = async p => { externos.push(...p.__externos); consoles.push(...p.__console); await p.close(); };

const SPEC = Object.fromEntries(GT.violations.map(v => [v.id, v]));
const CTRL = Object.fromEntries(META.conformes.itens.map(k => [k.id, k]));
const ROWS = 'pnip-mpa-processos table tbody tr';

// ---------- CDP / árvore de acessibilidade ----------
async function cdpDe(p) { const c = await ctx.newCDPSession(p); await c.send('DOM.enable'); await c.send('Accessibility.enable'); return c; }
async function axDe(c, expr) {
  const { result } = await c.send('Runtime.evaluate', { expression: expr });
  const props = await c.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
  const out = [];
  for (const pr of props.result) {
    if (!/^\d+$/.test(pr.name)) continue;
    const d = await c.send('DOM.describeNode', { objectId: pr.value.objectId });
    const ax = await c.send('Accessibility.getPartialAXTree', { backendNodeId: d.node.backendNodeId, fetchRelatives: false });
    const n = ax.nodes[0] || {};
    const prop = Object.fromEntries((n.properties || []).map(x => [x.name, x.value?.value]));
    out.push({ papel: n.role?.value ?? null, nome: n.name?.value ?? '', ignorado: !!n.ignored, focavel: !!prop.focusable, fonteNome: (n.name?.sources || []).filter(s => s.value || s.attributeValue).map(s => s.type + (s.attribute ? ':' + s.attribute : '')) });
  }
  return out;
}
const axSel = (c, sel) => axDe(c, `__r.findStrict(${JSON.stringify(sel)})`);
async function axArvore(c) { return (await c.send('Accessibility.getFullAXTree')).nodes; }

// ---------- Tab real ----------
const ALVOS = {
  'D-01': SPEC['D-01'].anchor + ' >>> button', 'D-02': SPEC['D-02'].anchor, 'D-03': SPEC['D-03'].anchor, 'D-04': SPEC['D-04'].anchor,
  'D-05': SPEC['D-05'].anchor, 'D-09': SPEC['D-09'].anchor, 'D-10': SPEC['D-10'].anchor, 'K-01': CTRL['K-01'].selector,
  'K-04': CTRL['K-04'].selector, 'K-05': CTRL['K-05'].selector, 'K-07': CTRL['K-07'].selector + ' >>> button', 'K-09': CTRL['K-09'].selector,
  voltar: 'pnip-mpa-processos br-button[label=Voltar] >>> button',
};
const tecla = async (p, k) => { await p.keyboard.press(k); await p.waitForTimeout(300); await p.locator(ROWS).first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {}); await p.waitForTimeout(100); };
async function passoTab(p) {
  return p.evaluate(alvos => { const a = __r.ativo(); const hit = []; for (const [k, s] of Object.entries(alvos)) { const els = __r.findStrict(s); const i = els.indexOf(a); if (i >= 0) hit.push(k + '#' + i); else if (els.some(e => e.contains(a) || (e.shadowRoot && e.shadowRoot.contains(a)))) hit.push(k + '#in'); } return { el: __r.desc(a), hit }; }, ALVOS);
}
async function caminhada(estado, max, k = 'Tab') {
  const p = await nova(estado); const seq = [];
  for (let i = 0; i < max; i++) { await tecla(p, k); seq.push(await passoTab(p)); }
  await fechar(p); return seq;
}
// conta elementos distintos da âncora que foram o elemento ativo (acerto exato; '#in' = foco num descendente, não conta)
const contaHits = (seq, k) => { const s = new Set(); for (const x of seq) for (const h of x.hit) if (h.startsWith(k + '#') && h !== k + '#in') s.add(h); return s; };

// ---------- medidas ----------
const medidas = [];
const reg = (id, tipo, estado, ok, medido, nota = '') => medidas.push({ id, tipo, estado, veredito: ok ? 'confirma' : 'diverge', medido, nota });

// Paradas: path, contagem de cada âncora, aditividade.
const paradas = [];
const contagens = {};
for (const st of META.states) {
  const p = await nova(st.id);
  const cont = {};
  for (const v of GT.violations) cont[v.id] = await p.evaluate(s => [__r.findStrict(s).length, __r.findWide(s).length], v.anchor);
  for (const k of META.conformes.itens) cont[k.id] = await p.evaluate(s => [__r.findStrict(s).length, __r.findWide(s).length], k.selector);
  const pathMedido = new URL(p.url()).pathname;
  const listaAberta = await p.evaluate(() => { const l = __r.findStrict('govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list')[0]; if (!l) return null; const r = l.getBoundingClientRect(); return { visivel: r.height > 0 && getComputedStyle(l).display !== 'none', h: Math.round(r.height), itensVisiveis: [...l.querySelectorAll('.br-item')].filter(i => i.getBoundingClientRect().height > 0).length }; });
  paradas.push({ id: st.id, path: st.path, medido: pathMedido, ok: pathMedido === st.path, listaExibir: listaAberta, linhas: await p.evaluate(s => __r.findStrict(s).length, ROWS) });
  contagens[st.id] = cont;
  await fechar(p);
}

// Caminhadas de Tab
const tabIni = await caminhada('inicial', 90);
const tabLista = await caminhada('lista-exibir', 12);
const tabVolta = await caminhada('inicial', 12, 'Shift+Tab');

// ===== Carga principal: inicial =====
{
  const p = await nova('inicial'); const c = await cdpDe(p);
  const st = 'inicial';
  const cnt = id => contagens[st][id][0];

  // D-01
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(h => { const b = h.shadowRoot.querySelector('button'); const cs = getComputedStyle(b); const r = b.getBoundingClientRect(); return { title: h.getAttribute('title'), label: h.getAttribute('label'), circle: h.hasAttribute('circle') || b.classList.contains('circle'), classes: b.className, w: Math.round(r.width), h: Math.round(r.height), raio: cs.borderTopLeftRadius, textoVisivel: (b.innerText || '').trim(), textoHost: (h.innerText || '').trim(), icone: h.querySelector('br-icon-base')?.getAttribute('icon-name') || null, desabilitado: b.disabled || h.hasAttribute('disabled') }; }), SPEC['D-01'].anchor);
    const ax = await axSel(c, SPEC['D-01'].anchor + ' >>> button');
    const ver = m.filter(x => x.title === 'Ver processo'), des = m.filter(x => /^Desassociar/.test(x.title));
    const tamanhos = [...new Set(m.map(x => x.w + 'x' + x.h))], raios = [...new Set(m.map(x => x.raio))];
    const assinar = await p.evaluate(s => __r.findStrict(s).map(h => (h.innerText || '').trim()), CTRL['K-07'].selector);
    const ok = cnt('D-01') === 18 && ver.length === 9 && des.length === 9 && des.filter(x => x.desabilitado).length === 8 && m.every(x => !x.label && !x.circle && x.textoVisivel === '' && x.textoHost === '') && tamanhos.join() === '72x40' && ax.every((a, i) => a.nome === m[i].title);
    reg('D-01', 'spec', st, ok, { count: cnt('D-01'), ver: ver.length, desassociar: des.length, desassociarDesabilitados: des.filter(x => x.desabilitado).length, semLabel: m.filter(x => !x.label).length, semCircle: m.filter(x => !x.circle).length, semTextoVisivel: m.filter(x => !x.textoVisivel && !x.textoHost).length, tamanhos, raios, classesBotao: [...new Set(m.map(x => x.classes))], icones: [...new Set(m.map(x => x.icone))], axNomes: [...new Set(ax.map(a => a.nome))], axNomeIgualTitle: ax.filter((a, i) => a.nome === m[i].title).length, axFonteNome: [...new Set(ax.map(a => a.fonteNome.join('+')))], assinarTextoVisivel: assinar });
  }

  // D-02
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(a => ({ texto: a.textContent.trim(), role: a.getAttribute('role'), href: a.getAttribute('href'), tabindexAttr: a.getAttribute('tabindex'), tabIndex: a.tabIndex, cursor: getComputedStyle(a).cursor })), SPEC['D-02'].anchor);
    const ax = await axSel(c, SPEC['D-02'].anchor);
    const noTab = contaHits(tabIni, 'D-02').size;
    reg('D-02', 'spec', st, null, { count: cnt('D-02'), roles: [...new Set(m.map(x => x.role))], comHref: m.filter(x => x.href !== null).length, comTabindex: m.filter(x => x.tabindexAttr !== null).length, tabIndex: [...new Set(m.map(x => x.tabIndex))], cursor: [...new Set(m.map(x => x.cursor))], axFocaveis: ax.filter(a => a.focavel).length, axPapeis: [...new Set(ax.map(a => a.papel))], alcancadosPorTab: noTab, textos: m.map(x => x.texto) });
  }

  // D-03
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(e => ({ tag: e.tagName.toLowerCase(), texto: e.innerText.trim().replace(/\s+/g, ' '), role: e.getAttribute('role'), tabindexAttr: e.getAttribute('tabindex'), tabIndex: e.tabIndex, cursor: getComputedStyle(e).cursor, ariaPressed: e.getAttribute('aria-pressed'), ariaExpanded: e.getAttribute('aria-expanded') })), SPEC['D-03'].anchor);
    const ax = await axSel(c, SPEC['D-03'].anchor);
    reg('D-03', 'spec', st, null, { count: cnt('D-03'), tags: [...new Set(m.map(x => x.tag))], textos: m.map(x => x.texto), roles: [...new Set(m.map(x => x.role))], tabindexAttr: [...new Set(m.map(x => x.tabindexAttr))], tabIndex: [...new Set(m.map(x => x.tabIndex))], cursor: [...new Set(m.map(x => x.cursor))], ariaPressedOuExpanded: m.filter(x => x.ariaPressed !== null || x.ariaExpanded !== null).length, ax: [...new Set(ax.map(a => a.papel + '|' + JSON.stringify(a.nome)))], alcancadosPorTab: contaHits(tabIni, 'D-03').size });
  }

  // D-04
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(i => ({ labels: i.labels ? i.labels.length : null, ariaLabel: i.getAttribute('aria-label'), ariaLabelledby: i.getAttribute('aria-labelledby'), title: i.getAttribute('title'), noThead: !!i.closest('thead'), tabIndex: i.tabIndex, disabled: i.disabled })), SPEC['D-04'].anchor);
    const ax = await axSel(c, SPEC['D-04'].anchor);
    const tab = contaHits(tabIni, 'D-04').size;
    const ok = cnt('D-04') === 7 && m.filter(x => x.noThead).length === 1 && m.every(x => x.labels === 0 && !x.ariaLabel && !x.ariaLabelledby && !x.title) && ax.every(a => a.nome === '') && tab === 7;
    reg('D-04', 'spec', st, ok, { count: cnt('D-04'), noCabecalho: m.filter(x => x.noThead).length, nasLinhas: m.filter(x => !x.noThead).length, labels: [...new Set(m.map(x => x.labels))], comAriaLabelOuLabelledbyOuTitle: m.filter(x => x.ariaLabel || x.ariaLabelledby || x.title).length, axNomes: [...new Set(ax.map(a => a.nome))], axPapeis: [...new Set(ax.map(a => a.papel))], alcancadosPorTab: tab });
  }

  // D-05
  {
    const m = await p.evaluate(() => { const h = __r.findStrict('pnip-search-table-utils br-input')[0]; const i = __r.findStrict('pnip-search-table-utils br-input >>> input')[0]; return { hostPlaceholder: h.getAttribute('placeholder'), hostLabel: h.getAttribute('label'), id: i.id, placeholder: i.getAttribute('placeholder'), labels: i.labels ? i.labels.length : null, ariaLabel: i.getAttribute('aria-label'), ariaLabelledby: i.getAttribute('aria-labelledby') }; });
    const ax = await axSel(c, SPEC['D-05'].anchor);
    const vizinhos = await p.evaluate(() => __r.findStrict('govbr-custom-pagination br-select-pnip input[type=text]').map(i => ({ id: i.id, labels: i.labels.length, rotulo: i.labels[0]?.textContent.trim() })));
    const ok = cnt('D-05') === 1 && m.hostPlaceholder === 'Pesquise aqui ...' && !m.hostLabel && m.id === 'search' && m.labels === 0 && !m.ariaLabel && !m.ariaLabelledby && ax[0].nome === 'Pesquise aqui ...';
    reg('D-05', 'spec', st, ok, { count: cnt('D-05'), ...m, ax: ax[0], seletoresDaPaginacao: vizinhos });
  }

  // D-06 + K-08
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(e => ({ classeFundo: [...e.parentElement.classList].find(c => c.startsWith('bg-')), ...__r.contraste(e) })), SPEC['D-06'].anchor);
    const grupos = {}; for (const x of m) { const g = grupos[x.classeFundo] ||= { n: 0, fundo: x.fundo, cor: x.cor, razoes: new Set(), fonte: x.fonte, peso: x.peso }; g.n++; g.razoes.add(x.razao); }
    for (const g of Object.values(grupos)) g.razoes = [...g.razoes];
    const ok = cnt('D-06') === 8 && m.every(x => x.razao < 4.5) && grupos['bg-orange-vivid-40']?.n === 5 && grupos['bg-indigo-vivid-40']?.n === 1 && grupos['bg-secondary-06']?.n === 2;
    reg('D-06', 'spec', st, ok, { count: cnt('D-06'), abaixoDe45: m.filter(x => x.razao < 4.5).length, grupos, textos: m.map(x => x.texto) });
    const k = await p.evaluate(s => __r.findStrict(s).map(e => __r.contraste(e)), CTRL['K-08'].selector);
    reg('K-08', 'controle', st, cnt('K-08') === 1 && k.every(x => x.razao >= 4.5), { count: cnt('K-08'), ...k[0] });
  }

  // D-07
  {
    const m = await p.evaluate(s => { const t = __r.findStrict(s)[0]; const h2 = __r.findStrict('pnip-mpa-processos h2')[0]; return { caption: !!t.querySelector('caption'), ariaLabel: t.getAttribute('aria-label'), ariaLabelledby: t.getAttribute('aria-labelledby'), title: t.getAttribute('title'), h2DentroDoContainerDaTabela: !!(h2 && t.parentElement.contains(h2)), summary: t.getAttribute('summary') }; }, SPEC['D-07'].anchor);
    const ax = await axSel(c, SPEC['D-07'].anchor);
    reg('D-07', 'spec', st, cnt('D-07') === 1 && !m.caption && !m.ariaLabel && !m.ariaLabelledby && ax[0].nome === '', { count: cnt('D-07'), ...m, ax: ax[0] });
  }

  // D-08
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(t => ({ texto: t.textContent.trim(), scope: t.getAttribute('scope'), filhos: t.children.length, ariaLabel: t.getAttribute('aria-label') })), SPEC['D-08'].anchor);
    const ax = await axSel(c, SPEC['D-08'].anchor);
    reg('D-08', 'spec', st, cnt('D-08') === 1 && m[0].texto === '' && m[0].scope === 'col' && ax[0].papel === 'columnheader' && ax[0].nome === '', { count: cnt('D-08'), ...m[0], ax: ax[0] });
  }

  // D-09
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(b => { const r = b.getBoundingClientRect(); let host = b; while (host && !/^(PNIP-|BR-SELECT-PNIP|GOVBR-)/.test(host.tagName)) host = __r.pf(host); return { ariaLabel: b.getAttribute('aria-label'), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, tabindex: b.getAttribute('tabindex'), componente: host ? host.tagName.toLowerCase() + (host.getAttribute('label') ? '[label=' + host.getAttribute('label') + ']' : '') : null, texto: b.innerText.trim(), icone: b.querySelector('i')?.className || null }; }), SPEC['D-09'].anchor);
    reg('D-09', 'spec', st, cnt('D-09') === 3 && m.every(x => x.w === 32 && x.h === 32), { count: cnt('D-09'), alvos: m, alcancadosPorTab: contaHits(tabIni, 'D-09').size });
  }

  // D-10
  {
    const m = await p.evaluate(s => { const f = __r.findStrict(s)[0]; const r = f.getBoundingClientRect(); let docUrl = null, filhos = null, texto = null; try { docUrl = f.contentDocument.URL; filhos = f.contentDocument.body ? f.contentDocument.body.childElementCount : null; texto = f.contentDocument.body ? f.contentDocument.body.textContent.trim() : null; } catch (e) { docUrl = 'inacessivel'; } return { src: f.getAttribute('src'), title: f.getAttribute('title'), name: f.getAttribute('name'), ariaLabel: f.getAttribute('aria-label'), tabIndex: f.tabIndex, docUrl, filhosDoBody: filhos, textoDoBody: texto, w: Math.round(r.width), h: Math.round(r.height) }; }, SPEC['D-10'].anchor);
    const ax = await axSel(c, SPEC['D-10'].anchor);
    // Tab: o que vem antes e depois do iframe na caminhada; estilo de foco ao chegar.
    const iIdx = tabIni.findIndex(x => x.hit.includes('D-10#0'));
    const antes = iIdx > 0 ? tabIni[iIdx - 1] : null;
    const depois = iIdx >= 0 ? tabIni.slice(iIdx, iIdx + 8).map(x => x.el.split(' "')[0]) : [];
    reg('D-10', 'spec', st, null, { count: cnt('D-10'), ...m, ax: ax[0], tabPassoDoIframe: iIdx + 1, antesDoIframe: antes, sequenciaDesdeOIframe: depois });
  }
  // D-11 / D-12 / D-13 / D-14 (estado "sempre") e K-01..K-07, K-09 medidos aqui; D-11..D-14 também na outra parada.
  const casco = async (pg, cc) => {
    const d = await pg.evaluate(() => { const els = __r.deepAll(); return { ancorasHash: els.filter(e => e.tagName === 'A' && (e.getAttribute('href') || '').startsWith('#')).map(__r.desc), skiplink: els.filter(e => e.classList && (e.classList.contains('br-skiplink') || e.tagName === 'BR-SKIPLINK')).length, hDom: els.filter(e => /^H[1-6]$/.test(e.tagName)).map(e => e.tagName.toLowerCase() + ' ' + e.textContent.trim().slice(0, 30) + (e.getRootNode() instanceof ShadowRoot ? ' (shadow)' : '')), roleHeading: els.filter(e => e.getAttribute('role') === 'heading').length, title: document.title, nTitle: document.querySelectorAll('head > title').length }; });
    const axTit = (await axArvore(cc)).filter(n => n.role?.value === 'heading' && !n.ignored).map(n => (n.name?.value || '') + ' L' + ((n.properties || []).find(x => x.name === 'level')?.value?.value));
    const av = await pg.evaluate(s => __r.findStrict(s).map(e => ({ ...__r.contraste(e), classes: e.className })), SPEC['D-14'].anchor);
    return { ...d, axTitulos: axTit, avatar: av };
  };
  const cascoIni = await casco(p, c);

  // K-01 / K-02
  {
    const a = await p.evaluate(s => __r.findStrict(s).map(e => ({ texto: e.textContent.trim(), tabIndex: e.tabIndex, href: e.getAttribute('href') })), CTRL['K-01'].selector);
    const t = contaHits(tabIni, 'K-01').size;
    reg('K-01', 'controle', st, cnt('K-01') === 1 && a[0].tabIndex === 0 && t === 1, { count: cnt('K-01'), ...a[0], alcancadoPorTab: t });
    const li = await p.evaluate(s => __r.findStrict(s).map(e => ({ texto: e.innerText.trim().replace(/\s+/g, ' '), pai: e.parentElement.tagName.toLowerCase(), filhosLi: e.querySelectorAll('li').length })), CTRL['K-02'].selector);
    reg('K-02', 'controle', st, cnt('K-02') === 2 && li.every(x => x.pai === 'ul' || x.pai === 'ol') && li.every(x => x.filhosLi === 0), { count: cnt('K-02'), itens: li });
  }
  // K-03 / K-06
  {
    const h = await p.evaluate(s => __r.findStrict(s).map(e => __r.contraste(e)), CTRL['K-03'].selector);
    reg('K-03', 'controle', st, cnt('K-03') === 1 && h[0].razao >= 4.5, { count: cnt('K-03'), ...h[0] });
    const th = await p.evaluate(s => __r.findStrict(s).map(e => __r.contraste(e)), CTRL['K-06'].selector);
    reg('K-06', 'controle', st, cnt('K-06') === 7 && th.every(x => x.razao >= 4.5 && x.texto), { count: cnt('K-06'), razoes: th.map(x => x.razao), cores: [...new Set(th.map(x => x.cor + ' sobre ' + x.fundo))], textos: th.map(x => x.texto) });
  }
  // K-07
  {
    const m = await p.evaluate(s => __r.findStrict(s).map(h => { const b = h.shadowRoot.querySelector('button'); const r = b.getBoundingClientRect(); return { texto: (h.innerText || '').trim() || (b.innerText || '').trim(), textoVisivelPx: (() => { const rg = document.createRange(); rg.selectNodeContents(h); const rr = rg.getBoundingClientRect(); return Math.round(rr.width) + 'x' + Math.round(rr.height); })(), label: h.getAttribute('label'), circle: h.hasAttribute('circle') || b.classList.contains('circle'), w: Math.round(r.width), h: Math.round(r.height), raio: getComputedStyle(b).borderTopLeftRadius }; }), CTRL['K-07'].selector);
    reg('K-07', 'controle', st, cnt('K-07') === 3 && m.every(x => x.texto === 'Assinar' && !x.circle && x.w !== x.h), { count: cnt('K-07'), botoes: m });
  }
  // K-09
  {
    const m = await p.evaluate(s => { const d = __r.findStrict(s)[0]; const inner = d.shadowRoot ? [...d.shadowRoot.querySelectorAll('*')].map(e => ({ tag: e.tagName.toLowerCase(), tabIndex: e.tabIndex, role: e.getAttribute('role') })) : []; return { tabIndexHost: d.tabIndex, tabindexAttr: d.getAttribute('tabindex'), shadow: !!d.shadowRoot, internos: inner }; }, CTRL['K-09'].selector);
    const axHost = await axSel(c, CTRL['K-09'].selector);
    const axIn = await axDe(c, `[...__r.findStrict(${JSON.stringify(CTRL['K-09'].selector)})[0].shadowRoot.querySelectorAll('span')]`);
    const t = contaHits(tabIni, 'K-09').size;
    reg('K-09', 'controle', st, cnt('K-09') === 1 && m.tabIndexHost < 0 && t === 0 && axIn.every(a => a.ignorado || ['none', 'generic', 'InlineTextBox', null].includes(a.papel)), { count: cnt('K-09'), ...m, axHost: axHost[0], axSpansInternos: axIn, alcancadoPorTab: t });
  }
  // K-05 parte estática
  const abas = await p.evaluate(s => __r.findStrict(s).map(b => ({ tag: b.tagName.toLowerCase(), tabIndex: b.tabIndex, texto: b.innerText.trim(), ariaLabel: b.getAttribute('aria-label') })), CTRL['K-05'].selector);
  await c.detach(); await fechar(p);

  // ===== Carga principal: lista-exibir =====
  const q = await nova('lista-exibir'); const cq = await cdpDe(q);
  const cascoLista = await casco(q, cq);
  // D-11
  {
    const prim = tabIni[0];
    const ok = [cascoIni, cascoLista].every(x => x.ancorasHash.length === 0 && x.skiplink === 0) && /Menu|navigation|menu/i.test(prim.el);
    reg('D-11', 'spec', 'sempre', ok, { count: [contagens.inicial['D-11'][0], contagens['lista-exibir']['D-11'][0]], ancorasHash: [cascoIni.ancorasHash.length, cascoLista.ancorasHash.length], skiplink: [cascoIni.skiplink, cascoLista.skiplink], primeiroTab: prim.el });
  }
  // D-12
  {
    const ok = [cascoIni, cascoLista].every(x => x.hDom.length === 1 && /^h2 Processos/.test(x.hDom[0]) && x.roleHeading === 0);
    reg('D-12', 'spec', 'sempre', ok, { titulosDom: [cascoIni.hDom, cascoLista.hDom], roleHeading: [cascoIni.roleHeading, cascoLista.roleHeading], axTitulos: [cascoIni.axTitulos, cascoLista.axTitulos] });
  }
  // D-13
  reg('D-13', 'spec', 'sempre', [cascoIni, cascoLista].every(x => x.title === 'PNIP' && x.nTitle === 1), { title: [cascoIni.title, cascoLista.title], nTitle: [cascoIni.nTitle, cascoLista.nTitle] });
  // D-14
  {
    const a = [cascoIni.avatar[0], cascoLista.avatar[0]];
    reg('D-14', 'spec', 'sempre', a.every(x => x && x.razao < 4.5), { avatar: a });
  }
  // K-10
  {
    const m = await q.evaluate(s => __r.findStrict(s).map(i => ({ id: i.id, value: i.value, labels: i.labels.length, labelFor: i.labels[0]?.htmlFor, labelTexto: i.labels[0]?.textContent.trim(), name: i.getAttribute('name') })), CTRL['K-10'].selector);
    const ax = await axSel(cq, CTRL['K-10'].selector);
    reg('K-10', 'controle', 'lista-exibir', contagens['lista-exibir']['K-10'][0] === 4 && m.every(x => x.labels === 1 && x.labelFor === x.id) && ax.every(a => a.nome), { count: contagens['lista-exibir']['K-10'][0], radios: m, axNomes: ax.map(a => a.papel + ':' + a.nome) });
  }
  // K-12
  {
    const m = await q.evaluate(s => __r.findStrict(s).map(e => { const cs = getComputedStyle(e); return [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' '); }), CTRL['K-12'].selector);
    reg('K-12', 'controle', 'lista-exibir', contagens['lista-exibir']['K-12'][0] === 4 && m.every(x => x.split(' ').every(v => v === '16px')), { count: contagens['lista-exibir']['K-12'][0], padding: m }, 'padding top/right/bottom/left');
  }
  await cq.detach(); await fechar(q);

  // ===== Cargas auxiliares =====
  // D-02: clique em cada número; "Ver processo" da mesma linha.
  {
    const r = [];
    for (let i = 0; i < 9; i++) {
      const p1 = await nova('inicial');
      await p1.evaluate(() => { window.__marca = 1; });
      await p1.evaluate(([s, i]) => __r.findStrict(s)[i].click(), [SPEC['D-02'].anchor, i]);
      await p1.waitForTimeout(1500);
      const destA = new URL(p1.url()).pathname; const recargaA = await p1.evaluate(() => window.__marca !== 1);
      await fechar(p1);
      const p2 = await nova('inicial');
      await p2.evaluate(() => { window.__marca = 1; });
      await p2.evaluate(i => __r.findStrict('pnip-mpa-processos table tbody tr')[i].querySelector('br-button[title="Ver processo"]').shadowRoot.querySelector('button').click(), i);
      await p2.waitForTimeout(1500);
      const destV = new URL(p2.url()).pathname; const recargaV = await p2.evaluate(() => window.__marca !== 1);
      await fechar(p2);
      r.push({ linha: i + 1, numero: { destino: destA, recarga: recargaA }, verProcesso: { destino: destV, recarga: recargaV } });
    }
    const m = medidas.find(x => x.id === 'D-02');
    m.medido.cliques = r;
    const doc = r.filter(x => /\/documentos$/.test(x.numero.destino)).map(x => x.linha);
    const login = r.filter(x => /\/login/.test(x.numero.destino)).map(x => x.linha);
    const verSemDoc = r.every(x => !/\/documentos/.test(x.verProcesso.destino));
    const mm = m.medido;
    const ok = mm.count === 9 && mm.roles.join() === 'button' && mm.comHref === 0 && mm.comTabindex === 0 && mm.axFocaveis === 0 && mm.alcancadosPorTab === 0 && doc.join() === '2,3,4,6,7,9' && login.join() === '1,5,8' && verSemDoc;
    m.medido.linhasDocumentos = doc; m.medido.linhasLogin = login; m.medido.verProcessoSemDocumentos = verSemDoc;
    m.veredito = ok ? 'confirma' : 'diverge';
  }
  // D-03: clique em cada etiqueta (efeito) — carga nova por etiqueta.
  {
    const r = [];
    for (let i = 0; i < 7; i++) {
      const p1 = await nova('inicial');
      const antes = await p1.evaluate(() => ({ linhas: __r.findStrict('pnip-mpa-processos table tbody tr').length, visiveis: __r.deepAll().filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length }));
      await p1.evaluate(([s, i]) => __r.findStrict(s)[i].click(), [SPEC['D-03'].anchor, i]);
      await p1.waitForTimeout(1500);
      const depois = await p1.evaluate(() => ({ linhas: __r.findStrict('pnip-mpa-processos table tbody tr').length, visiveis: __r.deepAll().filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length, opcoes: __r.deepAll().filter(e => /br-list|dropdown|br-item/.test(typeof e.className === 'string' ? e.className : '') && e.getBoundingClientRect().height > 0 && e.closest && !e.closest('govbr-custom-pagination')).length }));
      // tecla Enter/Espaço com foco programático não se aplica: não focável
      const focavel = await p1.evaluate(([s, i]) => { const e = __r.findStrict(s)[i]; e.focus(); return __r.ativo() === e; }, [SPEC['D-03'].anchor, i]);
      await fechar(p1);
      r.push({ i, antes, depois, focavelPorFocus: focavel });
    }
    const m = medidas.find(x => x.id === 'D-03');
    m.medido.cliques = r;
    const mm = m.medido;
    const ok = mm.count === 7 && mm.tags.join() === 'span' && mm.roles.join() === '' && mm.tabindexAttr.join() === '' && mm.tabIndex.join() === '-1' && mm.cursor.join() === 'pointer' && mm.ariaPressedOuExpanded === 0 && mm.alcancadosPorTab === 0 && r[0].antes.linhas === 9 && r[0].depois.linhas === 10 && r.slice(1).every(x => x.depois.visiveis > x.antes.visiveis) && mm.ax.every(x => /^(generic|none)\|""$/.test(x));
    m.veredito = ok ? 'confirma' : 'diverge';
  }
  // D-10: foco no iframe por Tab — estilo; Shift+Tab a partir dele.
  {
    const p1 = await nova('inicial'); let est = null, passos = 0, shift = null, seguinte = [];
    for (let i = 0; i < 120; i++) {
      await tecla(p1, 'Tab'); passos++;
      const isIf = await p1.evaluate(s => __r.ativo() === __r.findStrict(s)[0], SPEC['D-10'].anchor);
      if (isIf) {
        est = await p1.evaluate(s => { const f = __r.findStrict(s)[0]; const cs = getComputedStyle(f); return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow, focusVisible: f.matches(':focus-visible'), focus: f.matches(':focus') }; }, SPEC['D-10'].anchor);
        for (let j = 0; j < 4; j++) { await tecla(p1, 'Tab'); seguinte.push(await p1.evaluate(() => __r.desc(__r.ativo()).split(' "')[0])); }
        break;
      }
    }
    await fechar(p1);
    const p2 = await nova('inicial');
    await p2.evaluate(s => __r.findStrict(s)[0].focus(), SPEC['D-10'].anchor);
    await tecla(p2, 'Shift+Tab'); shift = await passoTab(p2);
    await fechar(p2);
    const m = medidas.find(x => x.id === 'D-10');
    Object.assign(m.medido, { focoNoIframe: est, tabsAteOIframe: passos, depoisDoIframe: seguinte, shiftTabDoIframe: shift });
    const mm = m.medido;
    const ok = mm.count === 1 && mm.src === null && mm.docUrl === 'about:blank' && mm.filhosDoBody === 0 && mm.w === 1160 && mm.h === 500 && !mm.title && !mm.name && !mm.ariaLabel && mm.ax.nome === '' && /iframe/i.test(mm.ax.papel) && est && est.outlineStyle === 'none' && est.boxShadow === 'none' && !est.focusVisible && mm.antesDoIframe?.hit.includes('voltar#0') && shift.hit.includes('voltar#0');
    m.veredito = ok ? 'confirma' : 'diverge';
  }
  // K-04: foco por Tab no "Exportar" — contorno.
  {
    const p1 = await nova('inicial'); let est = null, n = 0;
    for (let i = 0; i < 120 && !est; i++) {
      await tecla(p1, 'Tab'); n++;
      est = await p1.evaluate(s => { const b = __r.findStrict(s)[0]; if (__r.ativo() !== b) return null; const cs = getComputedStyle(b); return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset, focusVisible: b.matches(':focus-visible') }; }, CTRL['K-04'].selector);
    }
    await fechar(p1);
    reg('K-04', 'controle', 'inicial', contagens.inicial['K-04'][0] === 1 && !!est && est.outlineStyle === 'dashed' && est.outlineWidth === '4px' && est.outlineColor === 'rgb(194, 133, 12)', { count: contagens.inicial['K-04'][0], tabsAteOExportar: n, foco: est });
  }
  // K-05: abas — tabIndex, Tab real, Enter ≡ clique.
  {
    const sig = pg => pg.evaluate(() => ({ ativa: __r.findStrict('pnip-mpa-processos br-tab >>> button').filter(b => /active/.test(b.className) || b.parentElement?.classList.contains('is-active')).map(b => b.innerText.trim()), linhas: __r.findStrict('pnip-mpa-processos table tbody tr').length, primeira: (__r.findStrict('pnip-mpa-processos table tbody tr')[0]?.innerText || '').replace(/\s+/g, ' ').slice(0, 60), path: location.pathname }));
    const r = [];
    for (let i = 0; i < 3; i++) {
      const a = await nova('inicial');
      await a.evaluate(([s, i]) => __r.findStrict(s)[i].click(), [CTRL['K-05'].selector, i]); await a.waitForTimeout(1500); const sc = await sig(a); await fechar(a);
      const b = await nova('inicial');
      await b.evaluate(([s, i]) => __r.findStrict(s)[i].focus(), [CTRL['K-05'].selector, i]); await b.keyboard.press('Enter'); await b.waitForTimeout(1500); const se = await sig(b); await fechar(b);
      r.push({ aba: abas[i].texto, clique: sc, enter: se, igual: JSON.stringify(sc) === JSON.stringify(se) });
    }
    const t = contaHits(tabIni, 'K-05').size;
    reg('K-05', 'controle', 'inicial', contagens.inicial['K-05'][0] === 3 && abas.every(x => x.tag === 'button' && x.tabIndex === 0) && r.every(x => x.igual), { count: contagens.inicial['K-05'][0], abas, alcancadasPorTab: t, enterIgualClique: r }, 'Tab real alcança as abas: ' + t + ' de 3 (o tabIndex é 0 nas três)');
  }
  // K-11: hover e clique perto da borda de cada br-item.
  {
    const r = [];
    for (let i = 0; i < 4; i++) {
      const pg = await nova('lista-exibir');
      const sel = CTRL['K-11'].selector;
      const box = await pg.evaluate(([s, i]) => { const e = __r.findStrict(s)[i]; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(e.querySelector('label')); const t = rg.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, texto: { x: t.x, y: t.y, w: t.width, h: t.height }, bgAntes: getComputedStyle(e).backgroundImage }; }, [sel, i]);
      await pg.mouse.move(box.x + box.w - 6, box.y + box.h / 2); await pg.waitForTimeout(400);
      const hov = await pg.evaluate(([s, i]) => { const e = __r.findStrict(s)[i]; const cs = getComputedStyle(e); return { hover: e.matches(':hover'), backgroundImage: cs.backgroundImage.slice(0, 120) }; }, [sel, i]);
      const px = box.x + box.w - 4, py = box.y + 4; // canto direito-superior do item, fora da caixa do texto
      const fora = px > box.texto.x + box.texto.w || py < box.texto.y || py > box.texto.y + box.texto.h;
      await pg.mouse.click(px, py); await pg.waitForTimeout(1200);
      const depois = await pg.evaluate(() => { const i = __r.findStrict('govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total')[0]; const marcados = __r.findStrict('govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-radio input[type=radio]').filter(r => r.checked).map(r => r.value); return { valorCampo: i.value, marcados, linhas: __r.findStrict('pnip-mpa-processos table tbody tr').length }; });
      await fechar(pg);
      r.push({ item: i, caixa: { w: Math.round(box.w), h: Math.round(box.h) }, caixaDoTexto: { dx: Math.round(box.texto.x - box.x), dy: Math.round(box.texto.y - box.y), w: Math.round(box.texto.w), h: Math.round(box.texto.h) }, bgAntes: box.bgAntes.slice(0, 60), hover: hov, cliqueEm: { dx: Math.round(px - box.x), dy: Math.round(py - box.y), foraDoTexto: fora }, depois });
    }
    const valores = ['10', '25', '50', '100'];
    const ok = contagens['lista-exibir']['K-11'][0] === 4 && r.every((x, i) => x.hover.hover && /gradient/.test(x.hover.backgroundImage) && x.cliqueEm.foraDoTexto && x.depois.marcados.join() === valores[i]);
    reg('K-11', 'controle', 'lista-exibir', ok, { count: contagens['lista-exibir']['K-11'][0], itens: r });
  }
}

// ---------- contagem por parada ----------
for (const v of GT.violations) {
  const est = v.state === 'sempre' ? META.states.map(s => s.id) : [v.state];
  const cs = est.map(e => contagens[e][v.id][0]);
  const m = medidas.find(x => x.id === v.id);
  m.contagemPorParada = Object.fromEntries(est.map((e, i) => [e, contagens[e][v.id]]));
  if (!cs.every(n => n === v.expectedCount)) { m.veredito = 'diverge'; m.nota += ` contagem ${cs.join('/')} ≠ expectedCount ${v.expectedCount}`; }
}
for (const k of META.conformes.itens) {
  const m = medidas.find(x => x.id === k.id);
  const n = contagens[k.state][k.id][0];
  m.contagemNaParada = n;
  if (n !== k.count) { m.veredito = 'diverge'; m.nota += ` contagem ${n} ≠ count ${k.count}`; }
}
// Aditividade: contagens iguais entre as duas paradas (um só segmento).
const aditividade = Object.fromEntries(Object.keys(contagens.inicial).map(id => [id, contagens.inicial[id][0] === contagens['lista-exibir'][id][0]]));

const ordem = [...GT.violations.map(v => v.id), ...META.conformes.itens.map(k => k.id)];
medidas.sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id));
const specs = medidas.filter(x => x.tipo === 'spec'), ctrls = medidas.filter(x => x.tipo === 'controle');
const unid = specs.reduce((s, m) => s + SPEC[m.id].expectedCount, 0);
const unidConf = specs.filter(m => m.veredito === 'confirma').reduce((s, m) => s + SPEC[m.id].expectedCount, 0);
const out = {
  referencia: { arquivo: 'ground-truth-processos.json', versao: META.version },
  condicoes: { viewport: META.viewport, fuso: 'America/Sao_Paulo', locale: 'pt-BR', headless: !headed, node: process.version, servidor: 'próprio (base.mjs), public/pnip-d/ + índice SPA + alias do ícone do Sair' },
  arvore,
  resumo: { specs: `${specs.filter(m => m.veredito === 'confirma').length}/${specs.length}`, unidades: `${unidConf}/${unid}`, controles: `${ctrls.filter(m => m.veredito === 'confirma').length}/${ctrls.length}`, divergem: medidas.filter(m => m.veredito !== 'confirma').map(m => m.id) },
  paradas, aditividade: { todasIguais: Object.values(aditividade).every(Boolean), porAncora: aditividade },
  escritas: srv.reg.escritas, naoAchados: [...new Set(srv.reg.naoAchados)], externosAbortados: [...new Set(externos)], errosDeConsole: [...new Set(consoles.map(t => t.split(BASE).join('<base>').split(String.fromCharCode(10))[0]))].sort(), errosDeConsoleNota: 'só nas cargas auxiliares que navegam para fora da rota (clique em número de processo / "Ver processo" → rotas de detalhe fora do escopo)',
  tab: { inicial: tabIni.map((x, i) => `${i + 1} ${x.el}${x.hit.length ? ' ← ' + x.hit.join(',') : ''}`), listaExibir: tabLista.map((x, i) => `${i + 1} ${x.el}${x.hit.length ? ' ← ' + x.hit.join(',') : ''}`), shiftTabInicial: tabVolta.map((x, i) => `${i + 1} ${x.el}${x.hit.length ? ' ← ' + x.hit.join(',') : ''}`) },
  medidas,
};
fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out.resumo));
await browser.close(); await srv.fechar();
