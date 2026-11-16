/**
 * Tela E2 — reconciliação sorteio × construção × auditoria cega (passo 2 da reconciliação).
 * Lê só arquivos deste ramo: sementes-vigentes.json, sorteio.json, universo.json, ponte-base.json,
 * elegibilidade-passo2.json, classe-reavaliada.json, construcao.md, conferencia-construcao.json e
 * auditoria/{achados,conformes,incertos}.json. Nada do validator, de aliases, de results/ ou reports/.
 * Os julgamentos (casamento de cada achado/incerto) estão escritos abaixo, à mão, com a razão; o
 * script só junta, confere a consistência e grava reconciliacao.json.
 * Uso: node tela-e2/reconciliar.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = f => readFileSync(join(AQUI, f), "utf8");
const json = f => JSON.parse(ler(f));
const sha = f => createHash("sha256").update(readFileSync(join(AQUI, f))).digest("hex");

const ENTRADAS = ["sementes-vigentes.json", "sorteio.json", "universo.json", "ponte-base.json", "elegibilidade-passo2.json",
  "classe-reavaliada.json", "construcao.md", "conferencia-construcao.json", "auditoria/achados.json",
  "auditoria/conformes.json", "auditoria/incertos.json", "auditoria/medidas/conferencia.json"];

const vig = json("sementes-vigentes.json").vigentes;
const sorteio = json("sorteio.json");
const universo = Object.fromEntries(json("universo.json").unidades.map(u => [u.id, u]));
const ponte = json("ponte-base.json").porUnidade;
const p2 = json("elegibilidade-passo2.json").regras;
const achados = json("auditoria/achados.json").achados;
const conformes = json("auditoria/conformes.json").conformes;
const incertos = json("auditoria/incertos.json").incertos;
const conf = json("conferencia-construcao.json");

const celulas = {};
for (const c of ["DS", "G"]) sorteio.ordemPorClasse[c].forEach((x, i) => { celulas[x.id] = { classe: c, posicao: i }; });
for (const x of sorteio.excluidas) celulas[x.id] = { excluida: x.motivo, classe: x.classe };

const idsBase = u => { const b = ponte[u]; if (!b) return []; return b.emag ? [`emag:${b.emag}`] : b.ids; };
const passo2 = u => p2[u] ? (p2[u].aceita ? "aceita" : p2[u].motivo) : "nao-chegou-ao-passo-2";
const celula = (h, u) => { const c = celulas[`${h}::${u}`]; return c ? (c.excluida ? `excluida:${c.excluida}` : `${c.classe}#${c.posicao}`) : "nao-e-celula-neste-hospedeiro"; };
const descr = (h, u) => ({ unidade: u, arquivo: universo[u]?.fonte.arquivo ?? null, idsBase: idsBase(u), passo2: passo2(u), celula: celula(h, u) });

/* ---------- julgamentos (escritos à mão; razão em cada linha) ---------- */

