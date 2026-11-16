// Remedição cega dos 14 itens de pedido.json. Uso:
//   CORPUS_DIR=".../auditoria-e2b/corpus" node servir.mjs 3221   (em segundo plano)
//   node saida/remedir.mjs [url=http://127.0.0.1:3221/cadastro-pais.html]
// Cada item: contexto novo, janela do item, carga limpa, gatilho do estado, medida. O conjunto roda 2x;
// `reproduz` = medidas idênticas nas duas rodadas. Saída: saida/remedida.json
import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const URL_PAGINA = process.argv[2] ?? 'http://127.0.0.1:3221/cadastro-pais.html';
const JANELAS = { '1280x900': { width: 1280, height: 900 }, '640x450': { width: 640, height: 450 } };

// ---------- ajudantes injetados na página ----------
const AJUDANTES = () => {
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
  };
  const sobre = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const hex = (c) => '#' + [c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const razao = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100; };
  // fundo efetivo: compõe as cores de fundo dos ancestrais (de cima para baixo) sobre branco; registra imagens de fundo
  const fundoEfetivo = (el) => {
    const camadas = []; const imagens = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') imagens.push({ el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''), img: cs.backgroundImage.slice(0, 80) });
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { camadas.push({ el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''), cor: cs.backgroundColor }); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of [...camadas].reverse()) base = sobre(parse(c.cor), base);
    return { cor: hex(base), rgb: base, camadas, imagens };
  };
  const contraste = (el) => {
    const cs = getComputedStyle(el);
    const fundo = fundoEfetivo(el);
    let fg = parse(cs.color); let op = 1;
    for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    fg = { ...fg, a: fg.a * op };
    const fgEf = sobre(fg, fundo.rgb);
    const px = parseFloat(cs.fontSize); const peso = Number(cs.fontWeight);
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    return { texto: el.textContent.trim().replace(/\s+/g, ' '), corTexto: cs.color, corTextoEfetiva: hex(fgEf), opacidadeAcumulada: op, fundoEfetivo: fundo.cor, camadasDeFundo: fundo.camadas, imagensDeFundo: fundo.imagens, fontSize: cs.fontSize, fontWeight: cs.fontWeight, textoGrande: grande, razao: razao(fgEf, fundo.rgb) };
  };
  const r = (rect) => ({ x: Math.round(rect.left * 100) / 100, y: Math.round(rect.top * 100) / 100, w: Math.round(rect.width * 100) / 100, h: Math.round(rect.height * 100) / 100, right: Math.round(rect.right * 100) / 100, bottom: Math.round(rect.bottom * 100) / 100 });
  // coordenadas de documento
  const rd = (rect) => r(new DOMRect(rect.left + scrollX, rect.top + scrollY, rect.width, rect.height));
  const linhasTexto = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return [...rg.getClientRects()].filter((q) => q.width > 0 && q.height > 0); };
  const pinta = (e) => {
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const bg = parse(cs.backgroundColor);
    if (bg && bg.a > 0) return true;
    if (['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && parse(cs['border' + s + 'Color'])?.a > 0)) return true;
    if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return true;
    if (['IMG', 'SVG', 'INPUT', 'SELECT', 'TEXTAREA', 'I'].includes(e.tagName)) return true;
    return false;
  };
  // visibilidade integral do texto de um elemento: corte por ancestrais com overflow, saída da janela, rolagem horizontal, sobreposição
  const visibilidade = (el) => {
    const cs = getComputedStyle(el);
    const linhas = linhasTexto(el);
    const uni = linhas.length ? linhas.reduce((a, q) => ({ left: Math.min(a.left, q.left), top: Math.min(a.top, q.top), right: Math.max(a.right, q.right), bottom: Math.max(a.bottom, q.bottom) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }) : null;
    const caixa = el.getBoundingClientRect();
    const cortes = [];
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const c = getComputedStyle(e);
      if (c.overflowX !== 'visible' || c.overflowY !== 'visible') {
        const q = e.getBoundingClientRect();
        const fora = uni ? { esq: Math.max(0, q.left - uni.left), dir: Math.max(0, uni.right - q.right), topo: Math.max(0, q.top - uni.top), base: Math.max(0, uni.bottom - q.bottom) } : null;
        cortes.push({ ancestral: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''), overflow: c.overflowX + '/' + c.overflowY, foraPx: fora });
      }
    }
    const vw = document.documentElement.clientWidth;
    // sobreposição: elementos que pintam, não ancestrais nem descendentes, que cruzam alguma linha de texto
    const sobreposicoes = [];
    const todos = [...document.body.querySelectorAll('*')];
    for (const o of todos) {
      if (o === el || o.contains(el) || el.contains(o)) continue;
      if (!pinta(o)) continue;
      // caixas por linha (elementos inline em várias linhas têm uma caixa por linha)
      const caixas = [...o.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
      let achou = null;
      for (const oq of caixas) for (const q of linhas) {
        const ix = Math.min(q.right, oq.right) - Math.max(q.left, oq.left);
        const iy = Math.min(q.bottom, oq.bottom) - Math.max(q.top, oq.top);
        if (ix > 0.5 && iy > 0.5 && !achou) achou = { w: Math.round(ix * 100) / 100, h: Math.round(iy * 100) / 100 };
      }
      if (achou) sobreposicoes.push({ el: o.tagName.toLowerCase() + (o.id ? '#' + o.id : '') + (typeof o.className === 'string' && o.className ? '.' + o.className.trim().split(/\s+/).join('.') : ''), interseccaoCaixaDeLinhaPx: achou });
    }
    // o que está no topo nos pontos centrais de cada linha (com o elemento rolado à vista)
    const topo = linhas.map((q) => { const x = (q.left + q.right) / 2, y = (q.top + q.bottom) / 2; const h = document.elementFromPoint(x, y); return h ? (h === el || el.contains(h) || h.contains(el) ? 'proprio' : h.tagName.toLowerCase() + (typeof h.className === 'string' && h.className ? '.' + h.className.trim().split(/\s+/).join('.') : '')) : 'fora-da-janela'; });
    return {
      texto: el.textContent.trim().replace(/\s+/g, ' '),
      caixa: rd(caixa), textoUniao: uni ? rd(new DOMRect(uni.left, uni.top, uni.right - uni.left, uni.bottom - uni.top)) : null, nLinhas: linhas.length,
      scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight,
      overflow: cs.overflowX + '/' + cs.overflowY, textOverflow: cs.textOverflow, whiteSpace: cs.whiteSpace, height: cs.height, lineHeight: cs.lineHeight,
      textoForaDaCaixaPx: uni ? { esq: Math.round(Math.max(0, caixa.left - uni.left)), dir: Math.round(Math.max(0, uni.right - caixa.right)), topo: Math.round(Math.max(0, caixa.top - uni.top)), base: Math.round(Math.max(0, uni.bottom - caixa.bottom) * 100) / 100 } : null,
      foraDaJanelaHorizPx: uni ? { esq: Math.max(0, -uni.left), dir: Math.round(Math.max(0, uni.right - vw) * 100) / 100 } : null,
      cortesPorAncestral: cortes, sobreposicoes, topoNoCentroDasLinhas: topo,
    };
  };
  const pagina = () => ({ clientW: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth, rolagemHorizontalPx: document.documentElement.scrollWidth - document.documentElement.clientWidth, innerWidth });
  const glifo = (i) => { const c = getComputedStyle(i, '::before').content; return { content: c, codepoints: [...c.replace(/^"|"$/g, '')].map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase()) }; };
  // tinta da última linha de texto de um elemento (métricas da fonte): onde o glifo realmente termina
  const tintaUltimaLinha = (el) => {
    const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    const cs = getComputedStyle(el);
    const chars = [];
    for (let i = 0; i < tn.length; i++) { const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + 1); const q = rg.getBoundingClientRect(); if (q.height > 0) chars.push({ c: tn.data[i], top: q.top, bottom: q.bottom }); }
    const topo = Math.max(...chars.map((c) => c.top));
    const ult = chars.filter((c) => Math.abs(c.top - topo) < 1);
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const txt = ult.map((c) => c.c).join('');
    const mt = cv.measureText(txt);
    const baseline = topo + mt.fontBoundingBoxAscent;
    return { texto: txt.trim(), topoAreaConteudo: Math.round((topo + scrollY) * 100) / 100, baseline: Math.round((baseline + scrollY) * 100) / 100, baseTinta: Math.round((baseline + mt.actualBoundingBoxDescent + scrollY) * 100) / 100, topoTinta: Math.round((baseline - mt.actualBoundingBoxAscent + scrollY) * 100) / 100 };
  };
  window.__m = { parse, hex, razao, fundoEfetivo, contraste, r, rd, visibilidade, pagina, glifo, linhasTexto, tintaUltimaLinha };
};

