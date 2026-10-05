# Protocolo da campanha `t7b-sonnet-tela-a-01` — CONGELADO

**Estado: CONGELADO em 2026-10-05.** A autora escolheu o desenho no NAT-66 (opção 1A): o
protocolo da `t7-tela-a-01` (D-89) com **Sonnet 5.5, esforço `high`** no lugar do Opus. O commit do
`govbr-eval` que traz este arquivo é a **semente** da ordem (§5). Este arquivo não muda mais.
Qualquer mudança abre uma campanha nova.

As seções 2, 4, 6, 7 e 8 são **as mesmas** do protocolo congelado
`campanhas/t7-tela-a-01/protocolo.md`, palavra por palavra no conteúdo, e valem aqui como se
estivessem transcritas. Este arquivo escreve por extenso só o que muda (§1, §3, §5, §9, §10) e a
regra de comparação com a T7 (§11).

## 1. Pergunta e hipótese

Na tela A, com **Sonnet 5.5 (`claude-sonnet-5-5`), esforço `high`**, ter o oráculo MCP disponível
muda quantos defeitos sorteados da referência o agente confirma?

- **Por que esta campanha:** a T7 (Opus 5.5 high) não detectou diferença no desfecho principal
  (D-97). A pergunta aqui é se o oráculo ajuda um modelo menor, cujo conhecimento embutido do DS
  pode ser menor (NAT-50, NAT-66).
- **Hipóteses formais**, iguais às da T7:
  - **H0:** as diferenças pareadas D são simétricas em torno de 0.
  - **H1, bicaudal:** a média de D é diferente de 0.
- **Leitura:** o empate, a vantagem do sem e o resultado inconclusivo são resultados válidos. A
  ausência de significância **não** estabelece equivalência.

## 2. Desfecho principal e unidade de análise

Igual à T7 §2: D = confirmadas_com − confirmadas_sem nas 14 unidades sorteadas (A-\*) da
referência 2.0.0, com a revisão cega fechada. Os desfechos secundários também são os mesmos,
incluindo as unidades de página P-\*.

## 3. Tamanho

- **N = 10 pares**, 20 execuções planejadas, o mesmo da T7, para que as duas campanhas tenham o
  mesmo formato.
- **Caráter exploratório.** Não há promessa de poder, e o N é fixo: sem parada antecipada e sem
  pares extras.

## 4. Análise estatística

Igual à T7 §4: o mesmo módulo e os mesmos testes (permutação exata por troca de sinais, Wilcoxon de
Pratt, teste do sinal), o mesmo bootstrap e a mesma leitura. A semente do bootstrap é derivada da
semente **desta** campanha.

## 5. Ordem dos braços e semente

A regra é a da T7 §5:
- a semente é o hash do commit que traz este protocolo;
- `chave(par) = sha256(semente + "|ordem|" + par)`;
- os 5 primeiros pares começam pelo sem e os outros 5 pelo com;
- a agenda é gravada num commit **posterior**, que registra o hash de origem, sem amend.

## 6. Elegibilidade

Igual à T7 §6 (barreiras do D-88).

## 7. Falhas, tempo limite e novas tentativas

Igual à T7 §7:
- tempo limite de 30 min;
- timeout é inelegível e não ganha nova tentativa;
- nova tentativa só por motivo técnico, no máximo 1 por slot e 4 na campanha;
- perdas são relatadas por braço.

## 8. Revisão

Igual à T7 §8. Um revisor agente cego, com contexto novo, revisa cada par, só pela fila mascarada.
A revisão começa depois do último par coletado.
- **Os revisores continuam sendo Opus**, como na T7. Assim, a revisão não muda entre as campanhas;
  muda só o modelo avaliado.

## 9. Configuração congelada

- tela `solicitacao` (govbr-telas `46318d4`, site `1a6e8daf3cdb`);
- referência 2.0.0 (`govbr-eval` `def2125`);
- scorer `flow-semantic-1.5.0`;
- **`claude-sonnet-5-5`, esforço `high`**, com o mesmo cliente fixado da T7;
- validator `b071308` (oráculo 2.7.0, mesmo `distSha256` e `dataSha256` da T7), protocolo da T2;
- braços `sem` e `com`.

## 10. Agenda e orçamento

- **Dias:**
  - **terça, 06/10:** sem execuções; é o dia livre da autora (NAT-66);
  - a coleta começa **quarta, 07/10**;
  - pares por janela: começa com 3, como na T7, e é ajustado pela leitura de janela e semana que a
    autora passar depois do primeiro par.
- **Consumo:** fica estimado pelos 2 primeiros pares, porque o Sonnet não tem piloto. O teto é o
  da T7 (US$ 89, estimativa do cliente, não fatura). Na assinatura, o consumo gasta janela de uso.
- **Disparo:** pelo GitHub (`gh workflow run`), só com o id do slot. Os campos vêm da agenda.

## 11. Comparação com a T7

- **O que se compara:** os números desta campanha **nunca** se somam nem se agregam aos da
  `t7-tela-a-01` (D-64, D-13).
- **Como:** a comparação Opus × Sonnet é **descritiva**. Mostra o D médio com IC de cada campanha
  lado a lado, o recall A-\* e P-\* de cada braço, o custo e o tempo.
- **Sem teste entre campanhas:** nenhum teste estatístico compara as duas, porque esse teste não
  foi planejado antes da T7.
