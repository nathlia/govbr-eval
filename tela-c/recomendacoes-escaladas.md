# Tela C (Cadastrar empresa): o que a autora decide — 11 itens + o piso

Nada aqui foi aplicado à referência (`ground-truth-cadastrar-empresa.json` `1.0.0-candidata`). Cada
item tem a medida, a pergunta e a recomendação do assistente. **"Aceito tudo"** é resposta válida;
para recusar um item, basta citar o número. Critério da recomendação (o mesmo da B): vira unidade só
o que tem medida determinística, norma `required`/`prohibited` da base de 186 regras, fato autoral
(não DS, não versão, não linguagem) e cai numa parada declarada. **Na dúvida, fica fora** (⚠).
Tempo estimado: ~25–30 min.

## Antes de tudo: o piso (L2)

A referência sai **fina**. Sem as unidades `exposto`: **3 specs** (C-01, C-02, C-03; 10 unidades),
**1 família** (F4, e-MAG), 3 tipos de componente do DS (select, button, input), 12 controles
conformes. O piso fixado antes (adendo § A) é ≥ 8 specs, ≥ 3 famílias, ≥ 3 tipos, ≥ 4 conformes.
Mesmo aceitando todas as recomendações "incluir" abaixo (E-01, E-02) ficam 5 specs, 1 família. Só
incluindo também os itens que o assistente recomenda deixar fora a tela chegaria a 2 famílias (F1) —
ainda abaixo de 3. **Pergunta L2:** rota nº 5 (`/portal-mpa/processos`, nova auditoria inteira,
~1,5 dia) ou derrubar a tela C (corte 2)? O assistente não recomenda inflar a C para passar o piso.

## Itens

| # | Norma | Medida | Pergunta | Recomendação |
|---|---|---|---|---|
| E-01 | 01b1806c30e9 · e-MAG 6.5 | CNPJ, RGP e CEP têm máscara (`##.###.###/####-##`, `AA-A########-#`, `#####-###`) e nenhuma instrução, placeholder ou descrição. A base diz: "Campos com formato específico possuem instrução". | Máscara = "formato específico" que exige instrução? | **Incluir** ⚠: `todos` nos 3 campos, F4. A máscara é o próprio registro de que o formato é específico. Contra: a máscara formata enquanto se digita. |
| E-02 | 11ffc5c577f6 · e-MAG 6.7 | `<form>` com 13 controles em três blocos (identificação, endereço com 7 campos, módulos) e 0 `fieldset`/`legend`; o bloco de módulos é titulado por `<h3>`. | Os blocos são "campos relacionados" que pedem fieldset? | **Incluir** ⚠: 1 unidade `composicao` no `form`. O endereço é relacionado em qualquer leitura. |
| E-03 | accessibility-list-03813ffeeb42 | Lista aberta do seletor: Tab a partir dela fecha a lista e vai para o `<body>`; nenhum item é alcançado por Tab/Shift+Tab. Os itens são alcançados e escolhidos por seta + Enter/Espaço. | A regra de Tab da List vale para a lista de opções de um seletor? | **Fora** ⚠: setas são a convenção de lista de opções; Tab passando por cada opção contrariaria o Select. |
| E-04 | 79db88c7f55d · 1.4; cb56ad444da2 | Com a lista aberta e focada, um Tab deixa o foco no `<body>`; o Tab seguinte vai para "Adicionar". | Um passo de Tab sem foco quebra a "sequência lógica"? | **Fora** ⚠: a sequência continua certa depois; é um passo perdido, não uma ordem errada. |
| E-05 | e038367bd7d6 | O seletor (campo que abre lista) não tem `role=combobox`, `aria-expanded`, `aria-haspopup`, `aria-controls`; a lista não tem `role=listbox`. O exemplo oficial do Select do DS tem a mesma marcação (só `aria-label` no botão). | Falta de ARIA de widget é defeito autoral, se o DS mostra igual? | **Fora**: a marcação reproduz o exemplo oficial; seria julgar o DS. |
| E-06 | component-message-66b01a712e67; e038367bd7d6 | A br-message "Atenção. Não há usuários…" tem ícone à esquerda (ok) e **nenhum botão Fechar**; os 8 exemplos oficiais de br-message têm. Ela tem `role=alert` desde a carga, com conteúdo estático. | A ausência do Fechar viola a regra (que fala da posição dele)? `role=alert` estático viola a regra de ARIA? | **Fora** ⚠ nos dois: a regra posiciona o botão, não o exige; `alert` em mensagem de carga é juízo de comportamento. |
| E-07 | component-button-4d7b5f978df1; foundation-global-1c0146e93d2e | "Exibir lista" do seletor: só ícone, sem a classe `circle`, 32×32. Mas o core 3.4.1 o desenha circular (`.br-input .br-button{border-radius:50%}`, medido 50%) e o exemplo oficial do Select usa o mesmo botão. Na B o mesmo elemento virou B-10/B-29. **Exposto** (o auditor leu a B). | Unidade, como na B, ou fora? | **Fora**: a medida nova (raio 50%, exemplo oficial) mostra anatomia do DS. A B continua congelada como está; a diferença fica declarada. |
| E-08 | foundation-global-0578aa6c2828 | Grid do core 3.4.1: 12 + 12 px (24 px) entre colunas; KB 3.7.0: 40 px. | Valor que só difere entre versões fica fora? | **Fora** (método § 1.4, como a E-08 da B). |
| E-09 | 79db88c7f55d · 1.4 (citação da C-02) | C-02 é o hospedeiro do "Cancelar" com `tabindex="0"`: ponto de Tab sem papel nem nome, onde Enter/Espaço não fazem nada, antes do botão de verdade. A norma diz "use tabindex apenas quando indispensável"; a evidência esperada fala de ordem e de tabindex positivo. | Manter C-02 sustentada por 1.4 (+ e-MAG 1.1 / WCAG 2.4.3, 4.1.2)? | **Manter** ⚠: o tabindex é mensuravelmente dispensável (o botão interno já é focável) e cria o ponto morto. |
| E-10 | precedentes do D-61 (B) | Casco e itens iguais aos da B: rodapé ausente (B E-02), botão Menu sem efeito (B E-15), siglas CNPJ/RGP/CEP/UF/PNIP sem expansão (B E-12), aba ativa só por classe (B E-03; a anatomia do Tab do DS também não tem `aria-selected`), nenhuma ajuda (B E-16). | Aplicar as mesmas decisões do D-61? | **Sim**: fora / não-aplicável, como na B. |
| E-11 | 1cb2c878824b · 1.2 | "Adicionar", "Cancelar" e "Salvar" ficam fora do `<form>`; o form não tem botão de envio. | Fere o uso semântico do HTML? | **Fora** ⚠: não há texto de norma que exija o botão dentro do form. |

**Registrado sem escalar** (sem norma no universo de 186 regras; alegação correta vira descoberta):
dois botões primários visíveis ao mesmo tempo ("Adicionar" e "Salvar"); os três rádios da lista sem
atributo `name` (não formam grupo); o CEP é rejeitado vazio (`ng-invalid`) mas não mostra "Campo
obrigatório" ao sair, por isso ficou fora da C-03.

**Efeito se tudo for aceito:** +2 specs (E-01: 3 unidades; E-02: 1 unidade) → 9 specs / 18 unidades
com as expostas, 5 specs / 14 unidades sem elas, família F4 só. O piso continua não atingido (L2).
