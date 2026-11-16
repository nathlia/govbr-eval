/**
 * Tela E2 — co-violações (passo 4 da reconciliação). Aplica a regra R-CV, escrita em reconciliacao.md § 5 antes
 * desta conta, a todas as células sorteadas. A regra não muda o número de specs em nenhuma escolha: co-violação
 * nunca vira spec, só regra adicional da spec da célula sorteada.
 *
 * R-CV. Co-violação de uma célula sorteada = unidade do universo, diferente da sorteada, que a MESMA troca (a
 * variante selada, ao pé da letra) quebra no mesmo hospedeiro: (i) declarada em construcao.md › Acoplamentos para
 * o hospedeiro; ou (ii) citada pelo auditor cego em `clausulas` (não em `tambem`, que ele reserva a princípios
 * amplos e citações de apoio) de um achado reconciliado à célula (categoria sorteada ou co-violação).
 *   - Entra em `rules` da spec da célula pelo id da base literal (ponte-base.json) ou `emag:X.Y`.
 *   - Fica FORA de `rules`, registrada: unidade sem id na base literal (`semClausulaNaBase`); unidade que não é
 *     obrigação (força `recomendacao` no passo 1, ou rejeitada no passo 2 por `forca` ou `nao-normativa`).
 *   - As exclusões do sorteio (exposta, classe-em-desacordo, tentativa-e, hospedeiro fora das instâncias da
 *     unidade) e as demais rejeições do passo 2 são filtros do sorteio, não da referência: não tiram a co-violação.
 *   - Id exposto (em violations[].rules de A, A2, B ou D, expostas.json) entra marcado, para que a detecção
 *     fundamentada possa ser dada com e sem ele.
 *   - A classe da spec continua a classe selada da célula; co-violação não conta para o portão.
 * Uso: node tela-e2/coviolacoes.mjs  → coviolacoes.json
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const json = f => JSON.parse(readFileSync(join(AQUI, f), "utf8"));
const rec = json("reconciliacao.json");
const ponte = json("ponte-base.json").porUnidade;
const p2 = json("elegibilidade-passo2.json").regras;
const p1 = Object.fromEntries(json("elegibilidade.json").regras.map(r => [r.id, r]));
const expostas = json("expostas.json");
const idsExpostos = new Set(expostas.expostas.map(e => e.regra));
const construcao = readFileSync(join(AQUI, "construcao.md"), "utf8");

// construcao.md › "Acoplamentos inevitáveis" (lista transcrita; conferida contra o texto abaixo)
const DECLARADAS = {
  "btn-limpar": ["a2-df449a7d5cd8", "a2-bde476da44c9"],
  "msg-orientacao": ["a2-db30195b0e66"],
  "btn-ajuda": ["a2-460f5696acde", "a2-d47f4c470491", "a2-952e88a5af0d", "a2-db50df136f86", "a2-72ddeddc1ac8"],
  "msg-erro": ["a2-90ea0bde7e04", "a2-19a22fa26e63"],
  "lst-paises": ["a2-a14d31901423"],
};
const trecho = construcao.slice(construcao.indexOf("**Acoplamentos inevitáveis**"), construcao.indexOf("## Pontos conformes"));
for (const ids of Object.values(DECLARADAS)) for (const id of ids) if (!trecho.includes(id)) throw new Error(`${id} não está em construcao.md › Acoplamentos`);
const noTrecho = [...trecho.matchAll(/a2-[0-9a-f]{12}/g)].map(m => m[0]);
const transcritas = Object.values(DECLARADAS).flat();
for (const id of noTrecho) if (!transcritas.includes(id)) throw new Error(`${id} de construcao.md não transcrito`);

const ids = u => { const b = ponte[u]; if (!b) return []; return b.emag ? [`emag:${b.emag}`] : b.ids; };
const naoObrigacao = u => {
  if (p1[u]?.forca === "recomendacao") return "forca-recomendacao (passo 1)";
  const m = p2[u] && !p2[u].aceita ? p2[u].motivo : null;
  return m === "forca" || m === "nao-normativa" ? `${m} (passo 2)` : null;
};

const porCelula = {};
for (const s of rec.sorteadas) {
  const h = s.hospedeiro;
  const candidatas = new Map();
  for (const u of DECLARADAS[h] || []) candidatas.set(u, { origem: ["construcao.md"] });
  for (const a of rec.achados.filter(a => a.celula === s.celula))
    for (const c of a.clausulas) for (const x of c.unidades) {
      if (x.unidade === s.unidade) continue;
      const k = candidatas.get(x.unidade) || { origem: [] };
      if (!k.origem.includes(a.id)) k.origem.push(a.id);
      candidatas.set(x.unidade, k);
    }
  const lista = [...candidatas.entries()].map(([u, k]) => {
    const fora = naoObrigacao(u) ? "nao-obrigacao" : (ids(u).length ? null : "sem-clausula-na-base");
    return { unidade: u, origem: k.origem, idsBase: ids(u), passo2: p2[u] ? (p2[u].aceita ? "aceita" : p2[u].motivo) : (p1[u]?.passo1 === "rejeitada" ? `passo1:${p1[u].motivo}` : "-"),
      entraEmRules: !fora, fora, motivoNaoObrigacao: naoObrigacao(u), expostos: ids(u).filter(i => idsExpostos.has(i)) };
  });
  const rules = [...new Set([...s.idsBase, ...lista.filter(x => x.entraEmRules).flatMap(x => x.idsBase)])];
  porCelula[s.celula] = { classeSelada: s.classe, unidadeSorteada: s.unidade, idsSorteada: s.idsBase, rules,
    rulesExpostos: rules.filter(i => idsExpostos.has(i)), coviolacoes: lista };
}
const tot = Object.values(porCelula).flatMap(c => c.coviolacoes);
const out = {
  _meta: { regra: "R-CV (tela-e2/coviolacoes.mjs, cabeçalho; reconciliacao.md § 5)", data: "2026-11-14",
    contagens: { coviolacoes: tot.length, declaradas: tot.filter(x => x.origem.includes("construcao.md")).length,
      soDaAuditoria: tot.filter(x => !x.origem.includes("construcao.md")).length, entramEmRules: tot.filter(x => x.entraEmRules).length,
      foraSemClausula: tot.filter(x => x.fora === "sem-clausula-na-base").length, foraNaoObrigacao: tot.filter(x => x.fora === "nao-obrigacao").length,
      specsComIdExposto: Object.values(porCelula).filter(c => c.rulesExpostos.length).length, specsNovas: 0 } },
  porCelula,
};
writeFileSync(join(AQUI, "coviolacoes.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out._meta.contagens));
for (const [c, v] of Object.entries(porCelula)) console.log(c, v.rules.length, "rules;", v.coviolacoes.map(x => `${x.unidade}:${x.entraEmRules ? "R" : x.fora}`).join(" "), "| expostos", v.rulesExpostos.join(","));
