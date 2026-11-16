// Fatos dos bytes HTML servidos (sem executar scripts): fechamento de vazios, atributos booleanos com valor, indentação de head/body.
import { gravar, URL_ENTRADA } from "./comum.mjs";
const t = await (await fetch(URL_ENTRADA)).text();
const vazios = [...t.matchAll(/<(img|input|meta|link|br|hr)\b[^>]*\/>/g)].map(m => m[0].slice(0, 80));
const booleanos = [...t.matchAll(/\s(required|readonly|disabled|checked|hidden|novalidate|selected|multiple)=("[^"]*"|'[^']*')/g)].map(m => m[0].trim());
const linhas = t.split(/\r?\n/);
const headInd = linhas.filter(l => /<\/?(head|body)\b/.test(l)).map(l => l.match(/^\s*/)[0].length);
gravar("html-servido.json", { url: URL_ENTRADA, bytes: t.length, vaziosFechadosComBarra: vazios, booleanosComValor: booleanos, indentacaoHeadBody: headInd, metaRefresh: /http-equiv=["']?refresh/i.test(t), noscript: (t.match(/<noscript/g) || []).length });
console.log({ vazios: vazios.length, booleanos: booleanos.length, headInd });
