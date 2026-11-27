// Sonda 5 (para escolher a largura de M-04): largura necessária, sem quebra, de cada célula da coluna Solicitante,
// em todas as abas, com "Meus processos" ligado e desligado, em todas as páginas e com 10/25/50 por página.
// Necessária = largura do conteúdo em uma linha + padding + borda (box-sizing da célula informado).
// Opcional: --forcar <px> injeta max-width na célula (só nesta sonda, para conferir a escolha antes do build).
// Uso: node sondar5.mjs <dir> <porta> <saida.json> [--forcar 470]
import {writeFile} from 'node:fs/promises';
import {chromium, servir, abrir} from './comum.mjs';

const args = process.argv.slice(2);
const [dir, porta, saida] = args.filter((x, i) => !x.startsWith('--') && args[i - 1] !== '--forcar');
const forcar = args.includes('--forcar') ? +args[args.indexOf('--forcar') + 1] : null;
const s = await servir(dir, +porta);
const b = await chromium.launch({headless: true});

const LER = () => {
   const t = document.querySelector('pnip-mpa-processos .br-table table');
   if (!t) return null;
   const ths = [...t.querySelectorAll('thead th')];
   const k = ths.findIndex((x) => x.textContent.trim() === 'Solicitante');
   const caixa = document.querySelector('pnip-mpa-processos .br-table');
   const linhas = [...t.querySelectorAll('tbody tr')].map((tr) => {
      const td = tr.children[k];
      const c = getComputedStyle(td);
      const r = document.createRange(); r.selectNodeContents(td);
      // largura do conteúdo numa linha: clonar a célula num contêiner sem limite
      const sonda = document.createElement('div');
      sonda.style.cssText = `position:absolute;left:-99999px;top:0;white-space:nowrap;font:${c.font};letter-spacing:${c.letterSpacing}`;
      sonda.innerHTML = td.innerHTML;
      document.body.appendChild(sonda);
      const conteudo = sonda.getBoundingClientRect().width;
      sonda.remove();
      const extra = parseFloat(c.paddingLeft) + parseFloat(c.paddingRight) + parseFloat(c.borderLeftWidth) + parseFloat(c.borderRightWidth);
      return {texto: td.textContent.replace(/\s+/g, ' ').trim(), necessaria: Math.ceil((conteudo + extra) * 100) / 100, scrollW: td.scrollWidth, clientW: td.clientWidth, w: Math.round(td.getBoundingClientRect().width * 100) / 100, cortada: td.scrollWidth > td.clientWidth, boxSizing: c.boxSizing, title: td.getAttribute('title'), textOverflow: c.textOverflow,
         alturas: [...tr.children].map((x) => Math.round(x.getBoundingClientRect().height))};
   });
   return {linhas, larguras: ths.map((x) => Math.round(x.getBoundingClientRect().width * 100) / 100), tabela: {scrollW: caixa.scrollWidth, clientW: caixa.clientWidth, tabelaW: Math.round(t.getBoundingClientRect().width), transborda: caixa.scrollWidth > caixa.clientWidth, docTransborda: document.documentElement.scrollWidth > document.documentElement.clientWidth}};
};
const aba = async (p, rot) => { await p.locator('pnip-mpa-processos br-tab li.tab-item button', {hasText: rot}).click(); await p.waitForTimeout(1500); };
const exibir = async (p, v) => {
   const sel = p.locator('govbr-custom-pagination br-select-pnip[label="Exibir"]');
   await sel.scrollIntoViewIfNeeded();
   await sel.locator('button[aria-label="Exibir lista"]').click();
   await p.waitForTimeout(500);
   await sel.locator('div.br-list div.br-item', {hasText: new RegExp(`^\\s*${v}\\s*$`)}).click();
   await p.waitForTimeout(1500);
};
const total = (p) => p.evaluate(() => +document.querySelector('govbr-custom-pagination nav.br-pagination.small')?.getAttribute('data-total') || 1);

// cenários: [nome, preparo]
const CENARIOS = [];
for (const [abaRot, meus] of [['inicial', null], ['Aguardando análise', null], ['Tramitando', true], ['Tramitando', false], ['Concluídos', null]]) {
   for (const por of ['10', '25', '50']) CENARIOS.push([abaRot, meus, por]);
}
const res = [];
try {
   for (const [abaRot, meus, por] of CENARIOS) {
      const {ctx, pagina: p, eventos} = await abrir(b, s.base);
      if (forcar) await p.addStyleTag({content: `pnip-mpa-processos td.solicitante { max-width: ${forcar}px !important; }`});
      if (abaRot !== 'inicial') await aba(p, abaRot);
      if (meus === false) { await p.locator('pnip-mpa-processos span.br-tag.interaction', {hasText: 'Meus processos'}).click(); await p.waitForTimeout(1500); }
      if (por !== '10') await exibir(p, por);
      const n = await total(p);
      for (let pg = 1; pg <= n; pg++) {
         if (pg > 1) { await p.locator('govbr-custom-pagination button[aria-label="Página seguinte"]').click(); await p.waitForTimeout(1500); }
         await p.mouse.move(1, 1);
         const r = await p.evaluate(LER);
         res.push({aba: abaRot, meus, por, pagina: pg, ...r, eventos});
      }
      await ctx.close();
   }
} finally { await b.close(); s.s.close(); }
const todas = res.flatMap((x) => x.linhas.map((l) => ({...l, cen: `${x.aba}|${x.meus}|${x.por}|p${x.pagina}`})));
const longas = todas.filter((l) => l.texto.includes('Comprido'));
const outras = todas.filter((l) => !l.texto.includes('Comprido'));
const max = Math.max(...outras.map((l) => l.necessaria));
const resumo = {forcar, cenarios: res.length, celulas: todas.length, maiorNecessariaOutras: max, celulaMaior: outras.find((l) => l.necessaria === max)?.texto, necessariaLonga: [...new Set(longas.map((l) => l.necessaria))], longaEm: [...new Set(longas.map((l) => l.cen))],
   cortadasOutras: outras.filter((l) => l.cortada).length, longasCortadas: longas.filter((l) => l.cortada).length + '/' + longas.length,
   transbordaTabela: res.filter((x) => x.tabela.transborda).map((x) => `${x.aba}|${x.meus}|${x.por}|p${x.pagina}`), transbordaDoc: res.filter((x) => x.tabela.docTransborda).length, boxSizing: [...new Set(todas.map((l) => l.boxSizing))]};
console.log(JSON.stringify(resumo, null, 1));
await writeFile(saida, JSON.stringify({resumo, res}, null, 1));
