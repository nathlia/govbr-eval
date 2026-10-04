# Protocolo da campanha `t7-tela-a-01` — CONGELADO

**Estado: CONGELADO em 2026-10-04.** A autora ratificou o rascunho v2 no chat ("ok") depois da
revisão do Codex no NAT-64. O commit do `govbr-eval` que traz este arquivo é a **semente** da ordem
(§5). Este arquivo não muda mais. Qualquer mudança abre uma campanha nova.

Os itens marcados com **[autora]** são decisões suas. Os demais seguem o plano (§T7), a revisão
pré-T7 e as decisões D-80 a D-88.

## 1. Pergunta e hipótese [autora]

Na tela A, com o mesmo modelo e a mesma configuração, ter o oráculo MCP disponível muda quantos
defeitos sorteados da referência o agente confirma?

- **Hipóteses formais**, alinhadas ao teste principal (§4):
  - **H0:** as diferenças pareadas D são simétricas em torno de 0, isto é, os rótulos sem/com são
    trocáveis dentro de cada par.
  - **H1, bicaudal:** a média de D é diferente de 0.
- **Estimativa:** o pacote MCP inteiro (normas, varredura e verificação). O efeito de cada parte
  fica para a T7b (D-86).
- **Leitura:** o empate, a vantagem do sem e o resultado inconclusivo são resultados válidos. A
  ausência de significância **não** estabelece equivalência.

## 2. Desfecho principal e unidade de análise [autora]

- **Unidade de análise:** o par, isto é, uma execução sem e uma com, na mesma tela, com o mesmo
  modelo e a mesma configuração. Defeitos e achados não são repetições.
- **Desfecho principal:** `D = confirmadas_com − confirmadas_sem`, só nas unidades sorteadas
  (A-*, 14 da referência 2.0.0), com a revisão cega fechada.
- **Desfechos secundários**, à parte e nunca somados ao principal:
  - unidades de página (P-*, 2; motivadas pelo piloto, D-83/D-85);
  - precisão das afirmações;
  - afirmações incorretas;
  - defeitos novos corretos;
  - tempo e custo estimado;
  - uso do oráculo;
  - taxa de perda por braço.

## 3. Tamanho [autora: NAT-62]

- **N = 10 pares**, 20 execuções planejadas.
- **Justificativa:** o N cabe na janela de uso da autora e no prazo do TCC 2. O caráter é
  **exploratório**, nesta tela e nesta configuração. **Não há promessa de poder** e nenhum efeito
  mínimo foi declarado. Por isso o resultado é lido como estimativa com IC, não como prova de
  ausência de efeito.
- O N é fixo: não há parada antecipada e não se acrescentam pares.

## 4. Análise estatística (congelada)

D é inteiro, então haverá zeros e empates em |D|. Todo o cálculo é implementado em TypeScript no
`govbr-eval`, num módulo testado contra valores conhecidos. Não depende de SciPy.

- **Teste principal:** teste de **permutação pareado exato por troca de sinais** sobre a **média
  de D**.
  - Enumera as 2^n atribuições de sinal (n ≤ 20).
  - O p bicaudal é a fração de atribuições com |média| ≥ |média observada|.
  - Zeros e empates são tratados naturalmente, e o teste mede a mesma quantidade que o IC.
  - Se todos os D forem 0, então p = 1.
  - α = 0,05.
- **Robustez** (secundário, rotulado):
  - Wilcoxon de postos com sinais, com zeros por Pratt, postos médios para |D| empatados e p por
    enumeração exata;
  - teste do sinal exato, com zeros excluídos e contados.
- **IC de 95% da média de D:** bootstrap **percentil**.
  - 10.000 reamostragens de **pares**.
  - Gerador determinístico nomeado (mulberry32), com semente derivada da semente da campanha.
  - Método, gerador, semente e número de reamostragens ficam registrados na saída.
  - Se n efetivo < 5 ou todos os D forem iguais, o IC fica "indisponível", com o motivo.