// Casamento de cada unidade sorteada (mesmo hospedeiro, mesmo observável da variante, estado declarado).
// via: 'principal' = a unidade sorteada está em clausulas; 'tambem' = só em tambem; 'duplicata-selada' = o
// auditor citou uma unidade que o passo 2 SELADO julgou duplicada:<sorteada>; null = outra cláusula.
const CASAMENTO = {
  "btn-limpar::a2-2ac598dc24db": { resultado: "mesma-clausula", via: "principal", achado: "EA-01",
    porque: "EA-01 cita a frase sorteada (formulário) como cláusula, no mesmo botão, S0–S2." },
  "msg-orientacao::a2-d6b3f0e36943": { resultado: "mesma-clausula", via: "tambem", achado: "EA-10",
    porque: "EA-10 mede o mesmo jargão no corpo da mensagem (S0–S2); a cláusula principal é a co-violação declarada (texto curto, claro e objetivo); a frase sorteada (microcopy) aparece em `tambem`, literal." },
  "btn-ajuda::a2-5b47246a41c1": { resultado: "mesma-clausula", via: "principal", achado: "EA-03",
    porque: "EA-03 cita a frase sorteada (ícone obrigatório no circular) como 1ª cláusula, 0 pixel de ícone, S0–S2." },
  "inp-codigo::a2-a39f3ad397d4": { resultado: "mesma-clausula", via: "duplicata-selada", achado: "EA-06",
    porque: "EA-06 mede Arial no rótulo, no campo e no apoio (S0–S2) e cita tipografia.md; uma das duas frases citadas (a2-f82d600db413) é `duplicada:a2-a39f3ad397d4` no passo 2 selado; a frase sorteada (padrão mínimo) não é citada literalmente." },
  "rad-situacao::a2-f838b54da560": { resultado: "nao-achada", via: null, achado: null, contrario: "EC-062",
    porque: "Nenhum achado no hospedeiro. O auditor deu a frase sorteada como CONFORME (EC-062, só S1) medindo o x da caixa da legend (62 = x das opções); a variante centraliza o TEXTO numa legend de largura 100 %, e a conferência de construção mede o início do texto (296,1 px contra 62 px da 1ª opção, centrado no grupo). Julgamento contrário por observável diferente." },
  "msg-erro::a2-ef29db5bb4ac": { resultado: "outra-clausula", via: null, achado: "EA-12", tambemAchados: ["EA-13"],
    porque: "EA-12 mede o fundo #2670e8 (= --blue-warm-vivid-50, o da variante) no lugar da superfície de Erro, e EA-13 mede o fa-check visível dentro da mensagem de erro, em S1: são os dois observáveis da variante. O auditor citou cores.md (a cor indica o estado), a tabela de cores do Erro (co-violação declarada, sem cláusula na base) e iconografia; a frase sorteada (estados.md › Selecionado › evitar em Message) não é citada." },
  "sel-continente::a2-7348bce34289": { resultado: "outra-clausula", via: null, achado: "EA-08", tambemAchados: ["EA-09"],
    porque: "EA-08 mede 2,32:1 nas 6 opções em S2 (o observável da variante) e cita cores.md 4,5:1 e e-MAG 4.1; a frase sorteada (acessibilidade do select) não é citada." },
  "inp-nome-pais::a2-328f62cfe4ce": { resultado: "mesma-clausula", via: "principal", achado: "EA-04", tambemAchados: ["EA-05"],
    porque: "EA-04 cita a frase sorteada (input › acessibilidade, digitar logo após o foco) como 2ª cláusula; Tab → digitar → valor vazio, S0–S2. A classe da cláusula que o auditor deu (DS) difere da selada (G); vale a selada." },
  "lst-paises::a2-5432c282d0d7": { resultado: "nao-achada", via: null, achado: null, contrario: "EC-111",
    porque: "Nenhum achado no hospedeiro. O auditor deu o e-MAG 4.3 como CONFORME no nível da página (EC-111), medindo só rolagem horizontal e elementos além da largura a 640×450; não mediu corte DENTRO dos itens (overflow hidden), que é o observável da variante (19 px perdidos em cada um dos 4 itens). Julgamento contrário por observável diferente." },
};

