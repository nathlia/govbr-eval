// Uso: node comparar-arvores.mjs <dirA> <dirB> [--ignorar manifesto.json]
// Lista caminho -> sha256 das duas árvores e mostra o que difere.
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';

const [a, b] = process.argv.slice(2);
const ignorar = new Set(['manifesto.json']);
function listar(raiz) {
   const out = new Map();
   const andar = (d) => {
      for (const n of readdirSync(d)) {
         const p = join(d, n);
         if (statSync(p).isDirectory()) andar(p);
         else {
            const r = relative(raiz, p).split('\\').join('/');
            if (!ignorar.has(r)) out.set(r, createHash('sha256').update(readFileSync(p)).digest('hex'));
         }
      }
   };
   andar(raiz);
   return out;
}
const A = listar(a), B = listar(b);
const soA = [...A.keys()].filter((k) => !B.has(k));
const soB = [...B.keys()].filter((k) => !A.has(k));
const dif = [...A.keys()].filter((k) => B.has(k) && A.get(k) !== B.get(k));
const iguais = [...A.keys()].filter((k) => B.has(k) && A.get(k) === B.get(k));
const lista = (m) => createHash('sha256').update([...m.entries()].sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, v]) => `${k}\t${v}\n`).join('')).digest('hex');
console.log(JSON.stringify({arquivosA: A.size, arquivosB: B.size, iguais: iguais.length, diferentes: dif, soEmA: soA, soEmB: soB, listaA: lista(A), listaB: lista(B)}, null, 1));
