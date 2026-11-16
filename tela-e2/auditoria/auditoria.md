# Tela E2 ("Cadastrar país importador"): auditoria cega por medição

**Executada em:** 2026-11-14, por agente LLM em contexto novo, sem acesso à construção da página.
**Página:** `http://127.0.0.1:3219/cadastro-pais.html`, servida a partir de `../corpus/dist` por `../servir.mjs`.
**Instâncias e estados:** só os de `../inventario.json`.
**Norma:** só `F:\Dev Nath\TCC\ds-rules\govbr-ds-3.7.0-corpus\` (DS 3.7.0 e e-MAG 3.1).

| Arquivo (`saida/`) | Conteúdo |
|---|---|
| `comum.mjs`, `util-navegador.mjs`, `paleta.mjs` | Condições de medida (1280×900, headless, carga limpa por medida), utilitários injetados na página e paleta extraída de `cores.md`. |
| `extrair-obrigacoes.mjs` → `obrigacoes-candidatas.json` | Triagem das 705 frases `required`/`prohibited` de `normalizacao/rules.jsonl` (componentes da página + globais). Usada só como índice: toda citação é conferida no `.md` original. |
| `medir-html-servido.mjs` → `medidas/html-servido.json` | Fatos dos bytes do HTML servido. |
| `medir.mjs` → `medidas/S{0,1,2}/{pagina,instancias,proveniencia,texto,cores,tab}.json` | Medidas estáticas por estado: atributos, caixa, estilos computados, pseudo-elementos, árvore AX (CDP), contraste de todo texto visível, todas as cores computadas, ordem de Tab com diferença de pixels foco × sem foco, seletor CSS vencedor. |
| `interagir.mjs` → `medidas/interacoes/*.json` | 27 sondas de teclado, ponteiro e redimensionamento (640×450, equivalente a 200 %). |
| `sondas-extra.mjs`, `proveniencia-variaveis.mjs` | Complementos: pixels em repouso, `readonly` por Tab × clique, clique e hover no select, e de que seletor vem cada variável CSS contestada. |
| `avaliar.mjs` → `achados.json`, `conformes.json`, `incertos.json`, `cobertura.json`, `medidas/<id>.json` | Tabela obrigação × instância × estado → decisão. |
| `conferir-auditoria.mjs` → `medidas/conferencia.json` | Remede de carga limpa o predicado de cada achado em cada estado e confere cada citação no corpus. |
| `rodar.mjs` | Ponto de entrada único: refaz tudo na ordem. |

## 1. Cegueira e exposição

**O que foi lido:**
- `../inventario.json`.
- Os scripts e o formato de `../modelo-a2-auditoria/`. As conclusões daquela auditoria não foram usadas.
- O corpus normativo: abas designer, acessibilidade e desenvolvedor de button, input, select, radio, switch, list, item e message; as obrigações normalizadas de skiplink, breadcrumb, header, footer, signin, avatar e divider; `fundamentos-visuais/{cores,tipografia,estados,iconografia}.md`; `padroes/design/formulario.md`; `padroes/writing/microcopy.md`; e-MAG 3.1.
- O HTML servido da página e, para seguir os links da trilha, os títulos das páginas de destino servidas pelo mesmo `dist`.

**O que não foi aberto:**
- Nenhuma outra pasta de `F:\Dev Nath\TCC` e nenhum histórico git.
- `core.min.js`, `comportamento.js` e o CSS servidos.
- Nenhuma ferramenta do validador e nenhum axe.

**Como a origem dos valores foi apurada sem ler fontes:** pelo nome do seletor CSS vencedor (CDP `CSS.getMatchedStylesForNode`) e pela mudança de atributos depois de interações.

**Infraestrutura:** foi criado um `node_modules` como junção para `govbr-eval/node_modules`, apenas para usar o Playwright.

## 2. Método

1. **Universo normativo.** Entram as frases que obrigam ou proíbem ("deve", "precisa", "é obrigatório", "não deve", "nunca") e as linhas de tabelas de especificação e de propriedades obrigatórias, para os 15 componentes da página e as regras globais aplicáveis. Recomendações ("recomenda-se", "evite", "é importante", "considere", "certifique-se" em seções de recomendação) não geram achado. Quando foram medidas, viram incerto com o motivo.
2. **Medida.** Para cada obrigação × instância × estado: estrutura do DOM, atributos, estilo computado, geometria, papel e nome na árvore AX, ordem de Tab, diferença de pixels com foco, comportamento de teclado e ponteiro, e mudança de estado após interação. Cada estado parte de uma carga limpa:
   - **S0:** carga.
   - **S1:** carga e clique em `#btn-salvar`.
   - **S2:** carga e clique no gatilho do select.
3. **Classificação.**
   - **Achado:** a medida contraria a cláusula e o valor vem de marcação, seletor ou variável da página.
   - **Incerto:** a medida contraria a cláusula, mas o valor vem só de seletores do próprio DS (`br-*`, `h2`, `legend`), ou seja, o DS e sua documentação divergem. Também é incerto quando a cláusula é ambígua, é recomendação, conflita com outra obrigação ou a medida não decide.
   - **Princípios amplos** (`acessibilidade.md`: "perceptível", "não pode impor barreiras") aparecem só em `tambem`.
4. **Unidade.** Um achado por obrigação × instância. O campo `estados` lista cada estado em que o predicado foi medido violado, e `medidas/<id>.json` guarda o valor medido por estado; não há fusão de estados com evidências diferentes. Instâncias diferentes nunca são somadas. Cláusulas que expressam a mesma obrigação em dois documentos (button + formulário) vão no mesmo achado, em `clausulas`.
5. **Classe da cláusula.**
   - **DS:** cláusula específica de componente, fundamento ou padrão do DS.
   - **Geral:** e-MAG, ou contraste, foco e teclado.

## 3. Estados medidos

| Estado | Passos | Foco na chegada | Observações |
|---|---|---|---|
| S0 | Carga. | `body` | Nenhum erro de página, nenhum pedido externo, só GET. |
| S1 | Clique em `#btn-salvar`. | `#btn-salvar` | `#msg-erro` visível com `role=alert`. 3 feedbacks de campo, todos com `aria-invalid` e `aria-describedby`. |
| S2 | Clique em `#sel-continente [data-trigger]`. | `#continente` | Lista aberta (`aria-expanded=true`), 6 opções `role=option`. |

O id da lista do select (`list-NNNN`) muda a cada carga.

## 4. Cobertura (instância × estado × obrigações verificadas)

| Instância | S0 | S1 | S2 | Achados | Conformes | Incertos |
|---|---|---|---|---|---|---|
| btn-limpar | 13 | 12 | 11 | 2 | 12 | 0 |
| btn-ajuda | 8 | 7 | 7 | 1 | 6 | 1 |
| inp-nome-pais | 9 | 8 | 7 | 2 | 6 | 2 |
| inp-codigo | 10 | 8 | 8 | 2 | 8 | 0 |
| sel-continente | 10 | 7 | 9 | 2 | 8 | 4 |
| rad-situacao | 6 | 10 | 5 | 0 | 10 | 1 |
| swt-certificado | 8 | 2 | 2 | 0 | 8 | 0 |
| lst-paises | 8 | 7 | 7 | 0 | 5 | 3 |
| msg-orientacao | 11 | 8 | 8 | 2 | 6 | 3 |
| msg-erro (só S1) | – | 5 | – | 2 | 3 | 0 |
| btn-salvar (andaime) | 8 | 8 | 8 | 0 | 8 | 0 |
| btn-cancelar (andaime) | 8 | 8 | 8 | 0 | 8 | 0 |
| skp-conteudo | 5 | 2 | 2 | 0 | 4 | 1 |
| brd-trilha | 5 | 5 | 5 | 0 | 3 | 2 |
| hdr-govbr | 1 | 1 | 1 | 0 | 1 | 0 |
| sgn-usuaria | 1 | 1 | 1 | 0 | 0 | 1 |
| ava-usuaria | 1 | 1 | 1 | 0 | 1 | 0 |
| ftr-govbr | 1 | 1 | 1 | 0 | 1 | 0 |
| div-secoes | 1 | 1 | 1 | 0 | 1 | 0 |
| pagina | 15 | 14 | 14 | 0 | 14 | 1 |

**Totais:**
- 20 instâncias e 58 instâncias × estado declarados, todos cobertos.
- 145 verificações obrigação × instância, que somam 351 avaliações obrigação × instância × estado.
- Resultado: 13 achados (DS 9 · geral 4), 113 conformes e 19 incertos.
- Item embutido: não há instância própria. Os itens foram medidos dentro de `sel-continente` e `lst-paises`.

**Sondas de interação feitas em um só estado.** Tab/Space/Enter/Esc, clique, foco após fechar e ação de botão foram feitas no estado em que fazem sentido, geralmente S0. Por isso as colunas S1 e S2 de algumas instâncias têm menos verificações. O componente é o mesmo nos três estados: `instancias.json` mostra a mesma marcação, salvo as diferenças da § 3.

## 5. Achados

Medida completa, origem e citações em `achados.json` e `medidas/EA-*.json`.

| Id | Instância | Estados | Classe | Cláusula (resumo) | Medida (resumo) |
|---|---|---|---|---|---|
| EA-01 | btn-limpar | S0 S1 S2 | DS | button designer / formulário: ênfase primária sempre à direita | Botões, da esquerda para a direita: Cancelar · Salvar País (primário) · Limpar Campos. O primário fica no meio. |
| EA-02 | btn-limpar | S0 S1 S2 | geral | e-MAG 6.3 / 1.4: ordem lógica no código, depois CSS | Ordem de Tab: Cancelar → Limpar → Salvar. Ordem visual: Cancelar → Salvar → Limpar. |
| EA-03 | btn-ajuda | S0 S1 S2 | DS | button: ícone obrigatório no circular; formulário: botão de ajuda com ícone ou texto | O botão circular contém só `.sr-only`, sem pseudo-elemento. 0 pixel não branco em repouso. |
| EA-04 | inp-nome-pais | S0 S1 S2 | DS | input: "Por meio dele o usuário deve inserir a informação…" | `readonly` continua depois do foco por Tab e o texto digitado não entra. Só um clique de ponteiro libera o campo. |
| EA-05 | inp-nome-pais | S0 S1 S2 | geral | e-MAG 2.1: funções de script programadas primeiro para teclado | A liberação do campo só ocorre por clique de ponteiro. |
| EA-06 | inp-codigo | S0 S1 S2 | DS | tipografia: usar a família definida (Rawline) | Rótulo, campo e texto auxiliar em Arial, por `.campo-codigo .br-input`. |
| EA-07 | inp-codigo | S0 S1 S2 | DS | input, tabela de especificação: texto auxiliar `margin-top --spacing-scale-base` | `margin-top` de 4 px (`--spacing-scale-half`, em `.apoio-campo`), contra 8 px esperados. |
| EA-08 | sel-continente | S2 | geral | cores.md: contraste mínimo de 4,5:1 / e-MAG 4.1 | Rótulos das 6 opções em #aaa sobre branco: 2,32:1. |
| EA-09 | sel-continente | S2 | DS | cores.md: usar sempre as cores pré-definidas | #aaaaaa não está na paleta (vem de `.campo-continente .br-item { --text-color: #aaa }`). |
| EA-10 | msg-orientacao | S0 S1 S2 | DS | message: texto curto, claro e objetivo | O corpo cita "persistidos no banco", "commit da transação", "cache do endpoint". |
| EA-11 | msg-orientacao | S0 S1 S2 | geral | e-MAG 3.11: leitura no nível do ensino fundamental (e 3.12 em `tambem`) | Os mesmos termos técnicos, sem explicação, `abbr` ou `dfn`. |
| EA-12 | msg-erro | S1 | DS | cores.md: a cor indica o estado; message, tabela de Erro: superfície `--red-vivid-10` | Mensagem de erro com superfície #2670e8 (blue-warm-vivid-50) e texto branco. A cor vem de `.formulario-pais .retorno-envio`, que sobrescreve `.br-message.danger`. |
| EA-13 | msg-erro | S1 | DS | iconografia: significados da tabela, sem duplo sentido (`fa-check` = Confirmar) | Ícone `fa-check` visível dentro da mensagem de erro, ao lado do `times-circle`. |

## 6. Incertos

Os motivos estão em `incertos.json`.

**O DS e sua documentação divergem.** A medida contraria a cláusula, mas o valor vem do CSS do DS, sem sobrescrita da página:
- Skip link invisível ao ponteiro.
- Item atual da trilha com peso 500 em vez de *semi bold*.
- Tipografia do título e dos textos da lista (h2 do DS e herança de `.br-item`).
- Ícone `angle` no lugar de `caret` no gatilho do select.
- Classes `br-sign-in` em vez de `br-button sign-in`.

**Cláusula conflitante, ambígua ou recomendação:**
- Obrigatoriedade dos campos indicada só por "(opcional)" no campo opcional (3 hospedeiros).
- Foco no 1º campo obrigatório: conflita com o skip link como primeiro foco.
- Foco no Fechar quando a mensagem aparece na carga.
- Foco depois de fechar a mensagem: vai ao h1 ("É importante", recomendação).
- O select não abre ao receber foco por Tab (e-MAG 6.4 desaconselha a abertura automática).
- O contêiner do select recebe `role=combobox` sem nome; o `input` interno está rotulado.
- Lista estática sem paradas de Tab; lista marcada com `div` + `role=list` em vez de `ul`.
- Estrangeirismos ("commit", "cache", "endpoint") sem `lang`.
- Âncoras sem `name` (atributo inválido em `main` e `footer`).
- Trilha como única navegação.
- `btn-ajuda` sem tooltip e sem efeito observável ao clicar ou pressionar Enter.

## 7. Reprodução

`node rodar.mjs` refaz tudo de cargas limpas. Dois resultados:
- **Rodada principal:** em `saida/`.
- **Segunda rodada independente:** com `--saida saida/reproducao`, produziu as mesmas 13 / 113 / 19 decisões, com os mesmos pares instância × chave × estados.

`conferir-auditoria.mjs` confirmou:
- 31 de 31 pares achado × estado reproduzidos de carga limpa.
- Todo achado com `medidas/<id>.json`.
- 199 de 199 citações encontradas literalmente no corpus, normalizando markdown e espaços.

Logs: `medidas/rodada-principal.log` e `medidas/rodada-reproducao.log`.

## 8. Limites: o que não foi verificado

**Responsividade:**
- Só 1280×900, mais 640×450 para o teste de 200 %.
- Sem grid de 4 ou 8 colunas como dispositivo real: tipo especial do breadcrumb, densidade baixa do input em 4 colunas, header e footer móveis e sign-in móvel não foram medidos.

**Navegador e leitor de tela:**
- Um único motor (Chromium).
- Sem leitor de tela real: anúncios inferidos da árvore AX e de `aria-live`/`role=alert`.

**Estados visuais:**
- Hover, pressionado, desabilitado (não há na página), arrastar e tema escuro não foram comparados com as especificações de opacidade e sobreposição de `estados.md`.
- O hover do item do select só foi medido como "muda pixels".

**Contraste e tokens:**
- Contraste não textual (bordas, ícones, anel de foco) não foi medido. O contraste foi medido só em texto.
- Tokens de espaçamento comparados só onde listado (botões, input, texto auxiliar, fieldset, itens da lista, posição da mensagem). Paddings internos da mensagem, do switch, do cabeçalho da lista e do grid do rodapé não foram confrontados.
- Tamanhos de ícone (`--icon-size-*`) não foram medidos.

**Redação:** tom e voz, concisão de rótulos e demais regras de *writing* que dependem de julgamento ficaram fora, exceto o jargão medido na mensagem.

**Fluxos não exercitados:**
- Envio bem-sucedido do formulário, incluindo a tela de confirmação do e-MAG 6.6, por estar fora dos estados declarados.
- Reposicionamento da lista do select sem espaço na tela.
- Seleção múltipla (não há).
- Limite de tempo e atualização automática: só verificada a ausência de `meta refresh`, sem observação longa.

**Sondas em um só estado:** as de switch, radio e mensagem foram feitas em S0 (radio também em S1). Em S1 e S2 foram verificadas só as propriedades estáticas.

**Cláusulas sem objeto na página:** e-MAG de tabelas, mídia, CAPTCHA, PDF e mapas de imagem.

**Proveniência:** separa seletor da página × seletor do DS pelo nome, sem ler o CSS. Uma regra autoral escrita com seletor só de classes do DS seria atribuída ao DS (e iria para incerto, não para achado).