async function abrir(browser, janela, estado) {
  const ctx = await browser.newContext({ viewport: JANELAS[janela], deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL_PAGINA, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (estado === 'S1') { await page.click('#btn-salvar'); await page.waitForTimeout(500); }
  if (estado === 'S2') { await page.click('#sel-continente [data-trigger]'); await page.waitForTimeout(500); }
  await page.evaluate(`(${AJUDANTES.toString()})()`);
  return { ctx, page };
}

// ---------- medidas por item ----------
const MEDIDAS = {
  'R-01': async (page) => page.evaluate(() => {
    const { rd } = window.__m;
    const form = document.querySelector('#form-pais');
    const btn = document.querySelector('#btn-cancelar');
    const campos = [...form.querySelectorAll('.campo, fieldset')].map((e) => e.getBoundingClientRect().bottom + scrollY);
    const botoes = [...form.querySelectorAll('.acoes-formulario .br-button')].map((b) => ({ id: b.id, texto: b.textContent.trim(), classe: b.className, caixa: rd(b.getBoundingClientRect()) }));
    const f = rd(form.getBoundingClientRect()); const b = rd(btn.getBoundingClientRect());
    const barra = document.querySelector('.acoes-formulario');
    const csb = getComputedStyle(barra);
    return {
      formulario: f, botao: b, barraDeAcoes: { caixa: rd(barra.getBoundingClientRect()), display: csb.display, justifyContent: csb.justifyContent, flexDirection: csb.flexDirection },
      botoesNaOrdemDoDOM: botoes,
      distBordaEsqFormPx: Math.round((b.x - f.x) * 100) / 100, distBordaDirFormPx: Math.round((f.right - b.right) * 100) / 100,
      centroBotaoFracaoDaLargura: Math.round(((b.x + b.w / 2 - f.x) / f.w) * 1000) / 1000,
      baseDoUltimoCampo: Math.max(...campos), topoBotaoAbaixoDoUltimoCampoPx: Math.round((b.y - Math.max(...campos)) * 100) / 100,
      distBaseFormPx: Math.round((f.bottom - b.bottom) * 100) / 100,
    };
  }),
  'R-02': async (page) => page.evaluate(() => {
    const m = document.querySelector('#msg-orientacao');
    const root = getComputedStyle(document.documentElement);
    const tokens = Object.fromEntries(['--blue-warm-vivid-10', '--blue-warm-vivid-60', '--blue-warm-vivid-5', '--blue-warm-vivid-20'].map((t) => [t, root.getPropertyValue(t).trim()]));
    const bg = getComputedStyle(m).backgroundColor;
    const hexBg = window.__m.hex(window.__m.parse(bg));
    const norm = (h) => { h = h.replace('#', '').toLowerCase(); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return '#' + h; };
    return { classe: m.className, backgroundColor: bg, hex: hexBg, backgroundImage: getComputedStyle(m).backgroundImage, tokens, tokensIguais: Object.keys(tokens).filter((t) => norm(tokens[t]) === hexBg) };
  }),
  'R-03': async (page) => page.evaluate(() => {
    const { contraste, rd } = window.__m;
    const lista = document.querySelector('#sel-continente .br-list');
    const lq = lista.getBoundingClientRect();
    const itens = [...lista.querySelectorAll('.br-item')];
    const visiveis = itens.filter((it) => { const q = it.getBoundingClientRect(); const cs = getComputedStyle(it); return q.height > 0 && cs.visibility !== 'hidden' && q.bottom > lq.top && q.top < lq.bottom; });
    return {
      listaDisplay: getComputedStyle(lista).display, listaCaixa: rd(lq), gatilhoAriaExpanded: document.querySelector('#sel-continente [data-trigger]').getAttribute('aria-expanded'),
      opcoes: visiveis.map((it) => { const lab = it.querySelector('label') ?? it; return { ...contraste(lab), itemCaixa: rd(it.getBoundingClientRect()) }; }),
      nItens: itens.length, nVisiveis: visiveis.length,
    };
  }),
  'R-04': async (page) => {
    const out = { pagina: await page.evaluate(() => window.__m.pagina()) };
    for (const [k, s] of [['titulo', '#msg-orientacao .message-title'], ['texto', '#msg-orientacao .message-body'], ['conteudo', '#msg-orientacao .content']]) {
      await page.locator(s).scrollIntoViewIfNeeded();
      out[k] = await page.evaluate((s) => window.__m.visibilidade(document.querySelector(s)), s);
    }
    out.superficie = await page.evaluate(() => { const m = document.querySelector('#msg-orientacao'); return { caixa: window.__m.rd(m.getBoundingClientRect()), scrollW: m.scrollWidth, clientW: m.clientWidth, scrollH: m.scrollHeight, clientH: m.clientHeight, overflow: getComputedStyle(m).overflowX + '/' + getComputedStyle(m).overflowY }; });
    return out;
  },
  'R-05': async (page) => page.evaluate(() => {
    const { rd, linhasTexto } = window.__m;
    const g = document.querySelector('#rad-situacao');
    const lg = g.querySelector('legend');
    const linhas = linhasTexto(lg);
    const opcoes = [...g.querySelectorAll('.br-radio')].map((o) => { const lab = o.querySelector('label'); const tl = linhasTexto(lab)[0]; return { rotulo: lab.textContent.trim(), caixaOpcao: rd(o.getBoundingClientRect()), xTextoRotulo: tl ? Math.round(tl.left * 100) / 100 : null }; });
    const gq = rd(g.getBoundingClientRect()); const lq = rd(lg.getBoundingClientRect());
    const xTexto = Math.round(linhas[0].left * 100) / 100;
    const wTexto = Math.round(linhas[0].width * 100) / 100;
    return {
      grupo: gq, legenda: { texto: lg.textContent.trim(), caixa: lq, textAlign: getComputedStyle(lg).textAlign, xTexto, wTexto, yTexto: Math.round((linhas[0].top + scrollY) * 100) / 100 },
      opcoes, xInicioOpcoes: Math.min(...opcoes.map((o) => o.caixaOpcao.x)),
      deslocTextoLegendaVsOpcoesPx: Math.round((xTexto - Math.min(...opcoes.map((o) => o.caixaOpcao.x))) * 100) / 100,
      folgaEsqNoGrupoPx: Math.round((xTexto - gq.x) * 100) / 100, folgaDirNoGrupoPx: Math.round((gq.right - (xTexto + wTexto)) * 100) / 100,
      legendaAcimaDasOpcoes: (linhas[0].bottom + scrollY) <= Math.min(...opcoes.map((o) => o.caixaOpcao.y)),
    };
  }),
  'R-06': async (page) => page.evaluate(() => window.__m.contraste(document.querySelector('#inp-nome-pais label'))),
  'R-07': async (page) => {
    const out = { pagina: await page.evaluate(() => window.__m.pagina()) };
    await page.locator('#swt-certificado').scrollIntoViewIfNeeded();
    out.rotulo = await page.evaluate(() => window.__m.visibilidade(document.querySelector('#swt-certificado label')));
    out.textoDeEstado = await page.evaluate(() => {
      const sd = document.querySelector('#swt-certificado .switch-data');
      const b = getComputedStyle(sd, '::before'); const a = getComputedStyle(sd, '::after');
      const q = sd.getBoundingClientRect(); const vw = document.documentElement.clientWidth;
      // o texto de estado é conteúdo gerado (::before/::after) da .switch-data: mede-se a caixa da .switch-data
      const cortes = [];
      for (let e = sd.parentElement; e && e !== document.documentElement; e = e.parentElement) { const c = getComputedStyle(e); if (c.overflowX !== 'visible' || c.overflowY !== 'visible') { const p = e.getBoundingClientRect(); cortes.push({ ancestral: e.tagName.toLowerCase() + '.' + (e.className || ''), foraPx: { esq: Math.max(0, p.left - q.left), dir: Math.max(0, q.right - p.right), topo: Math.max(0, p.top - q.top), base: Math.max(0, q.bottom - p.bottom) } }); } }
      const lab = document.querySelector('#swt-certificado label').getBoundingClientRect();
      const lt = window.__m.linhasTexto(document.querySelector('#swt-certificado label'));
      const sobreposTextoRotulo = lt.some((l) => Math.min(l.right, q.right) - Math.max(l.left, q.left) > 0.5 && Math.min(l.bottom, q.bottom) - Math.max(l.top, q.top) > 0.5);
      const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return {
        conteudoBefore: b.content, conteudoAfter: a.content, display: getComputedStyle(sd).display, caixa: window.__m.rd(q), scrollW: sd.scrollWidth, clientW: sd.clientWidth, scrollH: sd.scrollHeight, clientH: sd.clientHeight,
        overflow: getComputedStyle(sd).overflowX + '/' + getComputedStyle(sd).overflowY, foraDaJanelaHorizPx: { esq: Math.max(0, -q.left), dir: Math.round(Math.max(0, q.right - vw) * 100) / 100 }, cortesPorAncestral: cortes,
        sobrepoeTextoDoRotulo: sobreposTextoRotulo, topoNoCentro: h ? (h === sd || sd.contains(h) ? 'proprio' : h.tagName.toLowerCase() + '.' + (h.className || '')) : 'fora-da-janela',
        situacaoTexto: document.querySelector('.situacao-configuracao')?.textContent.trim() ?? null,
      };
    });
    out.trilho = await page.evaluate(() => {
      const l = document.querySelector('#swt-certificado label'); const b = getComputedStyle(l, '::before'); const lq = l.getBoundingClientRect();
      const t = { left: lq.left + parseFloat(b.left), top: lq.top + parseFloat(b.top), w: parseFloat(b.width), h: parseFloat(b.height) };
      const linhas = window.__m.linhasTexto(l);
      const cruza = linhas.some((q) => Math.min(q.right, t.left + t.w) - Math.max(q.left, t.left) > 0.5 && Math.min(q.bottom, t.top + t.h) - Math.max(q.top, t.top) > 0.5);
      const sd = document.querySelector('#swt-certificado .switch-data').getBoundingClientRect();
      const cruzaEstado = Math.min(sd.right, t.left + t.w) - Math.max(sd.left, t.left) > 0.5 && Math.min(sd.bottom, t.top + t.h) - Math.max(sd.top, t.top) > 0.5;
      return { position: b.position, caixaDoc: { x: Math.round((t.left + scrollX) * 100) / 100, y: Math.round((t.top + scrollY) * 100) / 100, w: t.w, h: t.h }, cruzaTextoDoRotulo: cruza, cruzaTextoDeEstado: cruzaEstado };
    });
    return out;
  },
  'R-08': async (page) => page.evaluate(() => {
    const { rd } = window.__m;
    const m = document.querySelector('#msg-orientacao');
    const s = rd(m.getBoundingClientRect());
    const ic = m.querySelector('.icon i'); const icq = rd(ic.getBoundingClientRect());
    const fe = m.querySelector('.close button'); const feq = rd(fe.getBoundingClientRect());
    const ct = rd(m.querySelector('.content').getBoundingClientRect());
    return {
      superficie: s, icone: { classe: ic.className, caixa: icq, glifo: window.__m.glifo(ic) }, botaoFechar: { rotulo: fe.getAttribute('aria-label'), caixa: feq }, conteudo: ct,
      icone_relativo: { esq: Math.round((icq.x - s.x) * 100) / 100, centroXFracao: Math.round(((icq.x + icq.w / 2 - s.x) / s.w) * 1000) / 1000, topo: Math.round((icq.y - s.y) * 100) / 100, aEsquerdaDoConteudo: icq.right <= ct.x },
      fechar_relativo: { dir: Math.round((s.right - feq.right) * 100) / 100, topo: Math.round((feq.y - s.y) * 100) / 100, base: Math.round((s.bottom - feq.bottom) * 100) / 100, centroXFracao: Math.round(((feq.x + feq.w / 2 - s.x) / s.w) * 1000) / 1000, aDireitaDoConteudo: feq.x >= ct.right, centroYFracao: Math.round(((feq.y + feq.h / 2 - s.y) / s.h) * 1000) / 1000 },
    };
  }),
  'R-09': async (page) => {
    const out = { pagina: await page.evaluate(() => window.__m.pagina()) };
    for (const [k, s] of [['rotulo', '#inp-codigo label'], ['textoDeApoio', '#inp-codigo .apoio-campo']]) {
      await page.locator(s).scrollIntoViewIfNeeded();
      out[k] = await page.evaluate((s) => window.__m.visibilidade(document.querySelector(s)), s);
    }
    return out;
  },
  'R-10': async (page) => page.evaluate(() => window.__m.contraste(document.querySelector('#swt-certificado label'))),
  'R-11': async (page) => msgSelecionado(page, '#msg-erro'),
  'R-12': async (page) => page.evaluate(() => {
    const b = document.querySelector('#btn-cancelar');
    const root = getComputedStyle(document.documentElement);
    const tokens = Object.fromEntries(['--blue-warm-vivid-70', '--pure-0'].map((t) => [t, root.getPropertyValue(t).trim()]));
    return { ...window.__m.contraste(b), classe: b.className, backgroundColorProprio: getComputedStyle(b).backgroundColor, borderColor: getComputedStyle(b).borderTopColor, tokensDaDiretriz: tokens };
  }),
  'R-13': async (page) => msgSelecionado(page, '#msg-orientacao'),
  'R-14': async (page) => {
    const out = { pagina: await page.evaluate(() => window.__m.pagina()), itens: [] };
    const n = await page.locator('#lst-paises .item-pais').count();
    for (let i = 0; i < n; i++) {
      const it = page.locator('#lst-paises .item-pais').nth(i);
      await it.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      out.itens.push(await it.evaluate((el) => {
        const v = window.__m.visibilidade;
        const cs = getComputedStyle(el);
        const prox = el.nextElementSibling; const pq = prox ? prox.getBoundingClientRect() : null;
        const linhas = window.__m.linhasTexto(el);
        const ultimaBase = Math.max(...linhas.map((l) => l.bottom));
        return {
          item: { caixa: window.__m.rd(el.getBoundingClientRect()), height: cs.height, overflow: cs.overflowX + '/' + cs.overflowY, scrollH: el.scrollHeight, clientH: el.clientHeight, scrollW: el.scrollWidth, clientW: el.clientWidth, paddingBottom: cs.paddingBottom },
          divisorSeguinte: pq ? { classe: prox.className, caixa: window.__m.rd(pq), textoPassaDoTopoDoDivisorPx: Math.round((ultimaBase - pq.top) * 100) / 100 } : null,
          principal: v(el.querySelector('.texto-principal')), secundario: v(el.querySelector('.texto-secundario')),
          tintaUltimaLinhaSecundario: window.__m.tintaUltimaLinha(el.querySelector('.texto-secundario')),
        };
      }));
      // varredura de pixels (como renderizado): linhas com tinta escura entre o topo do item e o divisor seguinte
      const g = await it.evaluate((el) => { const q = el.getBoundingClientRect(); const d = el.nextElementSibling.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, yBaseItem: q.bottom, yDiv: d.top, yDivFim: d.bottom }; });
      const y0 = Math.floor(g.y), h = Math.ceil(g.yDivFim) + 3 - y0;
      const png = await page.screenshot({ clip: { x: Math.floor(g.x), y: y0, width: Math.floor(g.w), height: h } });
      const linhasPx = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data; const out = [];
        for (let y = 0; y < c.height; y++) { let esc = 0, min = 255; for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; const l = (d[i] + d[i + 1] + d[i + 2]) / 3; if (l < 150) esc++; if (l < min) min = l; } out.push({ esc, min: Math.round(min) }); }
        return out;
      }, png.toString('base64'));
      const comTinta = linhasPx.map((l, i) => (l.esc > 0 ? y0 + i : null)).filter((y) => y !== null);
      // linha de pixel do divisor: a primeira linha cinza (luminância mínima entre 150 e 250) depois da última linha com tinta
      const ultTinta = Math.max(...comTinta);
      const iDiv = linhasPx.findIndex((l, i) => y0 + i > ultTinta && l.esc === 0 && l.min >= 150 && l.min < 250);
      const rowDiv = iDiv >= 0 ? y0 + iDiv : Math.round(g.yDiv);
      out.itens[i].pixels = { coordenadas: 'janela (item rolado ao centro)', ultimaLinhaDePixelComTinta: Math.max(...comTinta), linhaDePixelDoDivisor: rowDiv, yGeometricoDoDivisor: Math.round(g.yDiv * 100) / 100, baseGeometricaDoItem: Math.round(g.yBaseItem * 100) / 100, pixelsEscurosNaLinhaDoDivisor: linhasPx[rowDiv - y0]?.esc ?? null, luminanciaMinNaLinhaDoDivisor: linhasPx[rowDiv - y0]?.min ?? null, folgaTintaAteDivisorPx: rowDiv - Math.max(...comTinta) - 1 };
    }
    return out;
  },
};

