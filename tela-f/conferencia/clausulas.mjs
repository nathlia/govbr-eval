// Confere se cada trecho citado existe literalmente no arquivo do corpus.
// Trechos com "[…]" são divididos em partes; cada parte deve existir literalmente.
// Também registra se existe só após normalizar espaços (tabelas markdown com alinhamento).
import fs from 'node:fs';
import path from 'node:path';
const CORPUS = 'F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus';
const cands = JSON.parse(fs.readFileSync('F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/selecao/candidatos.json', 'utf8'));
const norm = s => s.replace(/\s+/g, ' ').trim();
const out = [];
for (const c of cands) {
  const file = path.join(CORPUS, c.clausula.arquivo);
  const txt = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const partes = c.clausula.trecho.split('[…]').map(s => s.trim()).filter(Boolean);
  const res = partes.map(p => ({
    parte: p,
    literal: txt ? txt.includes(p) : false,
    normalizado: txt ? norm(txt).includes(norm(p)) : false,
  }));
  out.push({ id: c.id, arquivo: c.clausula.arquivo, existe: !!txt, partes: res });
}
fs.writeFileSync('F:/Dev Nath/TCC/.tmp-eval/tela-f-selada/conferencia/clausulas.json', JSON.stringify(out, null, 2));
for (const o of out) console.log(o.id, o.existe, o.partes.map(p => `${p.literal ? 'L' : '-'}${p.normalizado ? 'N' : '-'}`).join(' '));
