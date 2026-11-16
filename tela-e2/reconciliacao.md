# Tela E2 — reconciliação sorteio × construção × auditoria cega (2026-11-14)

**Status:** proposta. A referência existe só como rascunho (`referencia-rascunho.json`, `0.9.0-rascunho`); o que
precisa da autora está em `decisoes-da-autora.md`. Dados completos, com o sha256 de cada entrada, em
`reconciliacao.json` (gerado por `node tela-e2/reconciliar.mjs`; os julgamentos estão escritos no próprio script,
com a razão de cada um).

**Entradas.** Sorteio `sorteio.json` (479e730) e `sementes-vigentes.json` (9 vigentes: 6 DS + 3 G); construção
`construcao.md` e `conferencia-construcao.json` (corpus 48d53d7); auditoria cega `auditoria/` (cópia sem edição de
`auditoria-e2/saida/`, commit 05dc2f9: 13 achados, 113 conformes, 19 incertos). Universo, ponte de ids e
elegibilidade do próprio ramo. **Não lidos:** `govbr-ds-validator`, `checker-aliases.json`, `kb-aliases*.json`,
`results/`, `reports/`, ferramentas MCP do validator, axe. Para atribuir a origem de dois incertos foi lido o
`core.min.js` servido (o do pacote 3.7.0), como na A2.

**Categorias (as da A2, `tela-a2/reconciliacao.md`).**

- unidade sorteada: `mesma-clausula` (a frase sorteada está em `clausulas` ou em `tambem` de um achado no mesmo
  hospedeiro, estado e observável; ou o auditor citou uma frase que o passo 2 **selado** julgou
  `duplicada:<sorteada>`), `outra-clausula` (mesmo hospedeiro, estado e observável, outra norma), `nao-achada`;
- achado: `sorteada` (é o que casa a unidade), `coviolacao-declarada` (outra obrigação quebrada pela mesma troca no
  mesmo hospedeiro, listada em `construcao.md` › Acoplamentos), `coviolacao-nao-declarada` (idem, não listada; é
  inerente à variante selada, e corrigi-la desfaria a unidade sorteada), `acidental` (defeito da construção fora da
  variante: corrige-se na página);
- incerto: em que toca (observável sorteado, hospedeiro sorteado com outro observável, ponto conforme da
  construção, andaime, página) e destino (`fundo` = fora da referência, alegação certa vira descoberta; `autora`).

## 1. Unidades sorteadas (9)

| Célula (classe) | Estado | Resultado | Achado | Porquê (resumo; completo no JSON) |
|---|---|---|---|---|
| `btn-limpar::a2-2ac598dc24db` (DS) | S0 (S0–S2) | **mesma cláusula** | EA-01 | frase sorteada como cláusula principal |
| `msg-orientacao::a2-d6b3f0e36943` (DS) | S0 (S0–S2) | **mesma cláusula** (em `tambem`) | EA-10 | principal = co-violação declarada; a frase sorteada vem em `tambem`, literal |
| `btn-ajuda::a2-5b47246a41c1` (DS) | S0 (S0–S2) | **mesma cláusula** | EA-03 | frase sorteada como 1ª cláusula |
| `inp-codigo::a2-a39f3ad397d4` (DS) | S0 (S0–S2) | **mesma cláusula** (duplicata selada) | EA-06 | uma das frases citadas é `duplicada:a2-a39f3ad397d4` no passo 2 selado; a sorteada não é citada literalmente |
| `rad-situacao::a2-f838b54da560` (DS) | S0 | **não achada** ⚠ | — | o auditor deu a frase sorteada como **conforme** (EC-062) medindo a caixa da legend, não o início do texto |
| `msg-erro::a2-ef29db5bb4ac` (DS) | S1 | **outra cláusula** | EA-12 (+ EA-13) | os dois observáveis da variante medidos em S1; citou cores, tabela do Erro e iconografia, não a frase sorteada |
| `sel-continente::a2-7348bce34289` (G) | S2 | **outra cláusula** | EA-08 (+ EA-09) | 2,32:1 nas 6 opções; citou cores.md 4,5:1 e e-MAG 4.1 |
| `inp-nome-pais::a2-328f62cfe4ce` (G) | S0 (S0–S2) | **mesma cláusula** | EA-04 (+ EA-05) | frase sorteada como 2ª cláusula |
| `lst-paises::a2-5432c282d0d7` (G) | S0 a 640×450 | **não achada** ⚠ | — | o auditor deu o e-MAG 4.3 como **conforme** no nível da página (EC-111), sem medir corte dentro dos itens |

