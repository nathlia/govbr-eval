/**
 * Tela E2 — pedido neutro para a re-medida cega por um segundo auditor (regra do coordenador, fixada antes de
 * qualquer resultado: uma sorteada conta como "confirmada às cegas" para o portão se a 1ª auditoria a achou com a
 * cláusula sorteada OU se um 2º auditor cego, perguntado de forma neutra entre iscas, mede o observável sorteado
 * como violado; "achada com outra cláusula" sozinha continua sendo o item 1 da autora).
 * 14 itens: as 2 sorteadas não achadas, as 2 achadas com outra cláusula e 10 iscas (controles conformes e obrigações
 * conformes de OUTROS hospedeiros, medidas conformes nesta preparação). Ordem embaralhada por PRNG com semente.
 * O pedido não diz quais itens são sorteados, não traz resposta esperada e não cita a 1ª auditoria.
 * Uso: node tela-e2/montar-pedido-remedida.mjs → ../auditoria-e2/remedida/pedido.json + tela-e2/remedida-mapa.json
 */
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CORPUS = "F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus";
const DESTINO = resolve(AQUI, "../../auditoria-e2/remedida");
const SEMENTE = 20261114;

const C = {
  radio: { arquivo: "componentes/radio__designer.md", secao: "Radio › Detalhamento dos Itens › Cabeçalho de opções › Rótulo", citacao: "O rótulo deve se posicionar no topo do componente alinhado à esquerda." },
  emag43: { arquivo: "emag/emag-3.1-recomendacoes-1.1-a-6.8.md", secao: "Recomendação 4.3 – Permitir redimensionamento sem perda de funcionalidade", citacao: "A página deve continuar legível e funcional mesmo quando redimensionada para até 200%." },
  estados: { arquivo: "fundamentos-visuais/estados.md", secao: "Selecionado › Evitar estado selecionado", citacao: "O estado Selecionado não pode ser aplicado nos seguintes componentes:", itemDaLista: "- *Message*" },
  select: { arquivo: "componentes/select__acessibilidade.md", secao: "Acessibilidade no Select › Recomendações para Estilo e Design", citacao: "- Certifique-se de seguir as recomendações de `cores` e `estados` na diretriz do componente, garantindo a qualidade de contraste e legibilidade para usuários com baixa visão." },
  msgPos: { arquivo: "componentes/message__designer.md", secao: "Message › Anatomia", citacao: "Os ícones de função semântica devem ser posicionados à esquerda na Superfície do *Message*, enquanto o *Botão Fechar*, deve ser posicionado no topo e à direita." },
  formBtn: { arquivo: "padroes/design/formulario.md", secao: "Formulário › Anatomia › Botões", citacao: "Os Botões devem estar posicionados preferencialmente abaixo e à direita do formulário ao qual se referem e devem respeitar as diretrizes de alinhamento e espaçamento previstas para o componente *button*." },
  msgInfo: { arquivo: "componentes/message__designer.md", secao: "Message › Especificações › Cores › Cores do Estado Informativo", citacao: "| Superfície do Message              | background | `--blue-warm-vivid-10` |" },
  coresAA: { arquivo: "fundamentos-visuais/cores.md", secao: "Cores › Acessibilidade › Contraste", citacao: "O *nível AA* indica que é necessária uma taxa de contraste de pelo menos *4,5:1* para que o texto seja considerado normal e tenha boa legibilidade." },
  btnAcess: { arquivo: "componentes/button__acessibilidade.md", secao: "Acessibilidade no Button › Recomendações para Estilo e Design", citacao: "- Verifique o uso das cores em `cor de superfície` e `cor de leitura` no botão se correspondem às recomendadas na diretriz de design, garantindo um contraste adequado para uma boa acessibilidade;" },
  emag41: { arquivo: "emag/emag-3.1-recomendacoes-1.1-a-6.8.md", secao: "Recomendação 4.1 - Oferecer contraste mínimo entre plano de fundo e primeiro plano", citacao: "As cores do plano de fundo e do primeiro plano deverão ser suficientemente contrastantes para que possam ser visualizadas, também, por pessoas com baixa visão, com cromodeficiências ou que utilizam monitores de vídeo monocromático." },
};
const P200 = alvo => `Numa janela de 640×450 px (equivalente a 200 %), ${alvo} fica inteiramente visível, sem corte, sobreposição ou rolagem horizontal? Compare a altura e a largura do conteúdo com a área visível de cada elemento e diga quanto (px) fica fora, se ficar. Satisfaz a cláusula?`;
const PCONTR = alvo => `Qual é a razão de contraste entre a cor computada do texto de ${alvo} e a cor de fundo efetiva por trás dele (informe as duas cores, o tamanho e o peso da fonte)? Satisfaz a cláusula?`;
const PESTADO = "Qual é a cor de fundo computada da superfície da mensagem e quais ícones visíveis ela contém (classe e glifo de cada um)? A mensagem apresenta o visual do estado Selecionado descrito em fundamentos-visuais/estados.md (Especificação para Estado Selecionado)? Satisfaz a cláusula?";