async function msgSelecionado(page, sel) {
  await page.locator(sel).scrollIntoViewIfNeeded();
  return page.evaluate((sel) => {
    const m = document.querySelector(sel);
    const root = getComputedStyle(document.documentElement);
    const tokens = Object.fromEntries(['--blue-warm-vivid-50', '--blue-warm-vivid-10', '--red-vivid-10'].map((t) => [t, root.getPropertyValue(t).trim()]));
    const bg = getComputedStyle(m).backgroundColor;
    const icones = [...m.querySelectorAll('i, svg, img')].filter((i) => { const q = i.getBoundingClientRect(); const c = getComputedStyle(i); return q.width > 0 && q.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && Number(c.opacity) > 0; })
      .map((i) => ({ classe: typeof i.className === 'string' ? i.className : i.getAttribute('class'), glifo: window.__m.glifo(i), cor: getComputedStyle(i).color, caixa: window.__m.rd(i.getBoundingClientRect()), pai: i.parentElement.className }));
    return { classe: m.className, hidden: m.hidden, display: getComputedStyle(m).display, backgroundColor: bg, hex: window.__m.hex(window.__m.parse(bg)), tokens, iconesVisiveis: icones, temFaCheck: icones.some((i) => /\bfa-check\b/.test(i.classe)) };
  }, sel);
}

