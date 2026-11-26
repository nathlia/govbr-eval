/**
 * Tela F — filtros mecânicos (adendo-tela-f-protocolo-2026-11-26.md § 4 item 3), aplicados pelo agente da referência
 * a cada candidato aprovado pelo conferente, na ordem do seletor (nível; dentro dele, `ordem`).
 *
 * Reprovado pelo conferente sai antes dos filtros e não é consertado.
 * Todos os filtros são avaliados e gravados para todo candidato que entra; "sobrevive" = passa em todos.
 *   (a) construtível na rota, pelo próprio fonte (pnip-mock, ramo tela-f), respeitando os limites da fase 0;
 *       candidato com `risco` do conferente fica, marcado;
 *   (b) sem coviolação com defeito natural da rota (ground-truth-processos-1.1.0.json: mesmo elemento E mesma
 *       propriedade/regra) nem com candidato semeado à frente dele na composição;
 *   (c) nenhum id ligado (registro d) aparece em violations[].rules ou rulesLegado das referências de A, A2, B, D, E
 *       (ids fora da base servida resolvidos por normalizacao/mapa-ids.json: antigo → novos; antigo sem novos → texto
 *       antigo comparado com o trecho citado). Candidato sem id: comparado pela fonte e pelo texto — reprova se algum id
 *       das referências tem, na base servida, faixa no mesmo arquivo sobreposta ao trecho citado, ou se alguma spec das
 *       referências traz o trecho citado no próprio texto; senão não pode ser a mesma regra e passa;
 *   (d) REGISTRO, NÃO FILTRO (adendo § 4 item 3, revisto em 26/11): ids da cláusula na base que o oráculo congelado
 *       serve (tela-f/clausulas-oraculo.json, de mapear-clausulas-oraculo.mjs) ou `semIdMapeado: true`. A regra antiga
 *       (exigir id na base literal da normalização, tela-f/clausulas-base.json) fica gravada como `dAntigo`;
 *   (e) as `categories` que a spec levaria saem classe `ds` por classeDaSpec (scripts/reanalise-nat74/e14-deteccao.ts).
 * Juízos de (a), (b) e (e) estão escritos abaixo, um por candidato, com uma linha de razão.
 * Uso: node tela-f/filtros.mjs → tela-f/filtros.json
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const NORM = join(RAIZ, "../../ds-rules/govbr-ds-3.7.0-corpus/normalizacao");
const sha = b => createHash("sha256").update(b).digest("hex");
const lerBuf = p => readFileSync(p);
const lerJson = p => JSON.parse(readFileSync(p, "utf8"));
const limpa = s => String(s ?? "").replace(/\*\*|\*|__|`/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// classeDaSpec: cópia literal de scripts/reanalise-nat74/e14-deteccao.ts (conferida abaixo contra o arquivo)
const CLASSE_DA_CATEGORIA = { token: "ds", estrutura: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral", tipografia: "ds", componente: "ds", comportamento: "ds" };
const fonteE14 = readFileSync(join(RAIZ, "scripts/reanalise-nat74/e14-deteccao.ts"), "utf8");
if (!/token: "ds", estrutura: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral"/.test(fonteE14) || !/tipografia: "ds", componente: "ds", comportamento: "ds"/.test(fonteE14)) throw new Error("CLASSE_DA_CATEGORIA mudou em e14-deteccao.ts");
const classeDaSpec = cats => { for (const c of cats) if (!(c in CLASSE_DA_CATEGORIA)) throw new Error(`categoria fora do vocabulário: ${c}`); return cats.every(c => CLASSE_DA_CATEGORIA[c] === "ds") ? "ds" : "geral"; };

const candBuf = lerBuf(join(AQUI, "selecao/candidatos.json"));
const verBuf = lerBuf(join(AQUI, "conferencia/veredictos.json"));
const cand = JSON.parse(candBuf);
const ver = new Map(JSON.parse(verBuf).map(v => [v.id, v]));
const clausulas = lerJson(join(AQUI, "clausulas-base.json")); // regra antiga (dAntigo)
const oraculo = lerJson(join(AQUI, "clausulas-oraculo.json")); // registro (d)
// base servida pelo oráculo congelado: só id, source.corpusFile, source.charRange (para resolver ids das referências)
const VAL = oraculo._meta.validador;
const servida = new Map();
for (const f of Object.keys(VAL.ruleFiles)) {
  const buf = execFileSync("git", ["-C", VAL.dir, "show", `${VAL.tag}:data/knowledge/versions/${VAL.baseAtiva}/${f}`], { maxBuffer: 1 << 30 });
  if (sha(buf) !== VAL.ruleFiles[f]) throw new Error(`${f}: sha256 mudou desde clausulas-oraculo.json`);
  for (const l of buf.toString("utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); servida.set(r.id, { arquivo: r.source?.corpusFile ?? null, faixa: r.source?.charRange ?? null }); }
}

// ---------- juízos (a), (b), (e) ----------
const A = { // construtível: fonte conferido no worktree .tmp-eval/pnip-mock-f (ramo tela-f, 3d02f68)
  "F-facil-2": [true, "td do solicitante existe em processos.component.html (l. 90–91, template da rota); estilo inline no td; estado inicial."],
  "F-facil-3": [true, "search-table.utils.ts tem [style.margin-top]=\"'-38px'\" nos dois botões (l. 19 e 28); template do app, light DOM; estado inicial."],
  "F-facil-4": [true, "br-button Exportar em processos.component.html l. 9; estilo no hospedeiro (fora do shadow DOM); estado inicial."],
  "F-facil-6": [true, "div.d-flex.justify-content-end.mt-4 em processos.component.html l. 164; estado inicial."],
  "F-medio-2": [true, "br-button Voltar em processos.component.html l. 165 trocado por markup .br-button do core (light DOM, classe já global); estado inicial."],
  "F-medio-3": [true, "span.br-tag.interaction em processos.component.html l. 25; binding de estilo no próprio span (light DOM); estado inicial."],
  "F-medio-4": [true, "th Téc. Adm. em processos.component.html l. 72 (aba Tramitando, padrão); estilo inline; estado inicial."],
  "F-medio-5": [true, "div.pagination-per-page em govbr-custom-pagination.component.html + regra em src/styles.css (global, permitido na fase 0 § 5); risco do conferente mantido."],
  "F-medio-6": [true, "div.pagination-information em govbr-custom-pagination.component.html; estilo inline; estado inicial."],
  "F-dificil-2": [true, "span.content do avatar em header.component.html l. 7 (light DOM); estilo inline; estado inicial."],
  "F-dificil-3": [true, "br-button Limpar filtros em multiple-search-table.utils.ts l. 55; classe no hospedeiro, propriedade herdada atravessa o shadow DOM (fase 0 § 5); risco do conferente mantido."],
  "F-dificil-4": [true, "processos.component.scss (3 linhas; td do template da rota, encapsulamento emulado alcança); bem abaixo do orçamento de CSS; estado inicial."],
  "F-dificil-5": [true, "a[role=button] em processos.component.html l. 87; classe utilitária do core; estado inicial."],
  "F-muito-dificil-1": [true, "div.br-list em multiple-search-table.utils.ts l. 44; estado = lista de um filtro aberta por clique (dados atuais dão as listas; manipulador intocado)."],
  "F-muito-dificil-2": [true, "tag selecionada em multiple-search-table.utils.ts l. 24–28; reordenar filhos do template; estado = filtro aberto + opção escolhida (alcançável com os dados atuais)."],
  "F-muito-dificil-4": [true, "br-select.component.ts/.html do app (src/app/shared/br-select) ou src/styles.css; estado = lista do Exibir aberta (parada já existente na D); risco do conferente mantido."],
  "F-muito-dificil-5": [true, "br-tab em processos.component.html l. 13; custom properties no hospedeiro atravessam o shadow DOM (fase 0 § 5); estado = foco por teclado num item de aba; risco do conferente mantido."],
};
// (b): defeitos naturais da D 1.1.0 (D-01..D-14) e candidatos à frente. Só "mesmo elemento E mesma propriedade/regra" reprova.
const B = {
  "F-facil-2": [true, "nenhum defeito natural na célula do solicitante; F-dificil-4 (atrás) toca td em outra propriedade."],
  "F-facil-3": [true, "D-05 é o nome acessível do campo (outro elemento/propriedade); o tamanho/raio desses botões é fundo da D (E-03 removida), não spec."],
  "F-facil-4": [true, "nenhum defeito natural no Exportar (K-04 é controle conforme de foco, outra propriedade)."],
  "F-facil-6": [true, "nenhum defeito natural no contêiner do Voltar; D-10 é o iframe depois dele (outro elemento)."],
  "F-medio-2": [true, "nenhum defeito natural no Voltar; F-facil-6 (à frente) move o contêiner (outro elemento/propriedade)."],
  "F-medio-3": [true, "D-03 está no mesmo elemento mas em outra propriedade/regra (papel, foco, teclado — não forma da superfície)."],
  "F-medio-4": [true, "D-08 é o th vazio da coluna de ações (outro elemento); o texto do th continua ≥ 4,5:1 sobre branco (K-06 segue conforme)."],
  "F-medio-5": [true, "D-05 cita os seletores da paginação só como comparação (rótulo do campo de busca); nenhum defeito natural na borda do input."],
  "F-medio-6": [true, "nenhum defeito natural no módulo de informação da paginação."],
  "F-dificil-2": [true, "D-14 está no mesmo elemento mas em outra propriedade/regra (contraste da inicial, não forma da superfície)."],
  "F-dificil-3": [true, "nenhum defeito natural no rótulo do Limpar filtros."],
  "F-dificil-4": [true, "nenhum defeito natural no padding das células; F-facil-2 (à frente) toca a coluna 5 em outra propriedade."],
  "F-dificil-5": [true, "D-02 está no mesmo elemento mas em outra propriedade/regra (foco/teclado, não cor)."],
  "F-muito-dificil-1": [true, "listas abertas dos filtros ficaram fora da D (fora_de_escopo); nenhum candidato à frente toca a sombra da lista."],
  "F-muito-dificil-2": [true, "nenhum defeito natural na tag selecionada; nenhum candidato à frente toca a ordem dos filhos dela."],
  "F-muito-dificil-4": [true, "K-10 (controle conforme) está nos rádios da mesma lista, outra propriedade; F-medio-5 (à frente) toca o input, outro elemento."],
  "F-muito-dificil-5": [true, "K-05 (controle conforme) é o papel/teclado das abas, outra propriedade; nenhum defeito natural no foco das abas."],
};
// (e): categories no vocabulário das referências; acessibilidade/navegacao/formulario só se o observável é propriedade
// de acessibilidade (nome, papel, estado, alternativa, teclado, foco visível, contraste), formulário ou navegação.
const E = {
  "F-facil-2": [["componente"], "corte do texto da célula (reticências/tooltip do truncamento da Table); nome, papel, teclado e contraste intactos."],
  "F-facil-3": [["estrutura"], "posição da ação interna relativa ao campo (alinhamento); nome e operação intactos."],
  "F-facil-4": [["componente"], "largura da superfície do botão e corte do rótulo; nome acessível intacto (atributo label)."],
  "F-facil-6": [["estrutura"], "espaço entre o botão e o componente vizinho (área de proteção); nome, papel, teclado intactos."],
  "F-medio-2": [["token"], "raio da superfície do botão; nada de acessibilidade muda."],
  "F-medio-3": [["token"], "raio da superfície da tag; nada de acessibilidade muda."],
  "F-medio-4": [["token"], "cor de fundo de uma célula do header; contraste do texto continua ≥ 4,5:1."],
  "F-medio-5": [["token"], "contorno do input do select da paginação; nome e operação intactos; borda não é indicador de estado."],
  "F-medio-6": [["token"], "cor do texto do módulo de informação; contraste continua ≥ 4,5:1."],
  "F-dificil-2": [["componente"], "forma da superfície do avatar (anatomia); contraste da inicial não muda (já é D-14)."],
  "F-dificil-3": [["tipografia"], "caixa do rótulo do botão (text-transform); nome acessível intacto."],
  "F-dificil-4": [["token"], "padding vertical das células (densidade); nada de acessibilidade muda."],
  "F-dificil-5": [["token"], "cor do link entre azuis da paleta; contraste continua ≥ 4,5:1; continua distinguível como interativo pela cor."],
  "F-muito-dificil-1": [["token"], "sombra da lista flutuante; nada de acessibilidade muda."],
  "F-muito-dificil-2": [["componente"], "ordem visual dos filhos da tag selecionada (anatomia); o botão continua com a mesma função e posição no DOM relativa ao rótulo muda só no visual/ordem."],
  "F-muito-dificil-4": [["token"], "cor de fundo do item selecionado; texto branco sobre azul mais escuro mantém contraste."],
  "F-muito-dificil-5": [["token"], "cor e estilo do contorno de foco; o foco continua visível, 4px, contraste alto; só o token do DS muda."],
};

// ---------- (c): ids usados nas referências ----------
const REFS = [
  ["A", "ground-truth-solicitacao.json"], ["A2", "ground-truth-acompanhamento.json"], ["A2", "tela-a2/candidata/ground-truth-acompanhamento.json"],
  ["B", "ground-truth-vistorias.json"], ["D", "ground-truth-processos.json"], ["D", "ground-truth-processos-1.1.0.json"], ["E", "ground-truth-cadastro-pais.json"],
];
const baseBuf = lerBuf(join(NORM, "rules.jsonl"));
const naBase = new Set(baseBuf.toString("utf8").trim().split("\n").map(l => JSON.parse(l).id));
const mapaBuf = lerBuf(join(NORM, "mapa-ids.json"));
const mapa = new Map(JSON.parse(mapaBuf).mapa.map(m => [m.antigo, { novos: m.novos ?? [], texto: m.originalTextAntigo ?? "" }]));
const usados = new Map(); // id da base → [tela:spec]
const antigosSemNovos = []; // { id, texto, onde }
const lidas = [];
const textosDasSpecs = []; // { onde, texto } — para candidato sem id (comparação pelo texto)
const resolucao = { naBase: 0, mapaNovos: 0, mapaTexto: 0, foraDeFormatoIgnorados: 0, naoResolvidos: [] };
for (const [tela, arq] of REFS) {
  const buf = lerBuf(join(RAIZ, arq));
  const ref = JSON.parse(buf);
  lidas.push({ tela, arquivo: arq, sha256: sha(buf), versao: ref._meta?.version ?? null });
  for (const v of ref.violations ?? []) {
    textosDasSpecs.push({ onde: `${tela}:${v.id}`, texto: limpa(JSON.stringify(v)) });
    for (const r of [...(v.rules ?? []), ...(v.rulesLegado ?? [])]) {
      if (typeof r !== "string" || !r.startsWith("govbr-")) { resolucao.foraDeFormatoIgnorados++; continue; }
      const onde = `${tela}:${v.id}`;
      const marca = id => usados.set(id, [...new Set([...(usados.get(id) ?? []), onde])]);
      if (naBase.has(r) || servida.has(r)) { resolucao.naBase++; marca(r); continue; }
      const m = mapa.get(r);
      if (m?.novos.length) { resolucao.mapaNovos++; m.novos.forEach(marca); continue; }
      if (m) { resolucao.mapaTexto++; antigosSemNovos.push({ id: r, texto: m.texto, onde }); continue; }
      resolucao.naoResolvidos.push(r);
    }
  }
}

// ---------- aplicação ----------
const NIVEIS = ["facil", "medio", "dificil", "muito-dificil"];
const ordenados = [...cand].sort((x, y) => NIVEIS.indexOf(x.nivel) - NIVEIS.indexOf(y.nivel) || x.ordem - y.ordem);
const linhas = [];
for (const c of ordenados) {
  const v = ver.get(c.id);
  const l = { id: c.id, nivel: c.nivel, ordem: c.ordem, conferente: v.aprovado ? "aprovado" : "reprovado", risco: v.risco ?? null };
  if (!v.aprovado) { l.motivoConferente = v.motivoReprovacao; l.sobrevive = false; l.saiEm = "conferente"; linhas.push(l); continue; }
  const cl = clausulas.porCandidato[c.id]; // regra antiga
  const co = oraculo.porCandidato[c.id];   // registro (d)
  const idsAntigos = [...new Set(cl.partes.flatMap(p => p.ids ?? []).map(x => x.id))];
  const ids = co.ids;
  const [aOk, aR] = A[c.id], [bOk, bR] = B[c.id], [cats, eR] = E[c.id];
  // (c)
  const partesLimpas = co.partes.map(p => limpa(p.parte));
  const porTexto = antigosSemNovos.filter(a => { const t = limpa(a.texto); return t.length >= 15 && partesLimpas.some(p => p.includes(t) || t.includes(p)); });
  let cOk, cR;
  if (ids.length) {
    const expostosPorId = ids.filter(i => usados.has(i)).map(i => ({ id: i, em: usados.get(i) }));
    cOk = expostosPorId.length === 0 && porTexto.length === 0;
    cR = cOk ? `nenhum dos ${ids.length} id(s) ligado(s) aparece nas referências de A, A2, B, D, E`
      : `id usado em referência: ${expostosPorId.map(e => `${e.id} (${e.em.join(", ")})`).join("; ")}${porTexto.length ? `; id antigo por texto: ${porTexto.map(a => a.id).join(", ")}` : ""}`;
  } else {
    // sem id: mesma fonte (id de referência com faixa sobreposta no mesmo arquivo) ou mesmo texto citado numa spec
    const faixas = co.partes.filter(p => p.achada).map(p => p.faixaNoArquivo);
    const mesmaFonte = [...usados.keys()].filter(id => { const r = servida.get(id); return r && r.arquivo === co.arquivo && Array.isArray(r.faixa) && faixas.some(f => r.faixa[0] < f[1] && r.faixa[1] > f[0]); });
    const mesmoTexto = textosDasSpecs.filter(t => partesLimpas.some(p => p.length >= 15 && t.texto.includes(p))).map(t => t.onde);
    cOk = mesmaFonte.length === 0 && mesmoTexto.length === 0 && porTexto.length === 0;
    cR = cOk ? `sem id: nenhum id das referências tem faixa sobreposta ao trecho em ${co.arquivo}, nenhuma spec das referências traz o trecho; não pode ser a mesma regra`
      : `sem id, mas coincide: ${[...mesmaFonte, ...mesmoTexto, ...porTexto.map(a => a.id)].join(", ")}`;
  }
  // (d) registro
  const dR = ids.length ? `id(s) na base servida pelo oráculo congelado: ${ids.join(", ")}`
    : `semIdMapeado: trecho literal localizado em ${co.arquivo}, sem registro da base servida ligado a ele`;
  const dAntigoOk = idsAntigos.length > 0;
  // (e)
  const classe = classeDaSpec(cats);
  const eOk = classe === "ds";
  l.filtros = {
    a: { passa: aOk, razao: aR },
    b: { passa: bOk, razao: bR },
    c: { passa: cOk, razao: cR },
    d: { registro: true, ids, semIdMapeado: ids.length === 0, ...(ids.length ? {} : { clausula: { arquivo: co.arquivo, trecho: co.trechoLiteral } }), razao: dR },
    e: { passa: eOk, razao: `categories ${JSON.stringify(cats)} → classe ${classe}; ${eR}`, categories: cats, classe },
  };
  l.dAntigo = { passa: dAntigoOk, ids: idsAntigos, razao: dAntigoOk ? `id(s) na base literal da normalização: ${idsAntigos.join(", ")}` : "regra antiga (exigir id na base literal da normalização): nenhum id com faixa sobreposta ao trecho" };
  const primeiro = ["a", "b", "c", "e"].find(f => !l.filtros[f].passa);
  l.sobrevive = !primeiro;
  if (primeiro) l.saiEm = primeiro;
  linhas.push(l);
}
const contagem = {};
for (const n of NIVEIS) {
  const ln = linhas.filter(l => l.nivel === n);
  let vivos = ln.filter(l => l.conferente === "aprovado");
  const passo = { candidatos: ln.length, conferente: vivos.length };
  for (const f of ["a", "b", "c", "e"]) { vivos = vivos.filter(l => l.filtros[f].passa); passo[f] = vivos.length; }
  passo.dRegistro = { comId: vivos.filter(l => !l.filtros.d.semIdMapeado).length, semIdMapeado: vivos.filter(l => l.filtros.d.semIdMapeado).length };
  let antigos = ln.filter(l => l.conferente === "aprovado");
  for (const f of ["a", "b", "c"]) antigos = antigos.filter(l => l.filtros[f].passa);
  passo.dAntigo = antigos.filter(l => l.dAntigo.passa).length;
  contagem[n] = passo;
}
const saida = {
  _meta: {
    regra: "adendo-tela-f-protocolo-2026-11-26.md § 4 item 3; método em tela-f/metodo.md; juízos e cálculo em tela-f/filtros.mjs",
    insumos: {
      candidatos: { arquivo: "tela-f/selecao/candidatos.json", sha256: sha(candBuf) },
      veredictos: { arquivo: "tela-f/conferencia/veredictos.json", sha256: sha(verBuf) },
      clausulasBase: { arquivo: "tela-f/clausulas-base.json", sha256: sha(lerBuf(join(AQUI, "clausulas-base.json"))), uso: "só dAntigo" },
      clausulasOraculo: { arquivo: "tela-f/clausulas-oraculo.json", sha256: sha(lerBuf(join(AQUI, "clausulas-oraculo.json"))), uso: "registro (d) e (c)" },
      baseServida: { validador: VAL.tag, commit: VAL.commit, ruleFiles: VAL.ruleFiles, camposLidos: ["id", "source.corpusFile", "source.charRange"] },
      base: { arquivo: "ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl", sha256: sha(baseBuf), camposLidos: ["id", "source.corpusFile", "source.charRange", "originalText"] },
      mapaIds: { arquivo: "ds-rules/govbr-ds-3.7.0-corpus/normalizacao/mapa-ids.json", sha256: sha(mapaBuf), camposLidos: ["antigo", "novos", "originalTextAntigo"] },
      referencias: lidas,
      pnipMock: "F:/Dev Nath/TCC/.tmp-eval/pnip-mock-f, ramo tela-f @ 3d02f68 (só leitura)",
    },
    resolucaoDosIdsDasReferencias: { ...resolucao, naoResolvidos: resolucao.naoResolvidos.length, idsDaBaseUsados: usados.size },
    sobreviventesPorNivelDepoisDeCadaFiltro: contagem,
  },
  candidatos: linhas,
};
writeFileSync(join(AQUI, "filtros.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(JSON.stringify(contagem));
console.log(JSON.stringify(saida._meta.resolucaoDosIdsDasReferencias));
for (const l of linhas) console.log(l.id, l.sobrevive ? "SOBREVIVE" : `sai em ${l.saiEm}`, l.risco ? "(risco)" : "");