// tipo: sorteada-nao-achada | sorteada-outra-clausula | isca-controle | isca-outro-hospedeiro (só no mapa)
const ITENS = [
  { chave: "rad-situacao::a2-f838b54da560", tipo: "sorteada-nao-achada", instancia: "rad-situacao", estado: "S0", janela: "1280x900", clausula: C.radio,
    pergunta: "Em que posição horizontal (x, px) começa o texto visível da legenda do grupo e em que x começam as opções do grupo? Como esse texto está alinhado dentro do grupo? O rótulo satisfaz a cláusula?" },
  { chave: "lst-paises::a2-5432c282d0d7", tipo: "sorteada-nao-achada", instancia: "lst-paises", estado: "S0", janela: "640x450", clausula: C.emag43, pergunta: P200("o texto de cada item da lista") },
  { chave: "msg-erro::a2-ef29db5bb4ac", tipo: "sorteada-outra-clausula", instancia: "msg-erro", estado: "S1", janela: "1280x900", clausula: C.estados, pergunta: PESTADO },
  { chave: "sel-continente::a2-7348bce34289", tipo: "sorteada-outra-clausula", instancia: "sel-continente", estado: "S2", janela: "1280x900", clausula: C.select, pergunta: PCONTR("cada opção visível da lista") },
  { chave: "isca:msg-orientacao:estados", tipo: "isca-outro-hospedeiro", instancia: "msg-orientacao", estado: "S0", janela: "1280x900", clausula: C.estados, pergunta: PESTADO,
    medidaNestaPreparacao: "fundo rgb(212, 229, 255); ícones fa-info-circle e fa-times; nenhum visual de Selecionado" },
  { chave: "isca:msg-orientacao:posicao", tipo: "isca-outro-hospedeiro", instancia: "msg-orientacao", estado: "S0", janela: "1280x900", clausula: C.msgPos,
    pergunta: "Em que posição (x, y, px) ficam o ícone de função semântica e o botão Fechar dentro da superfície da mensagem? A disposição satisfaz a cláusula?",
    medidaNestaPreparacao: "ícone em x 76 (esquerda); Fechar em x 1180–1212, y 123 (topo, direita) numa superfície 0–1280" },
  { chave: "isca:msg-orientacao:cor-informativo", tipo: "isca-outro-hospedeiro", instancia: "msg-orientacao", estado: "S0", janela: "1280x900", clausula: C.msgInfo,
    pergunta: "Qual é a cor de fundo computada da superfície da mensagem (valor e, se identificável, o token)? Satisfaz a cláusula?",
    medidaNestaPreparacao: "rgb(212, 229, 255)" },
  { chave: "isca:msg-orientacao:200", tipo: "isca-outro-hospedeiro", instancia: "msg-orientacao", estado: "S0", janela: "640x450", clausula: C.emag43, pergunta: P200("o título e o texto da mensagem"),
    medidaNestaPreparacao: "conteúdo 121/121 px de altura, 460/460 de largura; nada fora" },
  { chave: "isca:btn-cancelar:posicao", tipo: "isca-controle", instancia: "btn-cancelar", estado: "S0", janela: "1280x900", clausula: C.formBtn,
    pergunta: "Em que posição (x, y, px) fica o botão em relação à área do formulário (bordas esquerda e direita e base do formulário)? A posição satisfaz a cláusula?",
    medidaNestaPreparacao: "botão abaixo dos campos, na barra alinhada à direita do formulário (borda direita da barra = borda direita do formulário, 700)" },
  { chave: "isca:btn-cancelar:contraste", tipo: "isca-controle", instancia: "btn-cancelar", estado: "S0", janela: "1280x900", clausula: C.btnAcess, pergunta: PCONTR("o rótulo do botão"),
    medidaNestaPreparacao: "rgb(19, 81, 180) sobre branco = 7,33:1" },
  { chave: "isca:swt-certificado:contraste", tipo: "isca-controle", instancia: "swt-certificado", estado: "S0", janela: "1280x900", clausula: C.coresAA, pergunta: PCONTR("o rótulo do switch"),
    medidaNestaPreparacao: "rgb(51, 51, 51) sobre branco = 12,63:1" },
  { chave: "isca:swt-certificado:200", tipo: "isca-controle", instancia: "swt-certificado", estado: "S0", janela: "640x450", clausula: C.emag43, pergunta: P200("o rótulo e o texto de estado do switch"),
    medidaNestaPreparacao: "rótulo 41/41 px de altura, 488/488 de largura; nada fora" },
  { chave: "isca:inp-nome-pais:contraste", tipo: "isca-outro-hospedeiro", instancia: "inp-nome-pais", estado: "S0", janela: "1280x900", clausula: C.emag41, pergunta: PCONTR("o rótulo do campo"),
    medidaNestaPreparacao: "rgb(51, 51, 51) sobre branco = 12,63:1" },
  { chave: "isca:inp-codigo:200", tipo: "isca-outro-hospedeiro", instancia: "inp-codigo", estado: "S0", janela: "640x450", clausula: C.emag43, pergunta: P200("o rótulo e o texto de apoio do campo"),
    medidaNestaPreparacao: "rótulo 41/41 px, 200/200 de largura; apoio dentro da janela; nada fora" },
];