// Cada achado: categoria e destino.
//  sorteada               = é o achado que casa a unidade sorteada (CASAMENTO);
//  coviolacao-declarada   = outra obrigação quebrada pela MESMA troca no mesmo hospedeiro, listada em construcao.md;
//  coviolacao-nao-declarada = idem, não listada em construcao.md (inerente à variante: corrigir mudaria a unidade sorteada);
//  acidental              = defeito da construção fora da variante sorteada (corrigir na página).
const ACHADO = {
  "EA-01": { categoria: "sorteada", celula: "btn-limpar::a2-2ac598dc24db" },
  "EA-02": { categoria: "coviolacao-declarada", celula: "btn-limpar::a2-2ac598dc24db",
    porque: "ordem visual ≠ ordem de Tab: construcao.md › Acoplamentos lista o e-MAG 1.4 (a2-bde476da44c9) para btn-limpar; a variante manda não mudar o DOM." },
  "EA-03": { categoria: "sorteada", celula: "btn-ajuda::a2-5b47246a41c1" },
  "EA-04": { categoria: "sorteada", celula: "inp-nome-pais::a2-328f62cfe4ce" },
  "EA-05": { categoria: "coviolacao-nao-declarada", celula: "inp-nome-pais::a2-328f62cfe4ce",
    porque: "o mesmo readonly que só sai no clique (a variante sorteada, ao pé da letra) contraria o e-MAG 2.1; não está em construcao.md. Corrigir = desfazer a variante." },
  "EA-06": { categoria: "sorteada", celula: "inp-codigo::a2-a39f3ad397d4" },
  "EA-07": { categoria: "acidental", celula: null,
    porque: "margin-top do texto auxiliar de inp-codigo = --spacing-scale-half (4 px), posto por .apoio-campo na folha da página; a tabela de Espaçamentos do Input (a2-8fcc793aaed1, aceita no passo 2 para inp-codigo) pede --spacing-scale-base. Não é o observável da variante sorteada (fonte)." },
  "EA-08": { categoria: "sorteada", celula: "sel-continente::a2-7348bce34289" },
  "EA-09": { categoria: "coviolacao-nao-declarada", celula: "sel-continente::a2-7348bce34289",
    porque: "#AAAAAA está escrito na própria variante selada (elegibilidade-passo2 › opcoes-texto-claro: 'O texto das opções da lista aberta fica #AAAAAA sobre fundo branco') e não está na paleta de cores.md; não está em construcao.md. Corrigir = mudar a variante sorteada." },
  "EA-10": { categoria: "sorteada", celula: "msg-orientacao::a2-d6b3f0e36943" },
  "EA-11": { categoria: "coviolacao-nao-declarada", celula: "msg-orientacao::a2-d6b3f0e36943",
    porque: "o mesmo jargão (a variante) contraria o e-MAG 3.11 (nível de leitura) e 3.12 (em tambem); não está em construcao.md. Corrigir = desfazer a variante." },
  "EA-12": { categoria: "sorteada", celula: "msg-erro::a2-ef29db5bb4ac" },
  "EA-13": { categoria: "coviolacao-nao-declarada", celula: "msg-erro::a2-ef29db5bb4ac",
    porque: "o fa-check faz parte da variante sorteada (fundo Selecionado + fa-check antes do texto) e contraria a iconografia (significado do ícone); construcao.md declara só as cores do Erro. Corrigir = desfazer a variante." },
};

