# Tela A — registro da construção (2026-09-18)

Semente `d6ed93fd095b93e9a45a3145fafac702494fe822` · sorteio em `sorteio.json` · tela em
`govbr-corpus/solicitacao.html` (`src/pages/SolicitacaoPage.tsx`, `solicitacao-comportamento.ts`,
`solicitacao.css`). Conferência sem modelo e sem oráculo: `node tela-a/conferir-construcao.mjs` —
36/36 (14 observáveis de defeito, 22 pontos conformes de comparação).

Nada aqui foi medido por agente, e nenhuma ferramenta do `govbr-ds-validator` foi chamada sobre a
tela. `hasChecker` continua sem anotar: fica para depois de congelar a referência, para que saber o
que o oráculo verifica não influencie como cada defeito foi escrito.

## Como a tela foi montada

Marcação dos exemplos oficiais do pacote `@govbr-ds/core` 3.7.0; o comportamento de select,
datetimepicker, upload e breadcrumb vem das classes do `core.js` do próprio pacote. Envio do
formulário, diálogo de descarte e troca de página do histórico são escritos à mão (o `BRModal` do
pacote não cuida de foco, e a paginação — ver abaixo).

## Onde a construção precisou decidir algo que o sorteio não fixava

| Spec | O que o sorteio dizia | O que foi feito, e por quê |
|---|---|---|
| `21fbcc2fe37b` outline-none @ sel-servico + sel-unidade | `outline: none` no foco do controle | O DS **não** desenha o foco dos campos de texto com outline, e sim com `border-color` + `box-shadow`. `outline: none` sozinho não produzia defeito algum (a 1ª conferência mostrou isso). O defeito injetado suprime o indicador que o DS de fato usa — a regra fala do indicador, não da propriedade. A justificativa do passo 2 ("read computed outline") estava errada quanto ao mecanismo; a medida passou a olhar `outline` **ou** `box-shadow`. |
| `79db88c7f55d` tabindex-positivo @ upl-documentos | "o campo recebe tabindex=1" | O `input[type=file]` do DS é `display: none`; o controle focável é o botão que o `BRUpload` cria. O `tabindex=1` está nesse botão. |
| `b5fad7ce076d` label-sem-for @ rad-forma | não dizia qual das 3 opções | Primeira opção na ordem do documento, a mesma convenção das outras variantes. |
| `21b1a2733f7b` cor-fora-da-paleta @ mod-descartar | "cor principal da instância" | `color` da raiz do diálogo: `#333333` → `#334333` (canal verde +16). Os botões do diálogo são andaime, por isso não são "a cor da instância". |
| `e038367bd7d6` aria-removido @ pag-anteriores | primeiro atributo ARIA de role/estado | É o `aria-current="page"` da página ativa — que o `BRPagination` escreve em tempo de execução. Para o defeito existir a paginação não é instanciada pelo `core.js`; a troca de página é feita à mão. |

`msg-retorno` carrega dois defeitos no mesmo botão Fechar (`1cb2c878824b`: virou
`div role=button`; `66b01a712e67`: trocou de lado com o ícone). Observáveis independentes; a
adjudicação verá duas alegações sobre um elemento.

## Condições de fundo que ninguém injetou

Vêm da marcação oficial ou do `core.js`, existem nos dois braços e não são unidades da referência:
o botão do upload é focável com `aria-hidden="true"`; o foco de radio e checkbox aparece como o
anel padrão do navegador; o skiplink canônico usa `role="menubar"`; Rawline não é empacotada (como
na tela de fluxo, cai para a fonte de reserva). Alegações corretas sobre elas entram como
descoberta na adjudicação (D-48), sem mexer no denominador.
