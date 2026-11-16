/**
 * Tela E2 — matriz de compatibilidade (metodo.md § 4.5), derivada sem semente dos efeitos declarados no passo 2
 * (vocabulário fechado tela-e2/VOCABULARIO.json), pela regra da A2 (tela-e2/sortear-sementes.mjs › compativeis), sobre
 * TODAS as colocações (célula × variante) das unidades elegíveis do passo 2, antes das exclusões do § 5.
 * Grava tela-e2/compatibilidade.json. Uso: node tela-e2/montar-compatibilidade.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { montarCelulas, compativeis } from "./sortear-sementes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = p => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const params = ler("tela-e2/parametros.json");
const { celulas, excluidas } = montarCelulas({ elegibilidade: ler("tela-e2/elegibilidade.json"), exclusoes: { porUnidade: {} } }, { ...params, motivosDeExclusao: [] });
const todas = [...celulas, ...excluidas];
const pl = todas.flatMap(c => c.variantes.map(v => ({ ...v, id: `${c.id}#${v.id}`, cel: c.id })));
const incompat = [];
for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) if (pl[i].host !== pl[j].host && !compativeis(pl[i], pl[j])) incompat.push([pl[i].id, pl[j].id]);
const comEstado = pl.filter(p => p.estado).length, comCascataTotal = pl.filter(p => p.cascata.includes("*")).length, foraDoHospedeiro = pl.filter(p => [...p.toca, ...p.remove].some(n => !n.startsWith(`${p.host}:`))).length;
writeFileSync(join(ROOT, "tela-e2/compatibilidade.json"), JSON.stringify({
  _meta: { regra: "tela-e2/metodo.md § 4.5 (A2): incompatíveis se tocam nó comum, se cascata ou remoção de raiz de uma atinge a instância de um nó da outra, ou se as duas mudam o estado da página; mesmo hospedeiro já é proibido por maxPorHospedeiro = 1", celulas: todas.length, colocacoes: pl.length, comEstado, comCascataTotal, tocamForaDoHospedeiro: foraDoHospedeiro, paresIncompativeis: incompat.length },
  incompativeis: incompat,
}) + "\n");
console.log(JSON.stringify({ celulas: todas.length, colocacoes: pl.length, comEstado, comCascataTotal, tocamForaDoHospedeiro: foraDoHospedeiro, paresIncompativeis: incompat.length }));