- **Também reportados:** os D de cada par, média, mediana, desvio-padrão, n planejado e n efetivo.
- **Leitura:**
  - **vantagem do com:** p < 0,05 e média de D > 0;
  - **vantagem do sem:** o simétrico;
  - **sem diferença detectável:** o resto.
- **Ao lado, sempre:** precisão e incorretas. Não há índice composto.

## 5. Ordem dos braços e semente

- **Semente:** o hash do commit **deste protocolo congelado**. Esse commit vem antes e não contém
  a agenda. A agenda é derivada dele por `campanha:agenda` e gravada num commit **posterior**,
  que registra o hash de origem. A semente não é reescolhida depois de inspecionar o sorteio, e
  nenhum commit é emendado (amend) depois de congelado.
- **Regra:** `chave(par) = sha256(semente + "|ordem|" + par)`; ordenam-se os pares por chave, e os
  5 primeiros começam pelo sem, os outros 5 pelo com.
- **Janelas:** as duas execuções de um par rodam em sequência. Se a janela acabar entre os braços,
  o segundo braço roda no início da janela seguinte. O intervalo entre os dois inícios fica
  registrado e aparece por par.

## 6. Elegibilidade (barreiras do T7.0, D-88)

Uma execução entra na comparação principal só com técnico `passed`, isolamento `passed`,
submissão aceita, identidade igual à da campanha e tentativa dentro da política (§7).

## 7. Falhas, tempo limite e novas tentativas

- **Tempo limite de 30 min por execução** [autora]. O piloto teve no máximo 10,7 min.
- **Timeout** (`interrupted`):
  - entra no total tentado e na taxa de timeout do braço;
  - **não** ganha nova tentativa, porque o resultado é do agente;
  - fica **inelegível** para a comparação principal;
  - não vira "zero achados".
- **Nova tentativa:** só por motivo técnico (429, provedor fora, erro do harness, queda da VM), no
  máximo 1 por slot.
  - **Teto global:** 4 tentativas extras na campanha.
  - **Prioridade:** a ordem da agenda; o primeiro slot que precisar recebe.
  - **Teto esgotado:** o slot fica perdido e o par fica incompleto.
  - A tentativa extra é uma tentativa nova ligada ao slot e nunca substitui a original. Conta a
    primeira tentativa elegível.
- **Par incompleto:**
  - sai da comparação principal e é listado com o motivo;
  - as perdas são relatadas **por braço**;
  - se um braço perder mais que o outro, o relato sinaliza **risco de seleção**, porque excluir
    timeouts pode deixar só as execuções que conseguiram terminar. Isso entra como limitação.
- **Mudança de provedor:** se o modelo efetivo ou a versão do cliente mudar no meio, a coleta para,
  a mudança é investigada e o lote é identificado.

## 8. Revisão

Revisor agente cego (D-80), com contexto novo por par, só pela fila `/revisao` mascarada (D-87).
Cada decisão se apoia numa medição. A revisão começa **depois do último par coletado**, e nenhum
número é olhado antes disso.

## 9. Configuração congelada

- tela `solicitacao` (govbr-telas `46318d4`, site `1a6e8daf3cdb`);
- referência 2.0.0 (`govbr-eval` `def2125`);
- scorer `flow-semantic-1.5.0`;
- `claude-opus-5-5`, esforço `high`, cliente fixado;
- validator `b071308`, protocolo da T2;
- braços `sem` e `com`.

## 10. Agenda e orçamento [autora]

- **Domingo, 04/10:** 2 + 3 janelas, usadas só pela campanha.
  - Com cerca de 5 execuções por janela e o par inteiro na mesma janela, cabem **2 pares por
    janela**.
  - 10 pares pedem **5 janelas**, exatamente as de hoje.
  - **Não sobra reserva** para tentativas extras: elas vão para a janela seguinte (segunda, 05/10),
    na ordem da agenda.
- **Consumo estimado** pelo cliente, que não é fatura:
  - planejado: US$ 46–74 (20 execuções);
  - reserva para até 4 tentativas extras: US$ 9–15.
  - Na assinatura, isso gasta janela de uso.
- **Disparo:** pelo GitHub (`gh workflow run`), só com o id do slot. Os campos vêm da agenda (T7.2).