// conferência: toda citação existe literalmente no corpus (normalizando espaços)
const norm = t => t.replace(/\s+/g, " ").trim();
for (const it of ITENS) {
  const txt = norm(readFileSync(join(CORPUS, it.clausula.arquivo), "utf8"));
  for (const k of ["citacao", "itemDaLista"]) if (it.clausula[k] && !txt.includes(norm(it.clausula[k]))) throw new Error(`citação não literal: ${it.chave} ${k}`);
}
if (ITENS.length !== 14 || ITENS.filter(i => i.tipo.startsWith("isca")).length !== 10) throw new Error("composição errada");

// embaralhamento: mulberry32(SEMENTE) + Fisher–Yates
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEMENTE);
const ordem = ITENS.map((_, i) => i);
for (let i = ordem.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; }
const embaralhados = ordem.map((k, n) => ({ id: `R-${String(n + 1).padStart(2, "0")}`, ...ITENS[k] }));

const inventario = JSON.parse(readFileSync(join(AQUI, "inventario.json"), "utf8"));
const pedido = {
  _meta: {
    tela: "Cadastrar país importador (cadastro-pais.html)",
    tarefa: "Medição por item. Para cada item: vá à instância indicada, no estado e na janela indicados, a partir de carga limpa; meça o que a pergunta pede; leia a cláusula no arquivo do corpus (ela está citada literalmente) e responda se a medida a satisfaz. Os itens são independentes; a ordem não significa nada.",
    pagina: { url: "http://127.0.0.1:3219/cadastro-pais.html", servir: "CORPUS_DIR=\"F:/Dev Nath/TCC/.tmp-eval/corpus-e\" node \"F:/Dev Nath/TCC/.tmp-eval/auditoria-e2/servir.mjs\" 3219 (o dist/ já está montado)" },
    inventario: "F:/Dev Nath/TCC/.tmp-eval/auditoria-e2/inventario.json (instâncias e estados)",
    estados: inventario.estados.map(e => ({ id: e.id, descricao: e.descricao })),
    passosDosEstados: { S0: "carregar a página", S1: "S0 + clicar #btn-salvar", S2: "S0 + clicar #sel-continente [data-trigger]" },
    janelas: { "1280x900": "padrão", "640x450": "equivalente a 200 % de 1280×900" },
    norma: `só ${CORPUS} (DS 3.7.0 e e-MAG 3.1)`,
    meios: "navegador headless (Playwright/Chromium), estilos computados, geometria, árvore AX, capturas; sem axe, sem ferramenta de validação de terceiros, sem ler o CSS/JS servidos como fonte.",
    resposta: {
      arquivo: "F:/Dev Nath/TCC/.tmp-eval/auditoria-e2/remedida/saida/respostas.json",
      formato: "{ \"itens\": [ { \"id\": \"R-01\", \"medida\": <valores medidos>, \"satisfaz\": \"sim\" | \"nao\" | \"incerto\", \"porque\": \"…\", \"como\": \"script/medida usada\" } ] } + os scripts usados em saida/",
    },
  },
  itens: embaralhados.map(it => ({ id: it.id, instancia: it.instancia, estado: it.estado, janela: it.janela, clausula: it.clausula, pergunta: it.pergunta })),
};
mkdirSync(DESTINO, { recursive: true });
const textoPedido = JSON.stringify(pedido, null, 1) + "\n";
writeFileSync(join(DESTINO, "pedido.json"), textoPedido);