// Cada incerto: em que toca e destino proposto.
//  toca: observavel-sorteado | hospedeiro-sorteado (outro observável) | ponto-conforme-da-construcao | andaime | pagina
//  destino: fundo (fora da referência; alegação certa = descoberta) | autora (item em decisoes-da-autora.md)
const INCERTO = {
  "EI-01": { toca: ["hospedeiro-sorteado"], celula: "btn-ajuda::a2-5b47246a41c1", destino: "fundo",
    porque: "tooltip (componente em `fora` no inventário) e efeito do clique; não é o observável da variante (ícone). Frases: uma `nao-se-aplica`, outra `sem-medicao` no passo 2." },
  "EI-02": { toca: ["hospedeiro-sorteado", "ponto-conforme-da-construcao"], celula: "inp-nome-pais::a2-328f62cfe4ce", destino: "autora",
    porque: "obrigatórios sem marca e sem instrução geral; o e-MAG 6.5 é elegível (aceita no passo 2) e a construção mediu 'obrigatórios sem marca' como conforme pelo padrão de Formulário. Mesma situação em EI-03 e EI-04." },
  "EI-03": { toca: ["hospedeiro-sorteado", "ponto-conforme-da-construcao"], celula: "sel-continente::a2-7348bce34289", destino: "autora", porque: "ver EI-02." },
  "EI-04": { toca: ["hospedeiro-sorteado", "ponto-conforme-da-construcao"], celula: "rad-situacao::a2-f838b54da560", destino: "autora", porque: "ver EI-02." },
  "EI-05": { toca: ["hospedeiro-sorteado"], celula: "inp-nome-pais::a2-328f62cfe4ce", destino: "fundo",
    porque: "foco no 1º campo obrigatório: frase `conflito` no passo 2 selado (conflita com o atalho como 1º foco)." },
  "EI-06": { toca: ["hospedeiro-sorteado"], celula: "sel-continente::a2-7348bce34289", destino: "fundo",
    porque: "abrir a lista ao receber foco: frase ambígua, e abrir sozinho contrariaria o e-MAG 6.4; o select do core 3.7.0 abre por seta." },
  "EI-07": { toca: ["hospedeiro-sorteado"], celula: "sel-continente::a2-7348bce34289", destino: "fundo",
    porque: "role=combobox sem nome no contêiner: posto pelo BRSelect do core 3.7.0 em tempo de execução (precedente A2 E-08, A2-24)." },
  "EI-08": { toca: ["hospedeiro-sorteado", "ponto-conforme-da-construcao"], celula: "sel-continente::a2-7348bce34289", destino: "autora",
    porque: "ícone angle no gatilho onde a tabela de Iconografia do Select (a2-daf3655caedf, aceita no passo 2, sem cláusula na base) pede caret. O BRSelect do core 3.7.0 troca fa-angle-down/fa-angle-up por nome de classe ao abrir e fechar (core.min.js); com caret a troca do core não funcionaria sem código próprio." },
  "EI-09": { toca: ["hospedeiro-sorteado"], celula: "lst-paises::a2-5432c282d0d7", destino: "fundo",
    porque: "lista estática sem paradas de Tab: a frase é `duplicada` no passo 2 e não distingue lista estática." },
  "EI-10": { toca: ["hospedeiro-sorteado"], celula: "lst-paises::a2-5432c282d0d7", destino: "fundo",
    porque: "div + role=list em vez de ul: marcação do exemplo oficial do List 3.7.0; semântica exposta na árvore AX; e-MAG 1.2 exposto (célula excluída)." },
  "EI-11": { toca: ["hospedeiro-sorteado"], celula: "lst-paises::a2-5432c282d0d7", destino: "fundo",
    porque: "tamanho e cor do título e dos textos vêm do CSS do DS (h2 e .br-item), sem sobrescrita da página (precedente A2 E-08)." },
  "EI-12": { toca: ["hospedeiro-sorteado", "ponto-conforme-da-construcao"], celula: "msg-orientacao::a2-d6b3f0e36943", destino: "fundo",
    porque: "foco no Fechar quando a mensagem aparece na carga: conflita com o atalho como 1º foco; a construção mediu conforme o caso da reexibição pela ajuda." },
  "EI-13": { toca: ["hospedeiro-sorteado", "ponto-conforme-da-construcao"], celula: "msg-orientacao::a2-d6b3f0e36943", destino: "fundo",
    porque: "foco depois de fechar vai ao h1 (decisão da construção, medida conforme); o auditor lê a frase como recomendação." },
  "EI-14": { toca: ["observavel-sorteado"], celula: "msg-orientacao::a2-d6b3f0e36943", destino: "autora",
    porque: "estrangeirismos do jargão (a variante) sem lang; e-MAG 3.2 é `nao-se-aplica` no passo 2 selado." },
  "EI-15": { toca: ["andaime"], celula: null, destino: "fundo", porque: "atalho invisível ao ponteiro: CSS do core 3.7.0 (precedente A2 E-08, A2-07)." },
  "EI-16": { toca: ["pagina"], celula: null, destino: "fundo", porque: "name + id nas âncoras: name não é atributo válido em main/footer; e-MAG 1.5 `so-andaime` no passo 2." },
  "EI-17": { toca: ["andaime"], celula: null, destino: "fundo", porque: "peso 500 no item atual da trilha: CSS do core 3.7.0 (precedente A2 E-08, A2-09)." },
  "EI-18": { toca: ["andaime"], celula: null, destino: "fundo", porque: "trilha como única navegação: não há menu na página (andaime da rota real)." },
  "EI-19": { toca: ["andaime", "ponto-conforme-da-construcao"], celula: null, destino: "fundo",
    porque: "a.br-sign-in no cabeçalho (padrão de usuário logado do header) em vez de br-button sign-in: decisão de construção registrada; andaime." },
};