**Por classe:** DS — 4 mesma cláusula · 1 outra cláusula · 1 não achada. G — 1 · 1 · 1.
Todas as 9 continuam violadas na conferência de construção (9/9, medida no estado declarado). As duas não achadas
ficam na referência pela E-02 (pré-declarada no método, § 6 "Pegou"); para o portão só contam as confirmadas.

## 2. Achados da auditoria (13)

| Categoria | n | Achados |
|---|---|---|
| sorteada | 7 | EA-01, EA-03, EA-04, EA-06, EA-08, EA-10, EA-12 |
| co-violação declarada em `construcao.md` | 1 | EA-02 |
| co-violação não declarada (inerente à variante selada) | 4 | EA-05, EA-09, EA-11, EA-13 |
| acidental (defeito da construção) | 1 | EA-07 |

- As 4 não declaradas não são corrigíveis sem mudar a unidade sorteada (o texto, a cor ou o ícone da própria
  variante selada): não se corrigem; entram na spec da célula pela regra da § 5 e vão à autora (item da lista).
- EA-07 é defeito da folha da página fora da variante (a tabela de Espaçamentos do Input, aceita no passo 2 para
  `inp-codigo`): corrige-se (§ 4).
- Nenhum achado cai em andaime, em controle conforme ou em instância sem semente.

## 3. Incertos (19)

| Destino | n | Incertos |
|---|---|---|
| fundo (fora da referência) | 14 | EI-01, 05, 06, 07, 09, 10, 11, 12, 13, 15, 16, 17, 18, 19 |
| autora | 5 | EI-02, EI-03, EI-04 (um item só), EI-08, EI-14 |

- **Tocam o observável de uma unidade sorteada:** 1 (EI-14, na mensagem de orientação).
- **Tocam um ponto conforme da conferência de construção:** 7 (EI-02, 03, 04, 08, 12, 13, 19).
- **Tocam um controle conforme da referência:** 0 (pela regra dos controles, § 8: instância com incerto não é controle).
- Origem no core 3.7.0 (CSS ou JS do pacote, sem escrita da página; precedente A2 E-08): EI-07, EI-11, EI-15,
  EI-17; EI-08 é marcação da página, mas o JS do core troca o ícone por nome de classe.

## 4. Correções da construção (acidentais)

Regra (a da A2): a página tem de ser conforme em tudo, menos nas unidades sorteadas; defeito acidental corrige-se
sem tocar unidade sorteada; correção discutível (cláusula contestável, ou que mudaria uma unidade sorteada ou o
inventário) não se faz: vai à autora.

| # | Achado | O que mudou | Não tocou |
|---|---|---|---|
| F-01 | EA-07 | `.apoio-campo`: `margin-top` de `--spacing-scale-half` para `--spacing-scale-base` (govbr-corpus `386a8d8`, folha da página) | fonte do campo (unidade sorteada de `inp-codigo`), DOM, inventário |

**Corrigidos: 1. Escalados em vez de corrigidos: 4** (as co-violações não declaradas EA-05, EA-09, EA-11, EA-13 — corrigir
desfaria a variante selada) e 2 incertos discutíveis (EI-02/03/04 como um, EI-08).

**Depois da correção:**

- `npm run build` no corpus; `CORPUS_DIR=<corpus-e> node tela-e2/conferir-construcao.mjs` → **9/9 violadas, 9/9
  conformes sem semente, 9/9 isoladas, 0 interferências, estados 33/33, pontos conformes 134/134** (100 %;
  `conferencia-construcao.{txt,json}` regravados, sha256 da folha nova).
- Re-medida com os scripts do próprio auditor, sem edição (`node tela-e2/auditoria/rodar.mjs --saida
  tela-e2/remedida-2026-11-14`, página corrigida servida em 3219): **13 → 12 achados; o de `inp-codigo ·
  texto-auxiliar-espec` sumiu e passou a conforme (margin-top medido 8 px); 0 achados novos; conformes 113 → 114;
  incertos 19 → 19, os mesmos**; 28/28 pares achado × estado reproduzidos, 199/199 citações. Correspondência em
  `remedida-2026-11-14/corrigidos.json` (os ids EA-* da re-medida são renumerados; casa-se por instância|chave).

