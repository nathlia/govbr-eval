# Tela E2 (Cadastrar país importador): o que a autora decide — 12 itens (8 pedem escolha; 1, 4, 5 e 12 só registro)

Nada destes itens foi aplicado. A referência está como rascunho (`referencia-rascunho.json`, `0.9.0-rascunho`).
Responda **"padrão"** para aceitar todas as opções **a** (a recomendação do método), ou cite as exceções, por
exemplo **"2b 7b"**. Os itens 1, 4, 5 e 12 são **só registro** (a regra já decide; não pedem escolha). A numeração não muda. ⚠ marca onde a
recomendação não é óbvia. Detalhes em `reconciliacao.md` (seções citadas) e nos JSON ao lado. Tempo estimado:
~15 min. **Corte:** referência congelada até ter 17/11 23:59, senão a E sai e a D roda sozinha (método § 1).

## Antes de tudo: o portão

Portão (protocolo § 3.7): ≥ 5 specs do DS semeadas que pegaram, cada uma confirmada por medição por auditor cego,
num estado declarado, violando cláusula da base literal. Regra da confirmação, fixada antes da re-medida: conta a
sorteada que a 1ª auditoria achou com a cláusula sorteada **ou** que um 2º auditor cego, perguntado de forma neutra
entre 10 iscas, mediu como violada ("achada com outra cláusula" sozinha não conta).

- Re-medida cega (`remedida/`): **10 de 10 iscas conformes**; das 4 sorteadas perguntadas, 3 violadas.
- Specs DS em vigor: 6. Confirmadas às cegas: **6**. **O portão passa no critério estrito, n = 6 (folga 1).** Só
  com a 1ª auditoria seriam 4.
- Ainda dependem da sua leitura as duas confirmações dos itens 2 e 3: uma resposta **b** deixa n = 5 (passa sem
  folga); as duas **b**, n = 4 (não passa).

## Itens