/* ---------- conferências de consistência ---------- */
const erros = [];
const idsVig = vig.map(v => v.id);
for (const k of Object.keys(CASAMENTO)) if (!idsVig.includes(k)) erros.push(`casamento para célula não vigente ${k}`);
for (const v of idsVig) if (!CASAMENTO[v]) erros.push(`célula vigente sem casamento ${v}`);
for (const a of achados) if (!ACHADO[a.id]) erros.push(`achado sem categoria ${a.id}`);
for (const i of incertos) if (!INCERTO[i.id]) erros.push(`incerto sem destino ${i.id}`);
for (const [id, j] of Object.entries(ACHADO)) {
  const a = achados.find(x => x.id === id);
  if (j.celula && a.instancia !== j.celula.split("::")[0]) erros.push(`${id}: hospedeiro ${a.instancia} ≠ ${j.celula}`);
}
for (const [cel, c] of Object.entries(CASAMENTO)) {
  if (c.achado && ACHADO[c.achado]?.categoria !== "sorteada") erros.push(`${cel}: ${c.achado} não marcado sorteada`);
  if (c.contrario && !conformes.find(x => x.id === c.contrario)) erros.push(`${cel}: conforme ${c.contrario} inexistente`);
}
const viol = conf.variantes.semeada.obs;
for (const v of idsVig) if (!viol[v]?.violado) erros.push(`${v}: não violada na conferência de construção`);
if (erros.length) { console.error(erros.join("\n")); process.exit(1); }