## 5. Co-violações (regra R-CV)

**Regra, escrita antes da conta e aplicada a todas as células** (texto completo no cabeçalho de `coviolacoes.mjs`;
nenhuma escolha dela muda o número de specs, porque co-violação nunca vira spec):

> Co-violação de uma célula sorteada é uma unidade do universo, diferente da sorteada, que a **mesma troca** (a
> variante selada, ao pé da letra) quebra **no mesmo hospedeiro**: declarada em `construcao.md` › Acoplamentos, ou
> citada pelo auditor cego em `clausulas` (não em `tambem`) de um achado reconciliado à célula. É o mesmo defeito
> no mesmo hospedeiro: entra como **regra adicional da mesma spec** (uma spec por hospedeiro × defeito), pelo id da
> base literal ou `emag:X.Y`. Fica fora de `rules`, registrada, a unidade sem id na base literal e a que não é
> obrigação (força `recomendacao` no passo 1; `forca` ou `nao-normativa` no passo 2). As exclusões do sorteio
> (exposta, classe-em-desacordo, tentativa-e, hospedeiro) são filtros do sorteio, não da referência. Id exposto
> entra marcado (detecção fundamentada com e sem ele). A classe da spec é a selada; co-violação não conta para o
> portão.

**Resultado** (`coviolacoes.json`): 27 co-violações nas 9 células (11 declaradas em `construcao.md`, 16 só da
auditoria); **17 entram em `rules`**, 7 ficam fora por não terem cláusula na base, 3 por não serem obrigação.
**Specs novas: 0.** Specs com id exposto em `rules`: 3 (uma DS e duas G; ids marcados em
`_meta.coviolacoes.expostos` do rascunho). Uma célula (`rad-situacao`) não tem co-violação; uma (`inp-codigo`) só
tem co-violações fora de `rules`.

## 6. Âncoras neutras

`ancoras-referencia.json`, conferido por `node tela-e2/conferir-ancoras.mjs` na página corrigida (corpus `386a8d8`,
1280×900, sem oráculo, sem axe). Regra: seletor = id de instância do inventário (nome de lugar, D-24) ou descendente
estrutural dele; texto = papel + rótulo visível; nenhuma âncora nomeia o defeito.

- Sequência **aditiva** da referência: S0 (carga) → S1 (clicar `#btn-salvar`, esperar a mensagem de retorno) → S2
  (clicar o gatilho do select, esperar a lista aberta). Na construção e na auditoria S2 partia da carga; aqui parte
  de S1, como a A2 exige para a sequência do `setup`. Conferido: tudo o que se ancora em S0 e S1 continua visível em
  S2, sem recarga e sem erro de página.
- **9 specs + 5 controles resolvem com a contagem declarada em cada parada** (0 problemas). As duas specs de várias
  partes são `composicao` (uma unidade, 6 e 4 participantes), como a U-01 da A2.

## 7. Portão de adequação (protocolo § 3.7), com a re-medida cega

Regra: ≥ 5 specs do DS semeadas que pegaram, cada uma (1) confirmada por medição por auditor cego, (2) num estado
alcançável pelas paradas declaradas, (3) violando cláusula que existe na base literal. Pela E-02 do método, a
sorteada não confirmada fica na referência mas **não conta** para o portão.

**Regra da confirmação (fixada pelo coordenador antes da re-medida, precedente da re-medida da A2):** conta como
confirmada às cegas a sorteada que (a) a 1ª auditoria achou com a cláusula sorteada (`mesma-clausula`: principal,
`tambem` ou duplicata selada) **ou** (b) um 2º auditor cego, perguntado de forma neutra entre iscas, mediu como
violada no observável sorteado. "Achada com outra cláusula" sozinha não conta.

**Re-medida** (`remedida/`, cópia sem edição; pedido neutro de 14 itens embaralhados por semente, `remedida-mapa.json`;
junção em `remedida-juncao.json`): o 2º auditor viu só a página corrigida (corpus `386a8d8`), o inventário, o corpus
e o pedido. **Iscas: 10/10 `satisfaz`** (nenhum defeito acidental novo, nenhuma cláusula disputada). Sorteadas no
pedido: 3 de 4 `viola`.

