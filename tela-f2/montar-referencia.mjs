/**
 * Tela F2 — monta a referência ground-truth-processos-f2.json 1.0.0 (adendo 2 de 26/11 § 7; adendo da F § 4 "Referência
 * da F", que o adendo 2 mantém). Molde: tela-f/montar-referencia-rascunho.mjs (estado da F antes do congelamento).
 *
 * Estrato natural: as 13 specs da referência 1.1.0 da D copiadas sem mudança (id, âncora, escopo, contagem, estado, rules,
 * rulesLegado, categories, descrição), com UMA exceção registrada: a âncora da D-14 (`pnip-header .br-avatar .content`)
 * deixa de casar na página semeada, porque a mudança semeada da F2-02 tira a classe `content` do mesmo elemento; a D-14
 * passa a `pnip-header .br-avatar > span` (o mesmo elemento: o primeiro filho do avatar, com a letra), descrição intacta
 * (texto branco sobre #ff8c00 = 2,33:1, 24,2 px/700: medido igual nos dois builds, tela-f2/remedida-d/semeada-d14.log).
 * Estrato semeado: F2-01…F2-12 de tela-f2/composicao.json, com os ids de tela-f2/clausulas-oraculo.json e, sem id,
 * `_meta.semIdMapeado`. Estados: as duas paradas da D (segmento 0) e, depois de ida e volta por navegação (segmento 1,
 * sem parada), a parada filtro-escolhido (segmento 2), a mesma sequência da F sem a última parada da F (lista-filtro),
 * que nenhuma semeada da F2 usa.
 * Tipo, subtipo, nível e interação NÃO entram na referência: ficam só em tela-f2/estratos-1.0.0.json.
 * Uso: node tela-f2/montar-referencia.mjs [--forcar] → ground-truth-processos-f2.json
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SAIDA = join(RAIZ, "ground-truth-processos-f2.json");
if (existsSync(SAIDA) && !process.argv.includes("--forcar")) { console.error("ground-truth-processos-f2.json já existe (use --forcar antes do congelamento)"); process.exit(1); }
const sha = b => createHash("sha256").update(b).digest("hex");
const ler = p => readFileSync(join(RAIZ, p));
const dBuf = ler("ground-truth-processos-1.1.0.json"), D = JSON.parse(dBuf);
const compBuf = ler("tela-f2/composicao.json"), comp = JSON.parse(compBuf);
const clBuf = ler("tela-f2/clausulas-oraculo.json");
const confBuf = ler("tela-f2/conformes.json"), conformes = JSON.parse(confBuf);
const ALA = "/pnip-f2/portal-mpa/processos";
const ANCORA_D14 = "pnip-header .br-avatar > span";

// ---------- estados (a sequência da F, ala pnip-f2, sem a parada lista-filtro) ----------
const TAG_ABERTO_HA = "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:first-child > span.br-tag";
const ITEM_FILTRO = "pnip-multiple-search-table-utils div.br-select > div.br-list > div.br-item";
const TAG_ESCOLHIDA = "pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction";
const setup = [
  ...D._meta.setup, // 0–1: lista do "Exibir" aberta (as duas paradas da D)
  { action: "navigate", path: "/pnip-f2/portal-mpa/vistorias", waitFor: "pnip-propesc-vistorias" },
  { action: "navigate", path: ALA, waitFor: "pnip-mpa-processos .br-table tbody tr" },
  { action: "click", selector: TAG_ABERTO_HA },
  { action: "wait", selector: ITEM_FILTRO },
  { action: "click", selector: `${ITEM_FILTRO}:nth-child(3) .br-radio` },
  { action: "wait", selector: TAG_ESCOLHIDA },
  { action: "wait", ms: 1000 },
];
const states = [
  { ...D._meta.states[0], path: ALA, note: "carga da rota, sem clicar em nenhuma aba: a lista paginada de processos em tramitação, com \"Meus processos\" ligado — primeiro paint (nota da D reescrita sem nomear a aba marcada: tela-f2/congelamento-1.0.0.md)" },
  { ...D._meta.states[1], path: ALA, note: "lista do seletor \"Exibir\" (itens por página) da paginação aberta — última parada do segmento 0" },
  { id: "filtro-escolhido", afterStep: 9, path: ALA, note: "segmento 2 (depois de ida e volta por navegação, a rota recomeça): filtro \"Aberto há\" aberto e a opção \"Últimos 60 dias\" escolhida — a tag do filtro escolhido aparece; a lista continua com as mesmas 9 linhas; última parada do segmento 2" },
];

// ---------- specs semeadas ----------
const S = {
  "F2-01": { anchor: "govbr-custom-pagination nav.br-pagination > ul", scope: "unico", expectedCount: 1, state: "inicial",
    description: "Paginação no rodapé da tabela: só existe a seta \"Página seguinte\" (botão circular à direita do número da página); a seta \"Página anterior\" não existe — a lista da paginação tem 2 itens, a página \"1\" e a seta seguinte, e a página fica encostada à esquerda, sem seta antes dela. A Pagination tem duas setas de navegação obrigatórias, um botão para a esquerda e outro para a direita." },
  "F2-02": { anchor: ANCORA_D14, scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["border-top-left-radius"], allowed: ["50%"], note: "Superfície circular do Avatar (border-radius 50%, o que o core computa com a classe content no conteúdo interno)." },
    description: "Avatar de letra no cabeçalho (\"U\"): o conteúdo interno do avatar não tem a classe `content` (o span tem só bg-orange-vivid-30 e text-pure-0). Sem ela, o avatar vira um retângulo laranja estreito (cerca de 18×40 px, border-radius 0, display block) com a letra encostada, em vez da superfície circular de 40×40 com a letra centralizada. No Avatar, a classe `content` é propriedade obrigatória do conteúdo interno." },
  "F2-03": { anchor: `${TAG_ESCOLHIDA} > button`, scope: "unico", expectedCount: 1, state: "filtro-escolhido",
    acceptance: { kind: "estilo-computado", properties: ["border-top-left-radius"], allowed: ["50%"], note: "Button circular do DS (border-radius 50% com a classe br-button); o botão nativo mede 0px." },
    description: "Tag do filtro escolhido (aparece depois de abrir um filtro e escolher uma opção, aqui \"Aberto há\" → \"Últimos 60 dias\"): o botão de remover (×) é um <button> sem a classe `br-button` (só `inverted circle`) e aparece como botão nativo do navegador — fundo cinza rgb(240, 240, 240), borda outset de 2 px, cantos retos, cerca de 40×30 px, ícone preto — em vez do botão circular azul de 28×28. O botão continua removendo o filtro. O Button exige a classe `br-button` no contêiner do componente." },
  "F2-04": { anchor: "pnip-mpa-processos h2", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["font-size"], allowed: ["34.832px"], note: "--font-size-scale-up-05, o tamanho do título H2 (34,832 px nesta janela de 1280 px)." },
    description: "Título da página, h2 \"Processos\": font-size 32px (2rem), valor fora da escala tipográfica (os degraus vizinhos são 29,036 px e 34,832 px). O título H2 usa --font-size-scale-up-05 (34,832 px nesta janela)." },
  "F2-05": { anchor: "pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction > span.text-truncate", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["font-size"], allowed: ["16.8px"], note: "--font-size-scale-up-01 (16,8 px), o tamanho do label da Tag de interação; as tags de filtro da mesma barra medem 16.8px." },
    description: "Tag de interação \"Meus processos\": o rótulo tem font-size 15px, menor que o das tags de filtro da mesma barra (16,8 px) e fora da escala tipográfica (os degraus vizinhos são 14 px e 16,8 px). O label da Tag de interação usa --font-size-scale-up-01." },
  "F2-06": { anchor: "pnip-mpa-processos > br-divider >>> .br-divider", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["border-top-color"], allowed: ["rgb(204, 204, 204)"], note: "--gray-20 (#ccc), a cor do Divider sobre fundo claro." },
    description: "Divider logo abaixo do breadcrumb: a linha (2 px) tem cor rgb(214, 214, 214) (#d6d6d6), que não é cor da paleta (os cinzas vizinhos são #e6e6e6 e #ccc). O Divider sobre fundo claro usa --gray-20 (#ccc)." },
  "F2-07": { anchor: "pnip-mpa-processos br-breadcrumb >>> li.crumb.home i.fa-home", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["color"], allowed: ["rgb(19, 81, 180)"], note: "--blue-warm-vivid-70 (#1351b4), a cor do ícone do Botão Terciário Home." },
    description: "Breadcrumb, botão Home: o ícone da casa está em rgb(0, 94, 162) (#005ea2, --blue-vivid-60), outro azul da paleta, diferente do azul de interação usado pelos demais elementos interativos da página (#1351b4, o do botão \"Exportar\"). O ícone do Botão Terciário Home do Breadcrumb usa --blue-warm-vivid-70." },
  "F2-08": { anchor: "pnip-mpa-processos br-tab >>> button", scope: "composicao", expectedCount: 1, participantCount: 3, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["font-size"], allowed: ["20.16px"], note: "--font-size-scale-up-02 (20,16 px), o tamanho do rótulo da Tab." },
    description: "Rótulos das três abas (\"Aguardando análise\", \"Tramitando\", \"Concluídos\"): font-size 16,8 px (--font-size-scale-up-01, o tamanho do texto dos botões), um degrau abaixo do previsto; o peso continua medium. O rótulo da Tab usa --font-size-scale-up-02 (20,16 px) com --font-weight-medium. Um único estilo no componente define os três rótulos: uma unidade para o conjunto." },
  "F2-09": { anchor: "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip div.br-list", scope: "unico", expectedCount: 1, state: "lista-exibir",
    acceptance: { kind: "estilo-computado", properties: ["box-shadow"], allowed: ["rgba(0, 0, 0, 0.16) 0px 3px 6px 0px"], note: "--surface-shadow-md (0 3px 6px, preto a 16%), a sombra da superfície do Select." },
    description: "Lista do seletor \"Exibir\" da paginação, aberta: a superfície da lista tem sombra rgba(0, 0, 0, 0.16) 0 6px 6px (--surface-shadow-lg), mais deslocada para baixo que a prevista. A superfície do Select usa --surface-shadow-md (0 3px 6px)." },
  "F2-10": { anchor: "pnip-mpa-processos table tbody br-button[disabled]", scope: "composicao", expectedCount: 1, participantCount: 8, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["opacity"], allowed: ["0.45"], note: "--surface-opacity-md (0,45), a opacidade do estado desabilitado; o \"Limpar filtros\" desabilitado, na mesma página, mede 0.45." },
    description: "Botões \"Desassociar processo do analista responsável\" desabilitados na coluna de ações (8): opacidade 1, iguais ao habilitado da 1ª linha (ícone vermelho cheio); só o cursor not-allowed indica o estado. O botão \"Limpar filtros\", também desabilitado, tem opacidade 0,45. No estado desabilitado, fundo e primeiro plano têm opacidade --surface-opacity-md. Uma única regra define os oito: uma unidade para o conjunto." },
  "F2-11": { anchor: "pnip-mpa-processos br-tab >>> li.tab-item:first-child", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "classe-no-elemento", tag: "li", classe: "active", note: "O item \"Aguardando análise\" (1º item da Tab) carrega a marca de item ativo enquanto o conteúdo exibido é o da aba \"Tramitando\"." },
    description: "Abas: o item \"Aguardando análise\" aparece como aba ativa (marca de item ativo, texto destacado), mas o conteúdo exibido é o da aba \"Tramitando\" (tag \"Meus processos\", colunas Analista e Téc. Adm., processos em tramitação); o item \"Tramitando\" aparece como inativo. O item ativo da Tab mostra ao usuário em qual aba ele se encontra." },
  "F2-12": { anchor: "pnip-mpa-processos br-button[label=\"Voltar\"]", scope: "unico", expectedCount: 1, state: "inicial",
    acceptance: { kind: "estilo-computado", properties: ["--hover"], allowed: ["0.16"], note: "--surface-opacity-xs (0,16), a opacidade do overlay de hover que o Button lê da custom property --hover; o \"Exportar\", do mesmo tipo, mede 0.16." },
    description: "Botão secundário \"Voltar\", no fim da página: com o mouse em cima, o botão não muda — o overlay de hover tem opacidade 0 (background-image linear-gradient(rgba(19, 81, 180, 0), rgba(19, 81, 180, 0)) no botão interno) —, enquanto o \"Exportar\", do mesmo tipo, escurece (overlay com opacidade 0,16). O estado hover sobre fundo claro aplica o overlay com --surface-opacity-xs." },
};

const semeadas = comp.semeadas.map(s => {
  const x = S[s.id];
  if (!x) throw new Error(`sem spec escrita para ${s.id}`);
  const { anchor, scope, expectedCount, participantCount, state, acceptance, description } = x;
  return { id: s.id, anchor, scope, expectedCount, ...(participantCount ? { participantCount } : {}), state, ...(acceptance ? { acceptance } : {}),
    rules: s.rules, categories: s.categories, description };
});
const semId = Object.fromEntries(comp.semeadas.filter(s => s.semIdMapeado).map(s => [s.id, { arquivo: s.clausula.arquivo, trecho: s.clausula.trecho }]));

const naturais = D.violations.map(v => JSON.parse(JSON.stringify(v)));
const d14 = naturais.find(v => v.id === "D-14");
const ancoraD14Antes = d14.anchor;
d14.anchor = ANCORA_D14;
const exp = D._meta.exposto.specs;

const ref = {
  _meta: {
    version: "1.0.0",
    status: "RASCUNHO — não congelado. Falta o que está em tela-f2/pendencias-congelamento.md (auditoria cega das semeadas, classes NAT-71 e D-156, conferência final na ala do corpus, sha256 do arquivo de estratos e dos critérios, congelamento).",
    version_note: "1.0.0 (rascunho de 26/11/2026): tela F2 do segundo estudo de seguimento (adendo-2-tela-f2-protocolo-2026-11-26.md). Estrato semeado F2-01…F2-12 (tela-f2/composicao.json, 3 por tipo) + estrato natural = as 13 specs da referência 1.1.0 da D (sha256 " + sha(dBuf) + "), sem mudança fora a âncora da D-14 (ver _meta.estratos.natural.reancoradas).",
    page: "Processos do portal MPA do PNIP — tela F2 (segundo estudo de seguimento; cópia da rota da tela D na ala pnip-f2, com defeitos do DS no fonte), aplicação real em modo mock",
    url: ALA + "?mock-perfil=mpa",
    waitFor: D._meta.waitFor,
    suite: "processos-f2",
    ds: D._meta.ds,
    unit_of_evaluation: D._meta.unit_of_evaluation,
    viewport: D._meta.viewport,
    setup,
    setup_rationale: "Segmento 0 = as duas paradas da D sem mudança (inicial; lista-exibir). O estado novo fica no segmento 2: escolher uma opção de filtro pede a lista de novo e acrescenta uma tag de interação (a do filtro escolhido), o que, no mesmo segmento, quebraria a aditividade e as contagens das specs da D. Por isso a sequência navega por caminho para a rota de vistorias (segmento 1, sem parada) e de volta para processos, que recomeça como numa entrada direta (a mesma sequência da tela F, medida no build sem semente da F: mesma árvore, sem recarga, sem erro, sem chamada sem fixture; tela-f/explorar-estados.json; a rota, os dados e o código fora das mudanças semeadas são os mesmos). No segmento 2: abrir o filtro \"Aberto há\" e escolher \"Últimos 60 dias\" (a opção que mantém as mesmas 9 linhas). A última parada da F (lista do filtro aberta de novo) não entra: nenhuma spec da F2 a usa.",
    states,
    estratos: {
      semeado: { nota: "Defeitos do DS injetados no fonte da rota (adendo 2 § 3–§ 4): o primário da F2, por spec. Toda spec aqui é classe ds pela D-156 3.i; nenhuma é exposta. Tipo, subtipo, nível e exigência de interação de cada uma estão só em tela-f2/estratos-1.0.0.json.", specs: semeadas.map(s => s.id) },
      natural: { nota: "As 13 specs da referência 1.1.0 da D (ids, unidades, rules, descrições e exposição sem mudança), reconferidas na página semeada pelo código da D (tela-f2/remedida-d/); uma só muda de âncora, pelo motivo registrado em `reancoradas`.", specs: naturais.map(v => v.id),
        reancoradas: { "D-14": { antes: ancoraD14Antes, depois: ANCORA_D14, motivo: "a mudança semeada da F2-02 tira a classe `content` do conteúdo interno do avatar, e a âncora da D deixa de casar; a nova âncora resolve o mesmo elemento (o primeiro filho de .br-avatar, com a letra) nos dois builds", medida: "texto branco sobre rgb(255, 140, 0), 24.192px/700 nos dois builds: a descrição da D-14 continua exata (tela-f2/remedida-d/semeada-d14.log)" } } },
      exposto: { nota: "O casco, como na D (adendo da D § E): dentro do estrato natural.", specs: [...exp] },
    },
    exposto: { nota: D._meta.exposto.nota, specs: [...exp] },
    semIdMapeado: {
      nota: "Specs semeadas cuja cláusula não tem registro na base que o oráculo congelado serve (govbr-ds-validator congelado-3.7.12; tela-f2/clausulas-oraculo.json): ficam sem id em `rules`, com o trecho literal e o arquivo da documentação (adendo 2 § 4 item 4, \"id na base: registro, não filtro\"; como as specs sem id da referência 1.1.0 da D e da F). A coluna fundamentada só credita por id as que têm id.",
      specs: semId,
    },
    conformes: {
      nota: `Controles conformes (protocolo NAT-78 § 5.2: denominador da taxa de falso alarme). Procedimento da D (tela-d/sortear-conformes.mjs) com as âncoras e os hospedeiros das mudanças das semeadas somados à exclusão de elemento-âncora (como na F): saem ${conformes.substituicao.saem.join(", ")} da D; ${conformes.elegiveis.length} elegíveis ≤ 12, sem sorteio: ${conformes.itens.length}, não 12 — só ${conformes.itens.length} elegíveis na página semeada. Re-medidos na página semeada pelo código da D (tela-f2/remedida-d/semeada-d14.log). Arquivo irmão com sha256.`,
      arquivo: "tela-f2/conformes.json",
      sha256: sha(confBuf),
      total: conformes.itens.length,
      porQue: `${conformes.itens.length}, não 12: só ${conformes.itens.length} elegíveis na página semeada (procedimento da D, sem sorteio)`,
      itens: conformes.itens.map(({ id, deD, state, selector, count, rules, medida }) => ({ id, deD, state, selector, count, rules, medida })),
    },
    fundo: D._meta.fundo,
    fora_de_escopo: "Como na D (abaixo), menos o que o estado novo traz para dentro: a tag do filtro escolhido (\"Aberto há\" → \"Últimos 60 dias\") é parada da F2. Fora continuam: abas \"Aguardando análise\"/\"Concluídos\" clicadas, \"Meus processos\" desligado, a lista aberta dos filtros, outros filtros e opções, troca de página, \"Exportar\", \"Ver processo\", números de processo, breadcrumb e \"Voltar\" (navegam ou recarregam), os dois SweetAlert2, menu do avatar, a rota de vistorias atravessada pela navegação (segmento 1, sem parada), outras janelas e zoom, linguagem e microcopy, conteúdo das fixtures, regras só da base literal. Texto da D: " + D._meta.fora_de_escopo,
    nunca_agregar_com: "ground-truth-processos.json, ground-truth-processos-1.1.0.json (tela D), ground-truth-processos-f.json (tela F) e todas as referências listadas na D: " + D._meta.nunca_agregar_com,
    baselines: D._meta.baselines,
    origem: {
      referenciaD: { arquivo: "ground-truth-processos-1.1.0.json", version: D._meta.version, sha256: sha(dBuf) },
      composicao: { arquivo: "tela-f2/composicao.json", sha256: sha(compBuf) },
      clausulas: { arquivo: "tela-f2/clausulas-oraculo.json", sha256: sha(clBuf) },
      estratos: "tela-f2/estratos-1.0.0.json (id da spec semeada → tipo, subtipo, nível, interação; fora da referência)",
      construcao: "tela-f2/construcao/ (cópia das provas do construtor, .tmp-eval/pnip-f2-construcao: 12/12 M pegaram, 4/4 R no build de prova, 0 diferenças sem atribuição; build semeado lista b113879f…; pnip-mock tela-f2 9d16700; govbr-corpus tela-f2 a7d6ccd)",
      remedidaNaturais: "tela-f2/remedida-d/ (código da D na ala pnip-f2, nos dois builds)",
      idsNaBase: "tela-f2/conferencia-ids-base.json",
    },
  },
  violations: [...semeadas, ...naturais],
};
writeFileSync(SAIDA, JSON.stringify(ref, null, 1) + "\n");
const u = ref.violations.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
console.log(`specs ${ref.violations.length} (semeado ${semeadas.length}, natural ${naturais.length}, exposto ${exp.length}); unidades ${u} (semeado ${semeadas.reduce((n, v) => n + v.expectedCount, 0)}); estados ${states.length}; predicados ${semeadas.filter(s => s.acceptance).length}/${semeadas.length}; sha256 ${sha(readFileSync(SAIDA))}`);
