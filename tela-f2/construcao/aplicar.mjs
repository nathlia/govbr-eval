// Uso: node aplicar.mjs <raizWorktree> <mudancas.json> <id> [<id> ...]
// Aplica as mudanças pela linha original de cada arquivo, mantendo CRLF. Falha se o "antes" não confere.
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [raiz, arqJson, ...ids] = process.argv.slice(2);
const j = JSON.parse(readFileSync(arqJson, 'utf8'));
const todas = [...j.mudancas, ...j.reservas];
const porArq = new Map();
for (const id of ids) {
   const m = todas.find((x) => x.id === id);
   if (!m) throw new Error('sem ' + id);
   const {arquivo} = m.mudanca;
   if (!porArq.has(arquivo)) porArq.set(arquivo, []);
   porArq.get(arquivo).push(m);
}
const log = [];
for (const [arquivo, ms] of porArq) {
   const p = join(raiz, arquivo);
   const txt = readFileSync(p, 'utf8');
   if (!txt.includes('\r\n') || /[^\r]\n/.test(txt)) throw new Error('não é CRLF puro: ' + arquivo);
   const fimComQuebra = txt.endsWith('\r\n');
   const linhas = txt.split('\r\n');
   if (fimComQuebra) linhas.pop();
   const num = (m) => {
      const l = String(m.mudanca.linha);
      if (l.startsWith('fim')) return Infinity;
      return parseInt(l, 10);
   };
   ms.sort((a, b) => num(b) - num(a));
   for (const m of ms) {
      const {linha, antes, depois} = m.mudanca;
      const l = String(linha);
      if (l.startsWith('fim')) {
         if (antes !== '(nada)') throw new Error(m.id);
         linhas.push(...depois.split('\n'));
         log.push(`${m.id}: +${depois.split('\n').length} linhas no fim de ${arquivo}`);
         continue;
      }
      const ini = parseInt(l, 10);
      const faixa = l.match(/^(\d+)[–-](\d+)/);
      if (faixa) {
         const a = +faixa[1], b = +faixa[2];
         const esperado = antes.split('\n');
         const atual = linhas.slice(a - 1, b);
         if (JSON.stringify(atual) !== JSON.stringify(esperado)) throw new Error(`${m.id}: linhas ${a}-${b} não conferem\n${JSON.stringify(atual)}\n${JSON.stringify(esperado)}`);
         if (!/removidas/.test(depois)) throw new Error(m.id + ': depois inesperado');
         linhas.splice(a - 1, b - a + 1);
         log.push(`${m.id}: linhas ${a}-${b} removidas de ${arquivo}`);
         continue;
      }
      const atual = linhas[ini - 1];
      const n = atual.split(antes).length - 1;
      if (n !== 1) throw new Error(`${m.id}: "antes" aparece ${n}x na linha ${ini} de ${arquivo}: ${JSON.stringify(atual)}`);
      const novo = atual.replace(antes, () => depois);
      linhas.splice(ini - 1, 1, ...novo.split('\n'));
      log.push(`${m.id}: linha ${ini} de ${arquivo}`);
   }
   writeFileSync(p, linhas.join('\r\n') + (fimComQuebra ? '\r\n' : ''));
}
console.log(log.join('\n'));
