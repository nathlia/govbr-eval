// Uso: node tokdiff.mjs <arqA> <arqB>  -> imprime os trechos (hunks) diferentes, em tokens, via diff do sistema
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const [a, b] = process.argv.slice(2);
const RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|[A-Za-z_$][\w$]*|\d[\w.]*|\s+|./gs;
const NORM = process.argv.includes("--norm");
// --norm: sem tratar aspas; identificadores de 1-2 caracteres (nomes locais do minificador) viram "ID"
const RE2 = /[A-Za-z_$][\w$]*|\d[\w.]*|\s+|./gs;
const tok = (s) => NORM ? s.match(RE2).filter((t) => !/^\s+$/.test(t)).map((t) => (/^[A-Za-z_$][\w$]?$/.test(t) ? 'ID' : t)) : s.match(RE).filter((t) => !/^\s+$/.test(t)).map((t) => t.replace(/\r?\n/g, '\\n'));
const d = mkdtempSync(join(tmpdir(), 'tokdiff-'));
const ta = tok(readFileSync(a, 'utf8')), tb = tok(readFileSync(b, 'utf8'));
writeFileSync(join(d, 'a'), ta.join('\n') + '\n');
writeFileSync(join(d, 'b'), tb.join('\n') + '\n');
let out = '';
try { out = execFileSync('diff', [join(d, 'a'), join(d, 'b')], {maxBuffer: 1 << 28}).toString(); } catch (e) { out = e.stdout.toString(); }
const hunks = [];
for (const l of out.split('\n')) {
   if (/^\d/.test(l)) hunks.push({h: l, a: [], b: []});
   else if (l.startsWith('< ')) hunks.at(-1).a.push(l.slice(2));
   else if (l.startsWith('> ')) hunks.at(-1).b.push(l.slice(2));
}
console.log(JSON.stringify({tokensA: ta.length, tokensB: tb.length, hunks: hunks.length, lista: hunks.map((x) => ({h: x.h, a: x.a.join(' ').slice(0, 500), b: x.b.join(' ').slice(0, 500)}))}, null, 1));