// ---------- decisões (só da medida + texto literal da cláusula) ----------
const norm = (h) => { h = h.replace('#', '').toLowerCase(); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return '#' + h; };
const visivelInteiro = (v) => v.nLinhas > 0 && v.textoForaDaCaixaPx && Object.values(v.textoForaDaCaixaPx).every((x) => x === 0) && v.foraDaJanelaHorizPx.dir === 0 && v.foraDaJanelaHorizPx.esq === 0 && v.cortesPorAncestral.every((c) => !c.foraPx || Object.values(c.foraPx).every((x) => x === 0)) && v.sobreposicoes.length === 0 && v.topoNoCentroDasLinhas.every((t) => t === 'proprio');

const DECIDIR = {
  'R-01': (m) => {
    const abaixo = m.topoBotaoAbaixoDoUltimoCampoPx >= 0;
    const grupoADireita = m.barraDeAcoes.justifyContent === 'flex-end' && Math.max(...m.botoesNaOrdemDoDOM.map((b) => b.caixa.right)) === m.formulario.right;
    return abaixo && grupoADireita
      ? ['satisfaz', `O botão está abaixo do último campo (+${m.topoBotaoAbaixoDoUltimoCampoPx}px), na base do formulário (${m.distBaseFormPx}px), dentro do grupo de ações alinhado à borda direita do formulário (justify-content flex-end; último botão a 0px da borda direita), atendendo "posicionados preferencialmente abaixo e à direita do formulário".`]
      : ['viola', `O botão (a ${m.distBordaEsqFormPx}px da borda esquerda, ${m.distBordaDirFormPx}px da direita, ${m.topoBotaoAbaixoDoUltimoCampoPx}px abaixo do último campo) não fica "abaixo e à direita do formulário ao qual se referem".`];
  },
  'R-02': (m) => (m.tokensIguais.includes('--blue-warm-vivid-10') && m.backgroundImage === 'none'
    ? ['satisfaz', `Fundo computado ${m.hex} igual ao token exigido: "Superfície do Message | background | --blue-warm-vivid-10".`]
    : ['viola', `Fundo computado ${m.hex} difere de "--blue-warm-vivid-10" (${m.tokens['--blue-warm-vivid-10']}) exigido para a "Superfície do Message".`]),
  'R-03': (m) => {
    const piores = Math.min(...m.opcoes.map((o) => o.razao));
    return piores >= 4.5
      ? ['satisfaz', `Menor razão ${piores}:1 ≥ 4,5:1, o que garante "a qualidade de contraste e legibilidade para usuários com baixa visão".`]
      : ['viola', `Razão de ${piores}:1 (texto ${m.opcoes[0].corTextoEfetiva} sobre ${m.opcoes[0].fundoEfetivo}, ${m.opcoes[0].fontSize}) abaixo do mínimo AA de 4,5:1 do DS, não "garantindo a qualidade de contraste e legibilidade para usuários com baixa visão".`];
  },
  'R-04': (m) => (m.pagina.rolagemHorizontalPx <= 0 && visivelInteiro(m.titulo) && visivelInteiro(m.texto)
    ? ['satisfaz', `A 640×450 título e texto ficam inteiros (0px fora, sem corte, sobreposição nem rolagem horizontal), "legível e funcional mesmo quando redimensionada para até 200%".`]
    : ['viola', `A 640×450 há texto fora/cortado/sobreposto ou rolagem horizontal, contra "não ocorram sobreposições nem o aparecimento de uma barra horizontal".`]),
  'R-05': (m) => (Math.abs(m.deslocTextoLegendaVsOpcoesPx) <= 2 && m.legenda.textAlign !== 'center' && m.legendaAcimaDasOpcoes
    ? ['satisfaz', `Legenda no topo e começa no mesmo x das opções (${m.legenda.xTexto}), "no topo do componente alinhado à esquerda".`]
    : ['viola', `A legenda está no topo, mas o texto começa em x=${m.legenda.xTexto} contra x=${m.xInicioOpcoes} das opções (text-align ${m.legenda.textAlign}), não "alinhado à esquerda".`]),
  'R-06': (m) => (m.razao >= 4.5
    ? ['satisfaz', `Razão ${m.razao}:1 (${m.corTextoEfetiva} sobre ${m.fundoEfetivo}) ≥ 4,5:1, mínimo que o eMAG recomenda para cores "suficientemente contrastantes".`]
    : ['viola', `Razão ${m.razao}:1 < 4,5:1, cores não "suficientemente contrastantes" no mínimo do próprio eMAG.`]),
  'R-07': (m) => {
    const e = m.textoDeEstado;
    const estadoOk = !m.trilho.cruzaTextoDoRotulo && !m.trilho.cruzaTextoDeEstado && e.foraDaJanelaHorizPx.dir === 0 && e.foraDaJanelaHorizPx.esq === 0 && e.cortesPorAncestral.every((c) => Object.values(c.foraPx).every((x) => x === 0)) && !e.sobrepoeTextoDoRotulo && e.topoNoCentro === 'proprio' && e.scrollW <= e.clientW + 1;
    return m.pagina.rolagemHorizontalPx <= 0 && visivelInteiro(m.rotulo) && estadoOk
      ? ['satisfaz', `A 640×450 rótulo e texto de estado ficam inteiros (0px fora, sem sobreposição nem rolagem horizontal): "legível e funcional mesmo quando redimensionada para até 200%".`]
      : ['viola', `A 640×450 rótulo ou texto de estado fica fora/cortado/sobreposto, contra "não ocorram sobreposições nem o aparecimento de uma barra horizontal".`];
  },
  'R-08': (m) => {
    const icOk = m.icone_relativo.aEsquerdaDoConteudo && m.icone_relativo.centroXFracao < 0.5;
    const feOk = m.fechar_relativo.aDireitaDoConteudo && m.fechar_relativo.centroXFracao > 0.5 && m.fechar_relativo.topo < m.fechar_relativo.base;
    return icOk && feOk
      ? ['satisfaz', `Ícone à esquerda do conteúdo (x+${m.icone_relativo.esq}px) e Fechar no canto superior direito (topo +${m.fechar_relativo.topo}px, direita −${m.fechar_relativo.dir}px): "ícones ... à esquerda ... Botão Fechar ... no topo e à direita".`]
      : ['viola', `Disposição medida não corresponde a "ícones ... à esquerda ... Botão Fechar ... no topo e à direita".`];
  },
  'R-09': (m) => (m.pagina.rolagemHorizontalPx <= 0 && visivelInteiro(m.rotulo) && visivelInteiro(m.textoDeApoio)
    ? ['satisfaz', `A 640×450 rótulo e texto de apoio ficam inteiros (0px fora, sem corte, sobreposição nem rolagem horizontal): "legível e funcional mesmo quando redimensionada para até 200%".`]
    : ['viola', `A 640×450 há texto fora/cortado/sobreposto ou rolagem horizontal, contra "não ocorram sobreposições nem o aparecimento de uma barra horizontal".`]),
  'R-10': (m) => {
    const min = m.textoGrande ? 3 : 4.5;
    return m.razao >= min
      ? ['satisfaz', `Razão ${m.razao}:1 (${m.corTextoEfetiva} sobre ${m.fundoEfetivo}, ${m.fontSize}/${m.fontWeight}) ≥ ${min}:1, "taxa de contraste de pelo menos 4,5:1" para texto normal.`]
      : ['viola', `Razão ${m.razao}:1 < ${min}:1 exigido: "taxa de contraste de pelo menos 4,5:1".`];
  },
  'R-11': (m) => decidirSelecionado(m),
  'R-12': (m) => {
    const tokOk = norm(m.tokensDaDiretriz['--blue-warm-vivid-70']) === m.corTextoEfetiva && norm(m.tokensDaDiretriz['--pure-0']) === m.fundoEfetivo;
    return tokOk && m.razao >= 4.5
      ? ['satisfaz', `Leitura ${m.corTextoEfetiva} (--blue-warm-vivid-70) sobre superfície ${m.fundoEfetivo} (--pure-0), razão ${m.razao}:1: cores "correspondem às recomendadas na diretriz de design, garantindo um contraste adequado".`]
      : ['viola', `Leitura ${m.corTextoEfetiva} sobre ${m.fundoEfetivo} (razão ${m.razao}:1) não "correspondem às recomendadas na diretriz de design" (secundário: --blue-warm-vivid-70 sobre --pure-0) ou contraste inadequado.`];
  },
  'R-13': (m) => decidirSelecionado(m),
  'R-14': (m) => {
    const semCorteJanela = (v) => v.nLinhas > 0 && v.foraDaJanelaHorizPx.dir === 0 && v.foraDaJanelaHorizPx.esq === 0 && v.textoForaDaCaixaPx.dir === 0 && v.textoForaDaCaixaPx.esq === 0 && v.topoNoCentroDasLinhas.every((t) => t === 'proprio');
    const ok = m.pagina.rolagemHorizontalPx <= 0 && m.itens.every((i) => visivelInteiro(i.principal) && semCorteJanela(i.secundario)
      && i.tintaUltimaLinhaSecundario.baseTinta <= i.item.caixa.bottom && i.pixels.pixelsEscurosNaLinhaDoDivisor === 0 && i.pixels.folgaTintaAteDivisorPx >= 0
      && i.secundario.sobreposicoes.every((s) => /br-divider|item-pais/.test(s.el)));
    const caixaFora = Math.max(...m.itens.map((i) => i.secundario.cortesPorAncestral.reduce((a, c) => Math.max(a, c.foraPx?.base ?? 0), 0)));
    const folga = Math.min(...m.itens.map((i) => i.pixels.folgaTintaAteDivisorPx));
    if (ok) return ['satisfaz', `A 640×450 a tinta do texto de cada item fica inteira (0px de glifo cortado, nenhum pixel de texto sobre o divisor, folga mínima ${folga}px; só a caixa de linha passa ${caixaFora}px da altura fixa do item) e não há rolagem horizontal: "legível e funcional mesmo quando redimensionada para até 200%".`];
    return ['viola', `A 640×450 o texto de algum item tem glifo cortado ou sobreposto ao divisor (caixa de linha ${caixaFora}px fora da altura do item, folga ${folga}px), contra "não ocorram sobreposições".`];
  },
};
function decidirSelecionado(m) {
  const fundoSel = m.hex === norm(m.tokens['--blue-warm-vivid-50']);
  return fundoSel && m.temFaCheck
    ? ['viola', `A mensagem tem fundo ${m.hex} (--blue-warm-vivid-50) e ícone fa-check, exatamente a "Especificação para Estado Selecionado", e "O estado Selecionado não pode ser aplicado" em "Message".`]
    : fundoSel || m.temFaCheck
      ? ['indeterminado', `A mensagem tem só um dos dois sinais da especificação (fundo ${m.hex}, fa-check=${m.temFaCheck}); a especificação exige "Cor de fundo e um elemento gráfico", então não se pode afirmar estado Selecionado aplicado.`]
      : ['satisfaz', `Fundo ${m.hex} (não --blue-warm-vivid-50) e nenhum ícone fa-check: a mensagem não apresenta o estado Selecionado que "não pode ser aplicado" em "Message".`];
}

