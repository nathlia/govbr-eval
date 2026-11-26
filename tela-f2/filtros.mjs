/**
 * Tela F2 — filtros mecânicos (adendo-2-tela-f2-protocolo-2026-11-26.md § 4 item 4; adendo da F § 4 item 3), aplicados
 * pelo agente da referência a cada candidato aprovado pelo conferente, na ordem do seletor (tipo; dentro dele, `ordem`).
 *
 * Entrada: o conferente reprova (sai, não é consertado) ou discorda do tipo (sai, adendo 2 § 4 item 3). Discordância de
 * nível não reprova; o nível OFICIAL é o MENOR dos dois (decisão do orquestrador, conservadora para o teto) e os dois
 * ficam gravados.
 * Todos os filtros são avaliados e gravados para todo candidato que entra; "sobrevive" = passa em (a), (b) e (c).
 *   (a) construtível na rota, pelo próprio fonte (pnip-mock, ramo tela-f2 @ 3d02f68; tela-f2/conferir-fonte.json:
 *       arquivo igual ao do seletor, trecho "de" na linha declarada) e o estado alcançável com os dados atuais;
 *   (b) sem coviolação com defeito natural da rota (ground-truth-processos-1.1.0.json, D-01..D-14) nem com candidato
 *       semeado à frente dele na composição (ordem T1 → T4, dentro do tipo a do seletor): mesmo elemento E mesma
 *       propriedade, ou uma mudança esconde/anula a outra. Colisões do conferente (veredictos.json › colisoes) entram.
 *       Juízos escritos abaixo, um por candidato, com uma linha de razão; a parte "semeado à frente" é calculada;
 *   (c) a regra não foi usada nas referências de A, A2, B, D, E nem da F: nenhum id ligado (registro d) aparece em
 *       violations[].rules ou rulesLegado delas (ids fora da base servida resolvidos por normalizacao/mapa-ids.json, como
 *       na F) E nenhuma faixa de id usado (ou cláusula sem id de `_meta.semIdMapeado` delas) se sobrepõe, no mesmo
 *       arquivo do corpus, ao trecho citado; candidato sem id também reprova se alguma spec das referências traz o
 *       trecho citado no próprio texto. (A sobreposição vale aqui também para candidato com id: mais estrito que a F.)
 *   (d) REGISTRO, NÃO FILTRO: ids da cláusula na base servida pelo oráculo congelado (tela-f2/clausulas-oraculo.json)
 *       ou `semIdMapeado: true` com arquivo e trecho.
 *   (e) REGISTRO: as `categories` que a spec levaria e a classe por classeDaSpec (a referência da F2 exige semeadas no
 *       vocabulário ds; o adendo 2 não lista este filtro, por isso fica como conferência: se algum desse "geral",
 *       o script para).
 * Uso: node tela-f2/filtros.mjs → tela-f2/filtros.json
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const NORM = join(RAIZ, "../../ds-rules/govbr-ds-3.7.0-corpus/normalizacao");
const VAL = "F:/Dev Nath/TCC/.tmp-eval/validator-3712r";
const sha = b => createHash("sha256").update(b).digest("hex");
const lerBuf = p => readFileSync(p);
const lerJson = p => JSON.parse(readFileSync(p, "utf8"));
const limpa = s => String(s ?? "").replace(/\*\*|\*|__|`/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const CLASSE_DA_CATEGORIA = { token: "ds", estrutura: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral", tipografia: "ds", componente: "ds", comportamento: "ds" };
const fonteE14 = readFileSync(join(RAIZ, "scripts/reanalise-nat74/e14-deteccao.ts"), "utf8");
if (!/token: "ds", estrutura: "ds", acessibilidade: "geral", navegacao: "geral", formulario: "geral"/.test(fonteE14) || !/tipografia: "ds", componente: "ds", comportamento: "ds"/.test(fonteE14)) throw new Error("CLASSE_DA_CATEGORIA mudou em e14-deteccao.ts");
const classeDaSpec = cats => { for (const c of cats) if (!(c in CLASSE_DA_CATEGORIA)) throw new Error(`categoria fora do vocabulário: ${c}`); return cats.every(c => CLASSE_DA_CATEGORIA[c] === "ds") ? "ds" : "geral"; };

const candBuf = lerBuf(join(AQUI, "selecao/candidatos.json"));
const verBuf = lerBuf(join(AQUI, "conferencia/veredictos.json"));
const fonteBuf = lerBuf(join(AQUI, "conferir-fonte.json"));
const oracBuf = lerBuf(join(AQUI, "clausulas-oraculo.json"));
const cand = JSON.parse(candBuf);
const verJ = JSON.parse(verBuf);
const ver = new Map(verJ.candidatos.map(v => [v.id, v]));
const fonte = JSON.parse(fonteBuf).porCandidato;
const oraculo = JSON.parse(oracBuf);

const NIVEIS = ["fácil", "médio", "difícil", "muito difícil"];
const SLUG = { "fácil": "facil", "médio": "medio", "difícil": "dificil", "muito difícil": "muito-dificil" };
const TIPOS = ["T1", "T2", "T3", "T4"];

// base servida (id → arquivo, faixa) — para resolver ids das referências e medir sobreposição
const VM = oraculo._meta.validador;
const servida = new Map();
for (const f of Object.keys(VM.ruleFiles)) {
  const buf = lerBuf(join(VAL, `data/knowledge/versions/${VM.baseAtiva}/${f}`));
  if (sha(buf) !== VM.ruleFiles[f]) throw new Error(`${f}: sha256 mudou desde clausulas-oraculo.json`);
  for (const l of buf.toString("utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); servida.set(r.id, { arquivo: r.source?.corpusFile ?? null, faixa: r.source?.charRange ?? null }); }
}

// ---------- juízos (a) e (b, parte natural), (e) ----------
const A = { // estado alcançável e construção pelo fonte; a conferência textual está em conferir-fonte.json
  "T1-1": [true, "bloco <li> da seta anterior em govbr-custom-pagination.component.html l. 8–12 (trecho do seletor sem a indentação); estado inicial, rolagem até a paginação."],
  "T1-2": [true, "span.content do avatar em header.component.html l. 7 (light DOM); só a classe; estado inicial."],
  "T1-4": [true, "br-button Exportar em processos.component.html l. 9; atributos de entrada do web component (icon, title); o conferente viu o ícone renderizado; estado inicial."],
  "T1-5": [true, "botão da tag selecionada em multiple-search-table.utils.ts l. 28 (light DOM); estado = filtro aberto + 1ª opção escolhida, alcançável com os dados atuais (o conferente testou a remoção)."],
  "T2-1": [true, "acréscimo no processos.component.scss (td do template da rota; encapsulamento emulado alcança); bem abaixo do orçamento de CSS; estado inicial."],
  "T2-2": [true, "span.content do avatar em header.component.html l. 7; estilo inline; estado inicial."],
  "T2-3": [true, "h2 em processos.component.html l. 6; estilo inline; estado inicial."],
  "T2-4": [true, "span.text-truncate da tag Meus processos em processos.component.html l. 29; estilo inline; estado inicial."],
  "T2-5": [true, "br-divider em processos.component.html l. 2; custom property no hospedeiro atravessa o shadow DOM (fase 0 § 5); estado inicial."],
  "T2-6": [true, "acréscimo no header.component.scss (br-header está no template do header, recebe o atributo de escopo); custom property atravessa o shadow DOM; estado inicial."],
  "T3-1": [true, "acréscimo no processos.component.scss (th do template da rota); estado inicial."],
  "T3-2": [true, "span.br-tag Meus processos em processos.component.html l. 25; classe utilitária do core; estado inicial."],
  "T3-3": [true, "br-breadcrumb em processos.component.html l. 1; custom property no hospedeiro; estado inicial."],
  "T3-4": [true, "br-tab em processos.component.html l. 13; custom property no hospedeiro; estado inicial."],
  "T3-5": [true, "div.br-list em src/app/shared/br-select/br-select.component.html l. 10; estado = lista do Exibir aberta (parada já existente na D)."],
  "T3-6": [true, "1º button.br-button (Buscar) em search-table.utils.ts l. 17–18 (o trecho também ocorre no l. 26, o do Limpar: o construtor muda só o do l. 17); estado inicial."],
  "T4-1": [true, "acréscimo no processos.component.scss (br-button[disabled] do template da rota; custom property atravessa o shadow DOM); estado inicial."],
  "T4-2": [true, "br-tab-item TRAMITANDO em processos.component.html l. 15; o conferente reproduziu na carga (página continua navegável); estado inicial."],
  "T4-3": [true, "br-button Voltar em processos.component.html l. 165; custom property no hospedeiro; estado = hover no Voltar."],
  "T4-4": [true, "br-input em search-table.utils.ts l. 9; custom property no hospedeiro; estado = foco no campo de busca."],
  "T4-5": [true, "div.br-item em src/app/shared/br-select/br-select.component.html l. 18; estado = lista do Exibir aberta + hover num item não selecionado."],
};
// (b) natural: defeitos da D 1.1.0. Só "mesmo elemento E mesma propriedade/regra" ou "um esconde o outro" reprova.
const B = {
  "T1-1": [true, "nenhum defeito natural na paginação."],
  "T1-2": [true, "D-14 está no mesmo elemento mas em outra propriedade (contraste da inicial): o conferente mediu fundo rgb(255,140,0) e fonte 24,192px iguais antes e depois, a inicial continua visível, logo D-14 continua observável; NOTA para a fase 2: a âncora de D-14 (`.br-avatar .content`) deixa de casar e tem de ser reancorada no mesmo elemento, sem mudar a descrição."],
  "T1-4": [true, "nenhum defeito natural no Exportar."],
  "T1-5": [true, "D-03 (papel/teclado das tags, estado inicial) não alcança o botão interno da tag selecionada, que só existe com filtro escolhido; outra propriedade."],
  "T2-1": [true, "nenhum defeito natural no padding das células do corpo."],
  "T2-2": [false, "D-14 está no mesmo elemento E na mesma propriedade: a cor de fundo do avatar é um dos dois termos do contraste de D-14 (descrição de D-14 cita #ff8c00); mudar o fundo muda a medida de D-14."],
  "T2-3": [true, "D-07/D-12 tocam o h2 só como estrutura (associação à tabela, nível de título); outra propriedade."],
  "T2-4": [true, "D-03 está na mesma tag mas em outra propriedade (papel/teclado), não no tamanho da fonte do rótulo."],
  "T2-5": [true, "nenhum defeito natural no divider."],
  "T2-6": [true, "nenhum defeito natural na superfície do cabeçalho (D-11/D-12 ancoram na raiz, outra propriedade)."],
  "T3-1": [true, "D-08 é o th vazio da coluna de ações (estrutura), não o fundo do cabeçalho; outra propriedade."],
  "T3-2": [true, "D-03 está na mesma tag mas em outra propriedade (papel/teclado), não no raio."],
  "T3-3": [true, "nenhum defeito natural no breadcrumb."],
  "T3-4": [true, "nenhum defeito natural nas abas."],
  "T3-5": [true, "listas abertas da paginação sem defeito natural na D."],
  "T3-6": [true, "D-05 é o nome acessível do input interno (outro elemento); nenhum defeito natural no botão de ação interna."],
  "T4-1": [true, "D-01 está nos mesmos botões mas em outra propriedade (rótulo e tipo circular), não na opacidade do estado desabilitado."],
  "T4-2": [true, "nenhum defeito natural nas abas."],
  "T4-3": [true, "nenhum defeito natural no Voltar."],
  "T4-4": [true, "D-05 está no mesmo input mas em outra propriedade (nome acessível), não na cor do foco; o foco continua visível (conferente)."],
  "T4-5": [true, "listas abertas da paginação sem defeito natural na D."],
};
// colisões entre candidatos que não estão em veredictos.json › colisoes, achadas aqui (mesmo elemento E mesma propriedade, ou uma esconde a outra)
const COLISOES_EXTRA = [];
const E = {
  "T1-1": [["componente", "estrutura"], "parte obrigatória ausente (seta de navegação); nome, papel e teclado da seta restante intactos."],
  "T1-2": [["componente", "estrutura"], "classe obrigatória do conteúdo do avatar ausente; contraste da inicial não muda (já é D-14)."],
  "T1-4": [["componente", "estrutura"], "rótulo obrigatório ausente no tipo padrão; nome acessível preservado pelo title (árvore AX do conferente)."],
  "T1-5": [["componente", "estrutura"], "classe obrigatória do botão ausente; botão nativo continua operável e removendo o filtro."],
  "T2-1": [["token"], "padding fora da escala; nada de acessibilidade muda."],
  "T2-2": [["token"], "cor fora da paleta na superfície do avatar."],
  "T2-3": [["tipografia", "token"], "tamanho fora da escala tipográfica; hierarquia de títulos intacta."],
  "T2-4": [["tipografia", "token"], "tamanho fora da escala no rótulo da tag; legível."],
  "T2-5": [["token"], "cor fora da paleta no divider."],
  "T2-6": [["token"], "sombra fora dos tokens no cabeçalho."],
  "T3-1": [["token"], "token de cor no lugar errado; contraste do texto do th continua alto."],
  "T3-2": [["token"], "token de raio no lugar errado."],
  "T3-3": [["token"], "azul da paleta no lugar do previsto; contraste continua ≥ 4,5:1."],
  "T3-4": [["tipografia", "token"], "degrau da escala no lugar errado no rótulo da aba."],
  "T3-5": [["token"], "sombra do sistema no lugar errado."],
  "T3-6": [["componente", "token"], "densidade do botão de ação interna; nome e operação intactos."],
  "T4-1": [["comportamento", "token"], "estado desabilitado sem o tratamento visual; o botão continua desabilitado (cursor, atributo)."],
  "T4-2": [["comportamento"], "item ativo da aba não corresponde ao conteúdo; navegação entre abas intacta."],
  "T4-3": [["comportamento", "token"], "hover sem o overlay prescrito; nada de acessibilidade muda."],
  "T4-4": [["comportamento", "token"], "cor de foco do DS trocada; o foco continua visível (2 px)."],
  "T4-5": [["comportamento"], "hover do item da lista sem realce; seleção por clique/teclado intacta."],
};

// ---------- (c): ids e cláusulas usados nas referências ----------
const REFS = [
  ["A", "ground-truth-solicitacao.json"], ["A2", "ground-truth-acompanhamento.json"], ["A2", "tela-a2/candidata/ground-truth-acompanhamento.json"],
  ["B", "ground-truth-vistorias.json"], ["D", "ground-truth-processos.json"], ["D", "ground-truth-processos-1.1.0.json"], ["E", "ground-truth-cadastro-pais.json"],
  ["F", "ground-truth-processos-f.json"],
];
const baseBuf = lerBuf(join(NORM, "rules.jsonl"));
const naBase = new Set(baseBuf.toString("utf8").trim().split("\n").map(l => JSON.parse(l).id));
const mapaBuf = lerBuf(join(NORM, "mapa-ids.json"));
const mapa = new Map(JSON.parse(mapaBuf).mapa.map(m => [m.antigo, { novos: m.novos ?? [], texto: m.originalTextAntigo ?? "" }]));
const usados = new Map();
const antigosSemNovos = [];
const clausulasSemId = []; // { onde, arquivo, trecho } das referências
const lidas = [];
const textosDasSpecs = [];
const resolucao = { naBase: 0, mapaNovos: 0, mapaTexto: 0, foraDeFormatoIgnorados: 0, naoResolvidos: [] };
for (const [tela, arq] of REFS) {
  const buf = lerBuf(join(RAIZ, arq));
  const ref = JSON.parse(buf);
  lidas.push({ tela, arquivo: arq, sha256: sha(buf), versao: ref._meta?.version ?? null });
  for (const [id, cl] of Object.entries(ref._meta?.semIdMapeado?.specs ?? {})) clausulasSemId.push({ onde: `${tela}:${id}`, arquivo: cl.arquivo, trecho: cl.trecho });
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
// cláusulas sem id das referências → faixa no corpus (mesma indexação do mapear-clausulas-oraculo)
const CORPUS = join(RAIZ, "../../ds-rules/govbr-ds-3.7.0-corpus");
function indexar(t) { const out = [], map = []; let i = 0, esp = true; while (i < t.length) { if (t.startsWith("**", i) || t.startsWith("__", i)) { i += 2; continue; } const c = t[i]; if (c === "*" || c === "`") { i++; continue; } if (c === "\\" && (t[i + 1] === "[" || t[i + 1] === "]")) { i++; continue; } if (/\s/.test(c)) { if (!esp) { out.push(" "); map.push(i); esp = true; } i++; continue; } out.push(c); map.push(i); esp = false; i++; } return { s: out.join(""), map }; }
for (const cs of clausulasSemId) {
  const idx = indexar(readFileSync(join(CORPUS, cs.arquivo), "utf8"));
  const p = indexar(cs.trecho).s.trim();
  cs.faixas = [];
  for (let k = idx.s.indexOf(p); k >= 0; k = idx.s.indexOf(p, k + 1)) cs.faixas.push([idx.map[k], idx.map[k + p.length - 1] + 1]);
}

// ---------- aplicação ----------
const menor = (a, b) => NIVEIS[Math.min(NIVEIS.indexOf(a), NIVEIS.indexOf(b))];
const colisoes = [...verJ.colisoes.map(c => ({ par: c.par, motivo: c.motivo, fonte: "conferente" })), ...COLISOES_EXTRA];
const ordenados = [...cand].sort((x, y) => TIPOS.indexOf(x.tipo) - TIPOS.indexOf(y.tipo) || x.ordem - y.ordem);
const linhas = [];
const semeadosAFrente = []; // ids que entram na composição, na ordem
const contaTipo = Object.fromEntries(TIPOS.map(t => [t, 0]));
for (const c of ordenados) {
  const v = ver.get(c.id);
  const l = { id: c.id, tipo: c.tipo, subtipo: c.subtipo ?? null, ordem: c.ordem, exigeInteracao: c.exigeInteracao,
    conferente: v.veredito === "APROVADO" ? "aprovado" : "reprovado",
    nivelDoSeletor: c.nivel, nivelDoConferente: v.nivelDoConferente ?? null };
  if (v.veredito !== "APROVADO") { l.motivoConferente = `${v.categoriaReprovacao}: ${v.motivo}`; l.sobrevive = false; l.saiEm = "conferente"; linhas.push(l); continue; }
  if (v.tipoDoConferente !== c.tipo) { l.sobrevive = false; l.saiEm = "conferente-discorda-do-tipo"; linhas.push(l); continue; }
  if (v.exigeInteracao !== c.exigeInteracao) throw new Error(`${c.id}: exigeInteracao diverge entre seletor e conferente`);
  l.nivel = menor(c.nivel, v.nivelDoConferente);
  l.nivelSlug = SLUG[l.nivel];
  l.nivelRegra = c.nivel === v.nivelDoConferente ? "seletor = conferente" : "seletor ≠ conferente: oficial = o menor (decisão do orquestrador)";
  const co = oraculo.porCandidato[c.id];
  const ids = co.ids;
  const fa = fonte[c.id];
  const [aJ, aR] = A[c.id], [bNat, bR] = B[c.id], [cats, eR] = E[c.id];
  // (a)
  const aFonte = fa.existe && fa.igualAoDoSeletor && (fa.acrescimo || (fa.ocorrencias >= 1 && fa.linhaConfere));
  const aOk = aJ && aFonte;
  // (b) com candidatos semeados à frente
  const contra = colisoes.filter(k => k.par.includes(c.id)).map(k => ({ outro: k.par.find(x => x !== c.id), motivo: k.motivo, fonte: k.fonte }));
  const aFrente = contra.filter(k => semeadosAFrente.includes(k.outro));
  const bOk = bNat && aFrente.length === 0;
  // (c)
  const partesLimpas = co.partes.map(p => limpa(p.parte));
  const faixas = co.partes.filter(p => p.achada).map(p => p.faixaNoArquivo);
  const sobrepoe = f => faixas.some(x => f[0] < x[1] && f[1] > x[0]);
  const porId = ids.filter(i => usados.has(i)).map(i => ({ id: i, em: usados.get(i) }));
  const porFaixa = [...usados.keys()].filter(id => { const r = servida.get(id); return r && r.arquivo === co.arquivo && Array.isArray(r.faixa) && sobrepoe(r.faixa); }).map(id => ({ id, em: usados.get(id) }));
  const porClausulaSemId = clausulasSemId.filter(cs => cs.arquivo === co.arquivo && cs.faixas.some(sobrepoe)).map(cs => cs.onde);
  const porTextoAntigo = antigosSemNovos.filter(a => { const t = limpa(a.texto); return t.length >= 15 && partesLimpas.some(p => p.includes(t) || t.includes(p)); }).map(a => `${a.id} (${a.onde})`);
  const porTextoSpec = ids.length ? [] : textosDasSpecs.filter(t => partesLimpas.some(p => p.length >= 15 && t.texto.includes(p))).map(t => t.onde);
  const cOk = !porId.length && !porFaixa.length && !porClausulaSemId.length && !porTextoAntigo.length && !porTextoSpec.length;
  const cR = cOk
    ? (ids.length ? `nenhum dos ${ids.length} id(s) ligado(s) nem faixa sobreposta aparece nas referências de A, A2, B, D, E, F` : `sem id: nenhuma faixa de id usado nem cláusula sem id das referências se sobrepõe ao trecho em ${co.arquivo}, nenhuma spec traz o trecho`)
    : `regra usada em referência: ${[...porId.map(e => `${e.id} [${e.em.join(", ")}]`), ...porFaixa.filter(e => !porId.some(x => x.id === e.id)).map(e => `faixa de ${e.id} [${e.em.join(", ")}]`), ...porClausulaSemId.map(o => `cláusula sem id de ${o}`), ...porTextoAntigo.map(o => `id antigo por texto ${o}`), ...porTextoSpec.map(o => `texto em ${o}`)].join("; ")}`;
  const classe = classeDaSpec(cats);
  if (classe !== "ds") throw new Error(`${c.id}: classe ${classe}`);
  l.filtros = {
    a: { passa: aOk, razao: `${aR} Fonte: ${fa.acrescimo ? "acréscimo" : `trecho "de" em l. ${fa.linhasOnde.join(", ")} (${fa.comparacao})`}, arquivo igual ao do seletor: ${fa.igualAoDoSeletor}.` },
    b: { passa: bOk, natural: { passa: bNat, razao: bR }, semeadosAFrente: aFrente, colisoesRegistradas: contra,
      razao: aFrente.length ? `colide com ${aFrente.map(k => k.outro).join(", ")}, semeado à frente: ${aFrente.map(k => k.motivo).join(" | ")}` : bR },
    c: { passa: cOk, razao: cR },
    d: { registro: true, ids, semIdMapeado: ids.length === 0, ...(ids.length ? {} : { clausula: { arquivo: co.arquivo, trecho: co.trechoLiteral } }),
      razao: ids.length ? `id(s) na base servida pelo oráculo congelado: ${ids.join(", ")}` : `semIdMapeado: trecho literal localizado em ${co.arquivo}, sem registro da base servida ligado a ele` },
    e: { registro: true, categories: cats, classe, razao: `categories ${JSON.stringify(cats)} → classe ${classe}; ${eR}` },
  };
  const primeiro = ["a", "b", "c"].find(f => !l.filtros[f].passa);
  l.sobrevive = !primeiro;
  if (primeiro) l.saiEm = primeiro;
  else if (contaTipo[c.tipo] < 3) { contaTipo[c.tipo]++; semeadosAFrente.push(c.id); }
  linhas.push(l);
}
// reservas que colidem com algum semeado (de qualquer tipo): gravado, para a recomposição
for (const l of linhas.filter(x => x.sobrevive && !semeadosAFrente.includes(x.id))) {
  const k = l.filtros.b.colisoesRegistradas.filter(x => semeadosAFrente.includes(x.outro));
  l.reservaColideComSemeado = k.map(x => x.outro);
}
const contagem = {};
for (const t of TIPOS) {
  const ln = linhas.filter(l => l.tipo === t);
  let vivos = ln.filter(l => l.conferente === "aprovado" && l.saiEm !== "conferente-discorda-do-tipo");
  const passo = { candidatos: ln.length, conferente: vivos.length };
  for (const f of ["a", "b", "c"]) { vivos = vivos.filter(l => l.filtros[f].passa); passo[f] = vivos.length; }
  passo.dRegistro = { comId: vivos.filter(l => !l.filtros.d.semIdMapeado).length, semIdMapeado: vivos.filter(l => l.filtros.d.semIdMapeado).length };
  contagem[t] = passo;
}
const saida = {
  _meta: {
    regra: "adendo-2-tela-f2-protocolo-2026-11-26.md § 4 itens 3–4 (com o adendo da F § 4 item 3); nível oficial = o menor entre seletor e conferente (orquestrador); juízos e cálculo em tela-f2/filtros.mjs",
    insumos: {
      candidatos: { arquivo: "tela-f2/selecao/candidatos.json", sha256: sha(candBuf), origem: ".tmp-eval/tela-f2-selada/selecao/candidatos.json (cópia byte a byte)" },
      veredictos: { arquivo: "tela-f2/conferencia/veredictos.json", sha256: sha(verBuf), origem: ".tmp-eval/tela-f2-selada/conferencia/veredictos.json (cópia byte a byte)" },
      conferirFonte: { arquivo: "tela-f2/conferir-fonte.json", sha256: sha(fonteBuf) },
      clausulasOraculo: { arquivo: "tela-f2/clausulas-oraculo.json", sha256: sha(oracBuf), uso: "registro (d) e (c)" },
      baseServida: { dir: VAL, commit: VM.commit, ruleFiles: VM.ruleFiles, camposLidos: ["id", "source.corpusFile", "source.charRange"] },
      base: { arquivo: "ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl", sha256: sha(baseBuf), camposLidos: ["id"] },
      mapaIds: { arquivo: "ds-rules/govbr-ds-3.7.0-corpus/normalizacao/mapa-ids.json", sha256: sha(mapaBuf), camposLidos: ["antigo", "novos", "originalTextAntigo"] },
      referencias: lidas,
      pnipMock: "F:/Dev Nath/TCC/.tmp-eval/pnip-mock-f2, ramo tela-f2 @ 3d02f68 (só leitura)",
    },
    resolucaoDosIdsDasReferencias: { ...resolucao, naoResolvidos: resolucao.naoResolvidos.length, idsDaBaseUsados: usados.size, clausulasSemIdDasReferencias: clausulasSemId.map(c => ({ onde: c.onde, arquivo: c.arquivo, faixas: c.faixas })) },
    sobreviventesPorTipoDepoisDeCadaFiltro: contagem,
    colisoesConsideradas: colisoes,
  },
  candidatos: linhas,
};
writeFileSync(join(AQUI, "filtros.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(JSON.stringify(contagem));
console.log(JSON.stringify({ ...saida._meta.resolucaoDosIdsDasReferencias, clausulasSemIdDasReferencias: clausulasSemId.length }));
for (const l of linhas) console.log(l.id, l.nivel ?? "", l.sobrevive ? "SOBREVIVE" : `sai em ${l.saiEm}`, l.sobrevive ? "" : (l.filtros?.[l.saiEm]?.razao ?? "").slice(0, 160));
