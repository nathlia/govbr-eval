// Tela E2 — segunda classificação DS/G (pedido do coordenador, item A, antes do selo): monta as entradas por célula
// elegível (depois das exclusões do § 5) SÓ com o texto da regra e a colocação — sem as categorias, a razão, o tipo,
// o caminho de detecção nem a justificativa do primeiro juiz. Uso: node tela-e2/classe/preparar.mjs
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { montarCelulas } from "../sortear-sementes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const ler = p => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const params = ler("tela-e2/parametros.json");
const elegibilidade = ler("tela-e2/elegibilidade.json");
const { celulas } = montarCelulas({ elegibilidade, exclusoes: ler("tela-e2/exclusoes.json") }, { ...params, motivosDeExclusao: params.motivosDeExclusao.filter(m => m !== "classe-em-desacordo") });
const U = new Map(ler("tela-e2/universo.json").unidades.map(u => [u.id, u]));
const R = new Map(elegibilidade.regras.map(r => [r.id, r]));
const entradas = celulas.map(c => {
  const u = U.get(c.regra), r = R.get(c.regra);
  return {
    celula: c.id, hospedeiro: c.sitio, unidade: c.regra, arquivo: u.fonte.arquivo, secao: u.secao, texto: u.texto, contexto: u.contexto, antecedente: u.antecedente,
    colocacao: r.variantes.filter(v => !v.instancias || v.instancias.includes(c.sitio)).map(v => ({ variante: v.id, descricao: v.descricao, clausula: v.clausula })),
  };
}).sort((a, b) => (a.arquivo + a.unidade + a.hospedeiro < b.arquivo + b.unidade + b.hospedeiro ? -1 : 1));
const n = 4, sz = Math.ceil(entradas.length / n);
for (let i = 0; i < n; i++) writeFileSync(join(HERE, "entradas", `lote-${i + 1}.json`), JSON.stringify(entradas.slice(i * sz, (i + 1) * sz), null, 1) + "\n");
console.log(JSON.stringify({ celulas: entradas.length, lotes: n, tamanho: sz }));