| Célula DS em vigor | Pegou | 1ª auditoria | 2º auditor | Confirmada às cegas | (2) estado | (3) base | Conta |
|---|---|---|---|---|---|---|---|
| `btn-limpar::a2-2ac598dc24db` | sim | mesma cláusula (EA-01) | — | sim | S0 | sim | **sim** |
| `msg-orientacao::a2-d6b3f0e36943` | sim | mesma cláusula em `tambem` (EA-10) | — | sim (item 3) | S0 | sim | **sim** |
| `btn-ajuda::a2-5b47246a41c1` | sim | mesma cláusula (EA-03) | — | sim | S0 | sim | **sim** |
| `inp-codigo::a2-a39f3ad397d4` | sim | duplicata selada (EA-06) | — | sim (item 2) | S0 | sim | **sim** |
| `rad-situacao::a2-f838b54da560` | sim | não achada (EC-062 conforme) | **viola** | sim | S0 | sim | **sim** |
| `msg-erro::a2-ef29db5bb4ac` | sim | outra cláusula (EA-12, EA-13) | **viola** | sim | S1 | sim | **sim** |

**Resultado (estrito): PASSA, n = 6 de 6 (limiar 5, folga 1).** Só com a 1ª auditoria: n = 4, não passaria. O
portão não depende mais de contar "achada com outra cláusula" (o item 1 da autora vira só registro). Ainda dependem
de leitura as duas confirmações pela 1ª auditoria em `tambem` e por duplicata selada (itens 3 e 2): se uma delas
for respondida **b**, n = 5 (passa sem folga); se as duas, n = 4 (não passa).

**Classe G** (não conta para o portão): `sel-continente` confirmada pelo 2º auditor; `inp-nome-pais` pela 1ª;
**`lst-paises` julgada conforme pelos dois auditores cegos** — o 2º mediu a tinta do texto inteira a 640×450 (0 px
de glifo cortado; só a caixa de linha passa ~1,6 px da altura fixa), enquanto a conferência de construção contou
19 px por item comparando `scrollHeight` (que inclui o `padding-bottom` de 16 px) com a altura visível. Fica na
referência pela E-02, marcada `confirmacaoCega: false`, e vai à autora (item 5).

## 8. Rascunho da referência e controles conformes

`referencia-rascunho.json` (`0.9.0-rascunho`, **não congelado**; gerado por `node tela-e2/montar-referencia-rascunho.mjs`),
na estrutura da referência da A2 (`_meta` + `violations`; estados, conformes, fundo, exposto, `porSpec`):

- **9 specs, 9 unidades** (U-01…U-06 DS, U-07…U-09 G; estrato `semeada`, classe e `categories` seladas da célula),
  `rules` = id da sorteada + co-violações pela R-CV; descrições, âncoras e estados de `ancoras-referencia.json`;
  sem predicado de aceitação (a decidir antes de congelar). As duas não achadas pela 1ª auditoria (U-05, U-09) estão em
  `violations` pela E-02; a U-05 foi confirmada pelo 2º auditor cego, a U-09 não (`confirmacaoCega: false` em `porSpec`,
  lista em `_meta.semConfirmacaoCega`).
- **3 estados** (S0 → S1 → S2, aditivos). **5 controles conformes** (K-01…K-05). Estratos `naturais` e `exposto` vazios.
- `fundo`: os 14 incertos de destino `fundo`. `portao`: o resultado da § 7 (com a re-medida).

**Regra dos controles** (a E2 não sorteou chamarizes nem alternativas; regra escrita para esta tela e levada à
autora, item da lista): controle = instância do inventário (sorteável sem semente ou andaime) que (i) não hospeda
unidade sorteada nem participa do observável de uma, (ii) tem 0 achados e 0 incertos na auditoria cega, e (iii) foi
medida conforme na conferência de construção. Entram 5. Ficam fora: o Salvar (participa da posição medida na U-01),
o avatar (não medido pela construção), o atalho, a trilha e a conta (incertos de core ou de decisão de construção) e
a página (um incerto).
