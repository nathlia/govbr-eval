# Protocolo da campanha `t7-tela-b-01` — CONGELADO

**Estado: CONGELADO em 2026-10-05.** A autora escolheu o desenho no NAT-66 (opção 2A): o protocolo
da `t7-tela-a-01` (D-89) na tela B (Vistorias), com Opus 5.5 high. A contagem do desfecho principal
foi decidida no NAT-69 (opção A, D-102). O tempo limite e o orçamento saíram da prova
`prova-vistorias-01` (2026-10-05, fora de qualquer análise). O commit do `govbr-eval` que traz este
arquivo é a **semente** da ordem (§5). Este arquivo não muda mais. Qualquer mudança abre uma
campanha nova.

As seções 4, 5, 6 e 8 são **as mesmas** do protocolo congelado
`campanhas/t7-tela-a-01/protocolo.md` e valem aqui como se estivessem transcritas. Este arquivo
escreve por extenso só o que muda (§1, §2, §3, §7, §9, §10) e a regra de comparação (§11).

## 1. Pergunta e hipótese

Na tela B (Vistorias, uma SPA real com web components do DS), com Opus 5.5 high, ter o oráculo MCP
disponível muda quantos defeitos da referência o agente confirma?

- **Por que esta campanha:** a T7 não detectou diferença na tela A (D-97), e uma tela construída
  só para o experimento não basta para a escrita (D-98). A tela B é real, maior e traz componentes
  do DS em shadow DOM.
- **Hipóteses formais**, iguais às da T7:
  - **H0:** as diferenças pareadas D são simétricas em torno de 0.
  - **H1, bicaudal:** a média de D é diferente de 0.
- **Leitura:** o empate, a vantagem do sem e o resultado inconclusivo são resultados válidos. A
  ausência de significância **não** estabelece equivalência.

## 2. Desfecho principal e unidade de análise [autora: NAT-69 → A, D-102]

- **Unidade de análise:** o par, como na T7.
- **Referência:** `ground-truth-vistorias.json` 1.0.0 (D-61), 29 specs e 102 unidades, sem sorteio e
  sem camada de página. Das 102 unidades, 71 vêm de 4 specs `todos` (B-08 40, B-06 11, B-07 10,
  B-12 10).
- **Desfecho principal:** `D = specs_confirmadas_com − specs_confirmadas_sem`, nas 29 specs, com a
  revisão cega fechada. Uma spec conta como confirmada quando **pelo menos 1** das suas unidades
  está confirmada pelo scorer. O agregado por spec é uma conta de leitura sobre as unidades que o
  scorer já grava; o scorer não muda.
- **Por quê:** mede "o agente achou este defeito?", a mesma pergunta da T7, e não deixa a contagem
  de linhas da tabela decidir o resultado (uma alegação sobre a B-08 moveria D em até 40).
- **Desfechos secundários**, nunca somados ao principal:
  - unidades confirmadas (das 102);
  - precisão das afirmações;
  - incorretas;
  - defeitos novos corretos;
  - tempo e custo estimado;
  - uso do oráculo;
  - perdas por braço.

## 3. Tamanho

- **N = 10 pares**, como na T7. A prova mostrou que um par cabe com folga numa janela do Pro (§10).
- **Caráter exploratório:** o N é fixo, sem parada antecipada e sem pares extras. Não há promessa
  de poder.

## 4. Análise estatística

Igual à T7 §4, aplicada ao D por spec. A semente do bootstrap é derivada da semente desta campanha.

## 5. Ordem dos braços e semente

Igual à T7 §5: semente = hash do commit deste protocolo; contrabalançada 5/5 por
`sha256(semente + "|ordem|" + par)`; agenda num commit posterior.

## 6. Elegibilidade

Igual à T7 §6 (barreiras do T7.0, D-88). Inclui a verificação `janela-sem-deriva` (NAT-32), que
fecha a causa do descarte da bateria de 02/10 (D-63).

## 7. Falhas, tempo limite e novas tentativas

Igual à T7 §7, exceto o tempo limite:

- **Tempo limite de 40 min por execução.** A prova (braço com, o mais longo na tela A) durou 717 s
  (12,0 min) com 37 chamadas ao oráculo. A regra fixada no rascunho antes da prova: cerca de 3× a
  duração da prova, arredondada para cima em múltiplos de 5 min, piso de 30 min e teto de 90 min
  → 3 × 12,0 = 35,9 → **40 min (2400 s)**.
- O resto não muda: timeout é inelegível e não ganha nova tentativa; nova tentativa só por motivo
  técnico, no máximo 1 por slot e 4 na campanha; perdas relatadas por braço.

## 8. Revisão

Igual à T7 §8: um revisor agente Opus cego, com contexto novo por par, só pela fila mascarada; a
revisão começa depois do último par coletado. A escolha de cena por cartão fica com o revisor
(D-101).

## 9. Configuração congelada

- tela `vistorias` (govbr-telas `46318d4`, site `govbr-telas-site-1a6e8daf3cdb`; árvore `pnip/`);
- referência `ground-truth-vistorias.json` 1.0.0 (D-61);
- scorer `flow-semantic-1.5.0`;
- linha de base 2.2.0 (D-101);
- `claude-opus-5-5`, esforço `high`, com o mesmo cliente fixado da T7;
- validator `b071308` (oráculo 2.7.0, mesmo `distSha256` e `dataSha256` da T7), protocolo da T2;
- braços `sem` e `com`.

## 10. Agenda e orçamento

- **Dias:** sem execuções às terças (NAT-66). A coleta começa na quarta, 07/10. As janelas são
  divididas com a campanha `t7b-sonnet-tela-a-01`, conforme a leitura de janela e semana da autora.
- **Pares por janela:** começa com **2**. Na tela A, um par Opus (≈ US$ 5) gastou cerca de 24% da
  janela; um par aqui deve ficar em ≈ US$ 7–9, cerca de 35–40%. Ajusta-se pela leitura da autora
  depois do primeiro par.
- **Consumo estimado** pelo cliente, que não é fatura:
  - planejado: US$ 72–90 (20 execuções; com ≈ US$ 4,5 pela prova, sem entre 0,8× e 1× disso);
  - reserva para até 4 tentativas extras: até US$ 18;
  - teto: **US$ 110**. Na assinatura, isso gasta janela e semana de uso.
- **Disparo:** pelo GitHub (`gh workflow run`), só com o id do slot. Os campos vêm da agenda.

## 11. Comparação com a T7 e a T7b

Os números desta campanha nunca se somam nem se agregam aos da tela A (D-13, D-64). A comparação
entre telas é só descritiva, sem teste, porque esse teste não foi planejado antes.
