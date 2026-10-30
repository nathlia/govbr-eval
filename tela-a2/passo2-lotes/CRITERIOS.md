# Critérios do passo 2 da tela A2 (NAT-110) — para quem julga um lote

Você julga, uma a uma, unidades candidatas a obrigação tiradas do texto oficial do gov.br DS 3.7.0.
O resultado vira insumo congelado de um sorteio de defeitos para um experimento de mestrado. Rigor e
consistência importam mais que velocidade. Escreva em PT-BR.

## Regras invioláveis (cegueira)

- **Não abra:** `F:\Dev Nath\TCC\govbr-ds-validator\` (nada), `F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\normalizacao\`,
  `ds-rules\0*`, `govbr-eval\checker-aliases.json`, `govbr-eval\kb-aliases*.json`, `govbr-eval\results\`, `govbr-eval\reports\`.
- **Não chame** nenhuma ferramenta `govbr-ds-validator` (MCP) nem rode axe/Playwright. Não edite nenhum arquivo de repositório.
- Escreva **só** o arquivo de saída indicado no seu pedido.
- Nunca use como motivo (nem na justificativa) falta de detector, de busca, de checker ou de suporte do oráculo.

## Onde está tudo

- Unidades: `F:\Dev Nath\TCC\govbr-eval\tela-a2\universo.json` (`unidades[]`: `id`, `fonte.arquivo`, `secao`,
  `texto`, `contexto` = bloco inteiro, `antecedente` = bloco anterior / introdução da lista, `forca` proposta, `marcador`).
- Situação de cada uma: `govbr-eval\tela-a2\elegibilidade.json` (`regras[]`, `passo2: "pendente"` = a julgar).
- Texto-fonte, se precisar de mais contexto: `F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\<fonte.arquivo>`.
- Exemplos de julgamentos já feitos (estilo e granularidade): `govbr-eval\tela-a2\elegibilidade-passo2.json`.
- Inventário da tela: `govbr-eval\tela-a2\inventario.json`.

## A tela (o que existe e o que não existe)

"Acompanhar requerimento", página interna gov.br, janela 1280×900, fundo claro, três estados:
S0 carga (aba Andamento ativa), S1 aba Documentos selecionada, S2 "Enviar documento" com o formulário vazio.

Instâncias **sorteáveis** (só estas podem hospedar defeito):

| id | o que é |
|---|---|
| `crd-resumo` | card com número do requerimento, serviço, situação, prazo; contém os dois gatilhos de tooltip |
| `tip-prazo`, `tip-protocolo` | tooltips simples (não popover), abrem acima/abaixo do gatilho; gatilho = botão só com ícone dentro do card |
| `msg-pendencia` | message tipo Alerta (S0), uso direcionado, com botão Fechar |
| `msg-retorno` | message tipo Erro (S2), uso direcionado, com botão Fechar |
| `tab-requerimento` | tab com 2 abas (Andamento, Documentos); itens da tab são Item; divider sob a barra |
| `stp-andamento` | Step Complexo, horizontal, rótulo abaixo centralizado, progressão linear, 4 etapas: 1 concluída (Tag de concluído), 2 atual, 3–4 desabilitadas |
| `tbl-movimentacoes` | tabela 5 linhas × 3 colunas (Data, Movimentação, Responsável), sem ações, sem seleção, sem paginação |
| `sel-tipo-documento` | select simples (não múltiplo), com input, botão gatilho, list/item internos |
| `upl-documento` | upload de 1 arquivo, rótulo "Envio de documentos", texto de apoio com formatos |
| `swt-aviso-email`, `swt-aviso-sms` | switches com rótulo, dentro do fieldset "Avisos sobre o requerimento" |
| `chk-avisos-todos` | checkbox principal dos dois switches, com estado intermediário |
| `acc-duvidas` | accordion de 3 itens, fechados na carga, atributo `single` (um aberto por vez) |
| `pagina` | o documento: title, lang, hierarquia de títulos, ids |

**Embutidos** (componente de andaime dentro de instância sorteável — as unidades desses componentes podem ser hospedadas SÓ aqui):
button → msg-pendencia, msg-retorno (Fechar), tip-prazo, tip-protocolo (gatilho), sel-tipo-documento (gatilho), upl-documento (escolher arquivo), acc-duvidas (cabeçalho do item é button);
input → sel-tipo-documento; list → sel-tipo-documento; item → sel-tipo-documento, tab-requerimento; divider → tab-requerimento; tag → stp-andamento.

**Moldura protegida (andaime, sempre conforme, nunca hospeda defeito):** header, footer, skiplink, breadcrumb,
a região principal `main`, os botões `btn-enviar` (primário, "Enviar documento") e `btn-voltar` (secundário).
**Não existe na tela:** tema escuro, móvel/toque, vídeo/áudio, imagem de conteúdo, links no conteúdo sorteável,
CAPTCHA, multiselect, paginação, modal, menu, empty state, campo de texto livre, senha, wizard, avatar, carousel.

## Decisão por unidade

Para cada unidade pendente, escreva **uma** decisão:

1. **Força pelo contexto** (leia `texto`, `contexto`, `antecedente`). Unidades `a-julgar` (imperativo,
   "é importante", "Atenção:") e qualquer outra: se, lidas no contexto, são recomendação/orientação de uso
   ("Utilize X quando…", "considere", "evite") → `motivo: "forca"`. Se impõem algo (exigência ou proibição) → siga.
   Itens herdados de uma introdução ("Não utilize Steps:" → itens) herdam a força dela.
2. **Aplicabilidade** à tela acima. Não se aplica → `nao-se-aplica` (diga o que falta na tela).
   Só se manifestaria na moldura protegida → `so-andaime`. Diz respeito a outros tamanhos de janela, móvel,
   toque, breakpoints → `escopo` (o contrato de observação é 1280×900; texto ampliado a 200% NÃO é escopo, é aplicável).
3. **Normatividade:** o marcador casou mas a frase não impõe nada (define termo, descreve o DS, exemplo,
   permissão "pode", opcional) → `nao-normativa`.
4. **Verificável na página construída** por medida pequena (DOM, CSS computado, árvore de acessibilidade,
   sequência de teclas, texto visível). Não → `sem-medicao`, MAS só quando nem a rubrica editorial abaixo dá
   um caso inequívoco (processo de design, intenção, finalidade de dado, "estudar", "avaliar").
5. **Acoplada:** violar exige uma segunda violação (ex.: tirar o componente inteiro) → `acoplada`.
6. **Duplicada:** mesmo predicado, mesma condição e mesmo observável de outra unidade → `duplicada:<id da outra>`
   (fica a de id menor em ordem de texto). Tecla específica ≠ "acessível por teclado"; "rótulo e estado" ≠ só "rótulo".
   Se a unidade do DS diz exatamente o mesmo que uma recomendação do e-MAG 3.1 (mesmo predicado/condição/observável),
   marque `duplicada:<id e-MAG>` e `equivalenteEmag: "X.Y"`; se diz mais (tecla, estado, classe, token) ela fica.
   Ids das recomendações e-MAG: procure em `universo.json` as unidades com `marcador: "emag-recomendacao"`.
7. **Conflito** com outra obrigação aplicável → `conflito` (descreva os dois lados e qual a página conforme segue).

### Rubrica editorial (R-ED)

Cláusula de redação (clareza, concisão, tom, maiúsculas, verbos, artigos, jargão) é **aceita** quando dá para
escrever uma variante cuja violação dois leitores independentes classificariam igual pelas palavras da própria
cláusula: (a) critério contável no texto (nº de palavras, caracteres, maiúscula inicial, presença de artigo/verbo,
formato de data); ou (b) caso flagrante e oposto ao texto (ex.: tooltip de 80 palavras quando o texto pede "curto";
mensagem de erro "Erro." quando o texto pede dizer o que ocorreu e o que fazer). Diga na justificativa qual (a/b).
Só sai como `sem-medicao` se o objeto é intenção/processo ou nenhum caso é inequívoco.

## Se aceita

```json
"a2-xxxxxxxxxxxx": {
  "aceita": true,
  "justificativa": "O que a cláusula exige, na tela. Medida: o que medir.",
  "instancias": ["..."],
  "variantes": [{ "id": "kebab-curto", "descricao": "Uma mudança local, concreta (qual elemento, qual valor).", "instancias": ["opcional: se só vale em parte dos hospedeiros"], "clausula": "trecho literal da unidade que a variante viola" }],
  "tipo": "estrutura-classe | visual-token | comportamento",
  "caminhoDeteccao": ["axe | medicao | leitura-da-regra | interacao"]
}
```

- **Variante:** uma mudança local, que não force segunda violação, que não toque a moldura protegida, e que viole
  a cláusula **com as condições dela preservadas** (se a cláusula diz "quando X", a variante acontece com X verdadeiro).
  Ids de variante e textos **nunca** descrevem defeito com nome de classe na página (isso é do gabarito, tudo bem aqui).
  Pode haver 1–3 variantes; cada hospedeiro precisa de pelo menos uma que valha nele.
- **tipo** (classificação a priori, para relatório): `estrutura-classe` (marcação, classes, elementos, atributos,
  anatomia), `visual-token` (cor, tipografia, espaçamento, sombra, posição, tamanho), `comportamento` (teclado,
  foco, estados por interação, efeito imediato, ARIA dinâmico).
- **caminhoDeteccao** a priori, SÓ pelo texto da regra (nunca pelo que alguma ferramenta faz): `axe` (uma regra
  genérica de acessibilidade automática pegaria), `medicao` (uma medida DOM/CSS determinística pegaria se alguém
  souber o que medir), `leitura-da-regra` (a página parece normal; só quem conhece esta cláusula do DS vê o defeito),
  `interacao` (precisa teclar/clicar/arrastar para ver). Lista ordenada do mais provável ao menos.

## Se rejeitada

```json
"a2-xxxxxxxxxxxx": { "aceita": false, "motivo": "nao-se-aplica", "justificativa": "Uma linha: o porquê concreto." }
```

Motivos permitidos: `forca`, `nao-se-aplica`, `escopo`, `so-andaime`, `nao-normativa`, `sem-medicao`, `acoplada`,
`duplicada:<id>`, `conflito`. Para `duplicada` de e-MAG acrescente `"equivalenteEmag": "X.Y"`.

## Saída

Um único arquivo JSON `{ "<id>": decisão, ... }` com **todas** as unidades do seu lote (nenhuma faltando,
nenhuma a mais), no caminho indicado no pedido. Depois, responda com: contagem por motivo, aceitas, e até 5
casos em que você hesitou (id + dúvida).

## Adendo — rodada 2 (unidades da auditoria de leitura e tabelas)

- **Já julgado (para coerência e para apontar duplicadas):** `F:\Dev Nath\TCC\govbr-eval\tela-a2\elegibilidade-passo2.json`
  (1.424 decisões das rodadas anteriores, 312 aceitas). Antes de aceitar, procure ali a mesma obrigação; se for o
  mesmo predicado, condição e observável, marque `duplicada:<id já aceito>` (pode apontar para id maior se o outro
  já está aceito).
- **marcador `tabela-especificacao` / `auditoria-tabela`:** a unidade é a tabela INTEIRA (valores de token: cor, px,
  peso, espaçamento, ícone por ação). `contexto` traz as linhas. Aceite se ao menos uma linha vale para uma
  instância da tela (tema claro, densidade padrão, 1280); as variantes mudam UM valor de UMA linha aplicável —
  cite a linha em `clausula`. Linhas de tema escuro, densidades não usadas, outros breakpoints não contam.
  Se nenhuma linha se aplica → `nao-se-aplica`. Tabelas puramente descritivas → `nao-normativa`.
- **marcador `auditoria-leitura`:** frase achada por leitura humana; `forca` é só proposta. Decida a força pelo
  contexto (abra o arquivo-fonte na linha se precisar).
- **Fatos de construção já fixados:** a Tag de concluído do Step Complexo no core 3.7.0 é o marcador `.step-alert`
  do próprio step (`data-alert="success"`), não um `br-tag`; a fonte Rawline será empacotada na página (a página
  conforme a usa); o accordion usa `single`; os switches e o checkbox principal ficam num fieldset com legend.
- Mantenha o mesmo critério de força já usado: "evite/prefira/considere/opte/procure/quando possível" → `forca`.