// ---------- execução ----------
const pedido = JSON.parse(await (await import('fs/promises')).readFile(join(AQUI, '..', 'pedido.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const rodadas = [{}, {}];
for (const rod of rodadas) {
  for (const it of pedido.itens) {
    const { ctx, page } = await abrir(browser, it.janela, it.estado);
    try { rod[it.id] = await MEDIDAS[it.id](page); } finally { await ctx.close(); }
  }
}
await browser.close();
const saida = { pagina: URL_PAGINA, medidoEm: new Date().toISOString(), rodadas: 2, itens: {} };
for (const it of pedido.itens) {
  const m = rodadas[0][it.id];
  const [decisao, motivo] = DECIDIR[it.id](m);
  saida.itens[it.id] = { instancia: it.instancia, estado: it.estado, janela: it.janela, medido: m, decisao, motivo, reproduz: JSON.stringify(m) === JSON.stringify(rodadas[1][it.id]) };
}
await writeFile(join(AQUI, 'remedida.json'), JSON.stringify(saida, null, 1));
const cont = Object.values(saida.itens).reduce((a, i) => ((a[i.decisao] = (a[i.decisao] ?? 0) + 1), a), {});
console.log(cont, 'reproduz', Object.values(saida.itens).filter((i) => i.reproduz).length + '/14');
for (const [id, i] of Object.entries(saida.itens)) console.log(id, i.decisao, i.reproduz, '-', i.motivo);
