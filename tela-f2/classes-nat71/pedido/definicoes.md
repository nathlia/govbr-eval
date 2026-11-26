# Definições (cópia literal)

De `thesis-workspace/planejamento/atual/plano-nat71-objetivos-evidencia-2026-10-13.md`:

### 3.1 Classes do **defeito**

A classe é propriedade do defeito e do que é preciso observar para decidi-lo. Não depende de qual ferramenta o detectou nem de existir *checker*.

| Classe | Definição operacional | Exemplo dentro do escopo | Caso limítrofe e regra |
|---|---|---|---|
| **Sintático** | Decidível olhando **um elemento** isolado, em **um estado**: presença ou valor de atributo, tag, papel ARIA, ou texto-fonte de uma declaração. Não exige outro elemento, geometria nem interpretação de significado. | `tabindex="1"`; `div role="button"` onde a norma pede o elemento nativo; atributo `aria-current` ausente quando a página atual já é conhecida pelo próprio elemento. | Se, para decidir, é preciso saber **qual** item é o atual (URL ou estado), a classe passa a ser contextual. |
| **Layout / visual** | Decidível sobre o estilo computado, a geometria ou os pixels de um elemento num estado: cor, contraste, espaçamento, raio, contorno de foco, tamanho. Inclui "valor fora dos *tokens*". | A-03 (cor fora da paleta); A-04 (`outline: none`); contraste insuficiente (WCAG 1.4.3). | "*Token* certo **para o contexto**" (o valor está na paleta, mas não é o indicado para aquele papel) é semântico, não layout. |
| **Contextual / relacional** | A decisão exige relacionar **dois ou mais** elementos (rótulo↔controle, erro↔campo, hierarquia, contêiner↔item), verificar **presença/ausência global** na página (*skip link*, header/footer do DS, título) ou observar uma **transição de estado** (foco antes e depois, ordem de teclado). | A-01 (foco ao fechar o diálogo); A-08 (erro sem associação); A-09 (rótulo sem `for`); A-07 (links fora de lista); P-01/P-02; B-01 (*skip link*). | **Continua podendo ter predicado determinístico.** A NAT-85 implementa três famílias dessa classe. |
| **Semântico** | A decisão exige **interpretar significado ou propósito**: se o texto alternativo é equivalente, se o rótulo descreve a função, se o componente escolhido é o adequado à intenção, se o *token* é o certo para o papel. O critério prático é que dois revisores precisam ler o conteúdo, e não só a estrutura, para concordar. | "Alt presente mas não equivalente"; título de página presente mas não descritivo; botão secundário usado como ação primária. | A presença do alt ou do título é sintática. A **adequação** é semântica. Uma spec pode ter as duas partes: classificar pela parte que a referência efetivamente cobra. |

### 3.2 Eixo separado de automatizabilidade (não confundir com a classe)

| Nível | Significado |
|---|---|
| **a — implementado e testado** | Há predicado em ferramenta, com positivos e negativos que passam (*checker* do validator, regra do axe, regra Stylelint). |
| **b — escrevível** | Existe definição determinística do predicado (fonte normativa, evidência, exceções), mas não está implementado ou não foi testado. |
| **c — exige interpretação** | Não há predicado fechado sem julgamento de significado. Heurísticas podem aproximar, mas com incerteza declarada. |

Regra: "não detectado pelas ferramentas testadas" equivale a "nível a ausente **nas ferramentas e versões testadas**". Só o nível c sustenta algo próximo de "estruturalmente difícil para ferramentas baseadas em regras". Mesmo isso precisa da frase delimitada exigida pela NAT-71. O `hasChecker` da tela A (`tela-a/has-checker.json`) é por alias de regra e não prova detecção nem impossibilidade, como diz o próprio campo `limite`.

De `thesis-workspace/planejamento/atual/protocolo-nat78-estudo-complementar-CONGELADO-2026-11-16.md`:

### 5.3 Classes pré-registradas (NAT-71 §3, aplicadas antes da coleta)

*(sem mudança)* Cada spec da tela D recebe classe (sintático, layout/visual, contextual/relacional,
semântico) e nível de automatizabilidade (a, b, c); dois classificadores LLM novos e cegos, depois a
autora decide os desacordos; arquivo com sha256 (`CONG-14`) **antes** do primeiro disparo. A 1ª
classificação do auditor (`_meta.classes`) é proposta, não final.