const mapa = {
  _meta: {
    regra: "Regra do coordenador, fixada antes de qualquer resultado: uma sorteada DS conta como confirmada às cegas para o portão se a 1ª auditoria a achou com a cláusula sorteada OU se o 2º auditor cego, perguntado de forma neutra entre iscas, mede o observável sorteado como violado. 'Achada com outra cláusula' sozinha continua sendo o item 1 da autora.",
    semente: SEMENTE, prng: "mulberry32 + Fisher–Yates (montar-pedido-remedida.mjs)",
    pedido: { arquivo: "auditoria-e2/remedida/pedido.json (fora do repositório)", sha256: createHash("sha256").update(textoPedido).digest("hex") },
    iscas: "10: controles conformes (btn-cancelar, swt-certificado) e obrigações conformes de outros hospedeiros (msg-orientacao, inp-nome-pais, inp-codigo), medidas conformes nesta preparação (headless, corpus 386a8d8). Tipos espelham os das 4 sorteadas: posição/alinhamento, corte a 200 %, visual de estado na mensagem, contraste.",
    paraOPortao: "Só as DS contam: rad-situacao (não achada) e msg-erro (outra cláusula). lst-paises e sel-continente são G e entram para disfarce e sensibilidade.",
  },
  mapa: embaralhados.map(it => ({ id: it.id, tipo: it.tipo, chave: it.chave, instancia: it.instancia, medidaNestaPreparacao: it.medidaNestaPreparacao ?? null })),
};
writeFileSync(join(AQUI, "remedida-mapa.json"), JSON.stringify(mapa, null, 1) + "\n");
console.log(embaralhados.map(i => `${i.id}:${i.tipo.split("-")[0]}`).join(" "));