/* ---------- montagem ---------- */
const citadas = (a, onde) => (a[onde] || []).map(c => ({ arquivo: c.arquivo, citacao: c.citacao }));
// Linhas de tabela citadas pelo auditor → unidade "tabela de especificação" do universo (uma por tabela), à mão.
const TABELAS = [
  ["componentes/input__designer.md", "margin-top", "a2-8fcc793aaed1"],
  ["componentes/input__designer.md", "--font-size-scale-base", "a2-bc172ac96406"],
  ["componentes/message__designer.md", "Superfície do Message", "a2-90ea0bde7e04"],
  ["componentes/message__designer.md", "Ícone Erro", "a2-b13bd6797498"],
  ["fundamentos-visuais/iconografia.md", "fa-check", "a2-7ae4ad55ed25"],
  ["componentes/select__designer.md", "fa-caret-down", "a2-daf3655caedf"],
  ["componentes/list__designer.md", "size", "a2-8ed2a1b99cae"],
  ["componentes/list__designer.md", "--gray-70", "a2-1f12ca328b9e"],
];
const unidadesDeCitacao = (h, cit) => {
  const n = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[*_`]/g, "").replace(/\|/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const c = n(cit.citacao);
  const doArquivo = Object.values(universo).filter(u => u.fonte.arquivo === cit.arquivo);
  let hits = doArquivo.filter(u => n(u.texto).includes(c) || (c.includes(n(u.texto)) && n(u.texto).length > 25));
  if (!hits.length && cit.citacao.trim().startsWith("|")) {
    const t = TABELAS.find(([a, k]) => a === cit.arquivo && cit.citacao.includes(k));
    if (t) hits = [universo[t[2]]];
  }
  if (!hits.length) hits = doArquivo.filter(u => u.contexto && n(u.contexto).includes(c.slice(0, 60)));
  return hits.map(u => descr(h, u.id));
};

const sorteadas = vig.map(v => {
  const c = CASAMENTO[v.id];
  const a = c.achado ? achados.find(x => x.id === c.achado) : null;
  return {
    celula: v.id, hospedeiro: v.sitio, unidade: v.regra, classe: v.classe, variante: v.variante, posicaoNaOrdem: v.posicao,
    idsBase: idsBase(v.regra), arquivo: universo[v.regra].fonte.arquivo,
    construcao: { violado: viol[v.id].violado, fato: viol[v.id].fato },
    auditoria: { resultado: c.resultado, via: c.via, achado: c.achado, outrosAchadosDaMesmaTroca: c.tambemAchados || [],
      estadosDoAchado: a ? a.estados : [], conformeContrario: c.contrario || null, porque: c.porque },
  };
});

const listaAchados = achados.map(a => {
  const j = ACHADO[a.id];
  const h = a.instancia;
  return {
    id: a.id, instancia: h, chave: a.chave, estados: a.estados, classeDaClausulaDoAuditor: a.classeClausula,
    categoria: j.categoria, celula: j.celula,
    destino: j.categoria === "acidental" ? "corrigir-na-pagina" : "spec-da-celula",
    clausulas: citadas(a, "clausulas").map(c => ({ ...c, unidades: unidadesDeCitacao(h, c) })),
    tambem: citadas(a, "tambem").map(c => ({ ...c, unidades: unidadesDeCitacao(h, c) })),
    porque: j.porque || "casa a unidade sorteada (ver sorteadas[])",
  };
});

const listaIncertos = incertos.map(i => ({
  id: i.id, instancia: i.instancia, chave: i.chave, estados: i.estados, classeDaClausulaDoAuditor: i.classeClausula,
  ...INCERTO[i.id],
  clausulas: citadas(i, "clausulas").map(c => ({ arquivo: c.arquivo, unidades: unidadesDeCitacao(i.instancia, c) })),
}));

const conta = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const porClasse = r => Object.fromEntries(["DS", "G"].map(c => [c, sorteadas.filter(s => s.classe === c && s.auditoria.resultado === r).length]));
const saida = {
  _meta: {
    tela: "E2 — cadastro-pais.html (página construída)",
    data: "2026-11-14",
    regra: "tela-e2/reconciliacao.md; julgamentos escritos à mão em tela-e2/reconciliar.mjs. Precedente: tela-a2/reconciliacao.md (detectada = mesma norma, principal ou em tambem; com outra norma = mesmo elemento, estado e observável; não detectada).",
    entradas: Object.fromEntries(ENTRADAS.map(f => [f, sha(f)])),
    proibidos: "não lidos: govbr-ds-validator, checker-aliases.json, kb-aliases*.json, results/, reports/, ferramentas MCP do validator, axe",
  },
  contagens: {
    sorteadas: { total: sorteadas.length, mesmaClausula: porClasse("mesma-clausula"), outraClausula: porClasse("outra-clausula"), naoAchada: porClasse("nao-achada") },
    achados: { total: listaAchados.length, porCategoria: conta(listaAchados, x => x.categoria) },
    incertos: { total: listaIncertos.length, porDestino: conta(listaIncertos, x => x.destino),
      tocamObservavelSorteado: listaIncertos.filter(x => x.toca.includes("observavel-sorteado")).length,
      tocamPontoConformeDaConstrucao: listaIncertos.filter(x => x.toca.includes("ponto-conforme-da-construcao")).length },
  },
  sorteadas, achados: listaAchados, incertos: listaIncertos,
};
writeFileSync(join(AQUI, "reconciliacao.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(JSON.stringify(saida.contagens, null, 1));