| # | O que foi observado | Opções | Recomendação |
|---|---|---|---|
| 1 | **U-06 (mensagem de erro com o visual do estado Selecionado, DS).** **Só registro.** A 1ª auditoria mediu os dois observáveis da variante em S1, mas citou outras frases, não a sorteada (§ 1). O 2º auditor cego, no pedido neutro, decidiu **viola** com a frase sorteada (R-11). A U-06 conta para o portão pela regra da re-medida, sem depender de contar "outra cláusula". | Sem opção. | — |
| 2 ⚠ | **U-04 (campo do código em Arial, DS).** O auditor mediu Arial no rótulo, no campo e no apoio e citou duas frases da tipografia: uma que o passo 2 **selado** julgou `duplicada` da frase sorteada (padrão mínimo: "Utilize a família tipográfica Rawline") e outra não normativa ("sempre que possível"). A frase sorteada não aparece literal. § 1. | **a)** mesma cláusula: a duplicata foi julgada antes do sorteio, no passo 2 selado. **b)** outra cláusula: deixa de contar para o portão (n cai 1). | **a.** O julgamento de duplicata é anterior ao sorteio e não depende do auditor. |
| 3 | **U-02 (jargão na mensagem de orientação, DS).** A frase sorteada (microcopy: linguagem simples para não técnicos) está em `tambem` do achado, literal; a cláusula principal é a co-violação declarada (Message: texto curto, claro e objetivo). § 1. | **a)** mesma cláusula (a A2 contou `principal ou em tambem`). **b)** outra cláusula: deixa de contar para o portão (n cai 1). | **a**, pelo precedente da A2. |
| 4 | **U-05 (legenda do radio centralizada, DS).** **Só registro.** A 1ª auditoria deu a frase sorteada como conforme (EC-062), medindo a caixa da legend; o 2º auditor cego mediu o texto em 296,09 px contra 62 px das opções e decidiu **viola** (R-05). Fica na referência e **conta para o portão** pela regra da re-medida. | Sem opção. | — |
| 5 | **U-09 (itens da lista com altura fixa a 200 %, G).** **Só registro — atenção.** **Os dois auditores cegos julgaram conforme:** a 1ª mediu só a rolagem horizontal da página (EC-111); o 2º mediu a tinta do texto inteira a 640×450 (0 px de glifo cortado; só a caixa de linha passa ~1,6 px da altura fixa) (R-14). A conferência de construção contou 19 px por item comparando `scrollHeight` (93 px, que inclui o `padding-bottom` de 16 px) com a altura visível (74 px): o corte real do texto é pequeno ou nulo. | Sem opção: **fica pela E-02**, marcada `confirmacaoCega: false` (`_meta.semConfirmacaoCega`); recall relatado com e sem ela. É G: não mexe no portão. | — |
| 6 | **Co-violações não declaradas em `construcao.md`** (EA-05, EA-09, EA-11, EA-13): o auditor achou, no mesmo hospedeiro e com a mesma troca, outras normas quebradas pela variante selada ao pé da letra (a cor #AAAAAA está escrita na própria variante; o jargão, o readonly e o fa-check também). Corrigir qualquer uma desfaria a unidade sorteada. § 2 e § 5. | **a)** entram como regras adicionais da mesma spec pela R-CV (as que têm id na base e são obrigação; a da iconografia de EA-13 é recomendação e fica fora). Nenhuma spec nova. **b)** ficam fora de `rules` (só sorteada + declaradas). | **a.** É a regra única aplicada a todas; o número de specs não muda em nenhuma das duas. |
| 7 ⚠ | **Ids expostos entre as co-violações**: 3 specs têm em `rules` um id que é spec nas referências de A, A2, B ou D (U-01 DS: e-MAG 1.4 e 6.3, ordem de Tab; U-07 G: e-MAG 4.1 e a regra da paleta; U-08 G: e-MAG 2.1). A exposição foi filtro do sorteio, não da referência. | **a)** ficam em `rules`, marcados em `_meta.coviolacoes.idsExpostos`; a detecção fundamentada é dada com e sem eles. **b)** saem de `rules` (ficam só no `_meta`). | **a** ⚠: a contagem principal (detecção) não muda; só a coluna fundamentada da U-01 pode ganhar crédito por uma norma geral que o oráculo já viu — por isso a sensibilidade sem eles. |
| 8 | **Controles conformes.** A E2 não sorteou chamarizes nem alternativas. Regra escrita para esta tela (§ 8): instância sem unidade sorteada e fora do observável de uma, 0 achados e 0 incertos na auditoria, medida conforme na construção. Entram 5 (cabeçalho, rodapé, divisor, switch, Cancelar). | **a)** aceita a regra e os 5. **b)** a E2 fica sem controles (falso alarme só na D). | **a.** |
| 9 | **Obrigatoriedade dos campos** (EI-02, EI-03, EI-04): os obrigatórios não têm marca e não há instrução geral; só o opcional diz "(opcional)". O e-MAG 6.5 é elegível; a construção seguiu o padrão de Formulário do DS (marcar só os opcionais) e mediu isso como conforme. O auditor ficou incerto. | **a)** corrigir na página: uma frase curta de instrução no formulário (os campos são obrigatórios, salvo os marcados como opcionais), sem tocar unidade sorteada; depois build, conferência de construção e re-medida. **b)** deixar como está (fundo). | **a.** A A2 tinha a instrução geral e o auditor de lá deu o e-MAG 6.5 como conforme por ela; corrigir não custa nada e tira uma alegação que só viraria descoberta (precedente E-09 da A2). |
| 10 | **Ícone do gatilho do select** (EI-08): a página usa angle (marcação do exemplo do core); a tabela de Iconografia do Select pede caret. O JS do core 3.7.0 troca o ícone pelos nomes das classes angle ao abrir e fechar. | **a)** fundo (comportamento do core; precedente E-08 da A2). **b)** a página passa a usar caret com troca própria. | **a.** |
| 11 | **Estrangeirismos sem `lang`** (EI-14) no jargão da U-02. O e-MAG 3.2 é `nao-se-aplica` no passo 2 selado. | **a)** fica fora (fundo; não entra em `rules`). **b)** entra como co-violação da U-02. | **a.** |
| 12 | **Desvio registrado: S2 depois de S1.** Na construção e na auditoria, S2 partia da carga; na referência a sequência é aditiva (S0 → S1 → S2), como o `setup` exige. Conferido: as 9 âncoras e os 5 controles resolvem em cada parada, sem recarga (§ 6). | Sem opção (estrutura da referência). | — |

## Corrigido sem precisar de decisão

- **F-01** (EA-07): espaçamento do texto de apoio do código (`--spacing-scale-half` → `--spacing-scale-base`),
  corpus `386a8d8`. Conferência de construção 100 %; re-medida pelos scripts do auditor: o achado virou conforme,
  0 achados novos.

## Se tudo for "padrão"

9 specs / 9 unidades (6 DS + 3 G; a U-09 sem confirmação cega), portão **passa no critério estrito com n = 6** (folga 1), 5 controles. Ordem: correção do item 9 → build →
`conferir-construcao` → re-medida pelo `rodar.mjs` do auditor → referência 1.0.0 → entrada em `telas.json` e
`conferir:referencia` → conferir os ids de `rules` contra a base que o oráculo congelado serve (fora das entradas
desta reconciliação).
