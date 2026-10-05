# Pontuação semântica e revisão finita — flow-semantic-1.5.0

## As três filas, e qual delas fecha a bateria (fatia 5)

| Fila | O que é | O que ela cobra |
|---|---|---|
| **Ativa** | cartões desta bateria sem decisão | **Só ela fecha a bateria.** Enquanto houver um, as métricas são provisórias |
| Histórica | pendências que vieram no `--reuse` e não são cartão desta bateria | Nada desta bateria. Fica contada para não sumir em silêncio |
| Próxima referência | afirmações `defeito-novo-correto` | Entram na PRÓXIMA versão do gabarito; não mexem no denominador desta |

A fila global não ressuscita: `scopeReviews` devolve exatamente os cartões do pacote preparado. O
que mudou é que descartar deixou de ser silencioso — `historicalPending` conta o que ficou de fora,
e `review.md` mostra as três lado a lado. É a diferença entre uma fila pequena e uma fila que parece
pequena.

## O que a autora escreve

Ela escreve `decisao`, não a categoria contábil:

| `decisao` | Quer dizer | Vira |
|---|---|---|
| `defeito-do-gabarito` | acertou um defeito catalogado (nomeie `unitIds`) | `reference` |
| `defeito-novo-correto` | está certa, mas fora do gabarito | `novel` |
| `incorreta` | a alegação está errada | `false` |
| `duplicada` | mesma afirmação de outro átomo (aponte `duplicateOf`) | o veredito do átomo apontado, copiado |
| `evidencia-insuficiente` | não dá para decidir com o que está aqui | `unresolved` |

`reference`/`novel`/`false`/`unresolved` são o nome do EFEITO no denominador, não o nome do que ela
viu; exigir que ela os digitasse era pedir que memorizasse contabilidade para revisar. O mapeamento
é mecânico e falha fechado: palavra desconhecida, ausência de decisão, desacordo entre `decisao` e
`verdict`, ciclo de duplicata ou `duplicada` sem alvo param a pontuação. O `verdict` interno
continua aceito — o vocabulário simples é uma via, não um muro.

## Cegueira: o que dá para esconder, e o que não dá

O agente narra as próprias ferramentas. Nos artefatos já arquivados há `"Sem oráculo nem scan_page;
ids WCAG atribuídos manualmente"` de um lado e `"o oráculo indica como mais próximo --gray-cool-10"`
do outro — texto DELE, que a revisão precisa poder ler, e que entrega o braço.

`npm run flow:review -- prepare ... --cego` (ou `render --cego`) retém esse texto: `reportedEvidence`
inteiro e, nos cartões legados, a `description` bruta. Continua à vista tudo que sustenta a decisão —
observado, esperado, estado, sujeitos, unidades candidatas, predicado medido, evidência preservada
com sha256. **A retenção é declarada em cada cartão**, porque esconder sem dizer que esconde é pior:
a revisora precisa saber que existe texto que não está vendo e poder pedi-lo depois de decidir.

`armLeaks` publica quantos cartões contêm termos que nomeiam o braço — o grau de cegueira vira
número, não promessa. Duas coisas a cegueira **não** alcança, e ficam ditas: `package.json` guarda
`runs[].config.arm` e o caminho do arquivo da execução (`results/runs-fluxo` vs
`runs-fluxo-ablacao`). Não abra esse arquivo enquanto decide.

## Esforço e orçamento

`esforco-revisao.json` traz o que dá para contar — cartões, sujeitos, cartões sem evidência
verificada (custam mais: obrigam a voltar à transcrição) e cartões com unidade candidata — e uma
estimativa em minutos. **A taxa que produz a estimativa é declarada, não medida:** nenhuma sessão de
revisão foi cronometrada até aqui, e o objeto diz isso de si mesmo. Quando houver uma sessão
cronometrada, a taxa é substituída e o número vira medida (D-06).

`--orcamento-revisao "2 sessões de 45 min"` grava o orçamento no pacote ANTES da revisão. Esgotá-lo
não é permissão para derrubar alegação difícil ou demorada: o não resolvido continua visível e as
métricas, provisórias.

## A bateria entregue é a planejada

A fatia 6 já conferia a contagem de slots. Contagem não distingue "as duas execuções planejadas" de
"o slot 1 rodado duas vezes, ficando com a melhor". A preparação agora confere slot a slot contra o
plano congelado do manifesto de coleta: mesmo slot duas vezes, slot fora do plano, execução sem slot
ou braço diferente do planejado param a preparação. É a regra "não se roda o agente de novo para
trocar uma saída difícil, falha ou de pontuação baixa" deixando de ser norma escrita.


## O que mudou

`score:fluxo` agora pontua um **pacote de revisão fechado**, sem navegador. O casamento antigo por
seletor/regra continua em `score:fluxo:legacy` para reprodução histórica, com aviso explícito.
Não alteramos execuções arquivadas, gabaritos, protocolos de coleta ou `adjudications.json`.

O contrato de coleta é `fluxo-1.3.0`; a versão de pontuação mora em `instrument.json.scoring.fluxo`.
Essa separação é intencional: reaplicar um scorer não significa que uma execução antiga foi coletada
sob permissões, evidências ou estados novos. Execuções de `fluxo-1.2.0` continuam empacotáveis,
rotuladas como legado (ver abaixo), e o `score:fluxo:legacy` segue preso a `scoring.legacyCollection`.

**1.1.0 (correções R2/R3/R5 de 15/09):** restringe reuso sem evidência verificável, confere a
integridade dos arquivos na preparação e na pontuação, e adiciona duplicatas declaradas pela
adjudicadora. A política é `aceitacao-semantica-1.1.0`. Pacotes/decisões 1.0.0 não são migrados nem
reescritos: para reproduzi-los, use o código original; uma análise corrigida exige um pacote novo.

**1.2.0 (fatia 6, 16/09):** o pacote passa a ter **cenas** — uma por janela do plano de estados do
gabarito, todas depois do mesmo `setup` — e unidades e cartões são resolvidos na sua cena. Crédito
nunca atravessa cena, mesmo quando a chave do elemento é a mesma. As **linhas de base da bateria**
entram como execuções revisadas com a mesma contabilidade (contrato `deterministico`), e a
pontuação publica a comparação agente × linha de base por unidade. A preparação só aceita o
manifesto de coleta, a linha de base e o site congelado exatos da bateria. Política
`aceitacao-semantica-1.2.0`. Nenhum pacote 1.1.0 tinha decisão registrada.

**1.5.0 (piloto-01, 03/10): o sujeito dentro de um participante toca a unidade.** Até 1.4.0 uma
unidade só era candidata (e só ancorava a decisão) quando a chave de um sujeito ou relacionado era
EXATAMENTE a de um participante. No par-02 do piloto-01, a alegação "ao fechar o diálogo o foco vai
para o `<body>` em vez de voltar ao Cancelar" — exatamente a A-01 — citava como relacionado um botão
DENTRO do diálogo, e o participante da A-01 é o próprio diálogo: nenhuma candidata, e a revisora não
podia nomear a A-01. No par-01 a mesma alegação apontava o diálogo e era creditável. O crédito
dependia de como o agente redigiu a evidência.

Agora a chave toca o participante quando é ele ou um **descendente** dele (`tocaParticipante` em
`semantic-flow.ts`). As chaves são as canônicas de `anchors.ts` (`tag[:nth-of-type(n)]` desde
`body`, `>` entre pai e filho, ` >>> ` ao entrar no shadow root aberto de um host), então
descendência é prefixo seguido de separador: `P>…` ou `P >>> …`. O separador explícito impede a
colisão de prefixo (`div:nth-of-type(1)` não toca `div:nth-of-type(10)`). O conteúdo do shadow root
de um host conta como dentro dele. O inverso **não** toca: uma chave ancestral do participante (um
`body`, um `main`) ofereceria a página inteira. A mesma regra vale para a oferta de candidatas
(inclusive por segmento, nos cartões `a-decidir`) e para a ancoragem que valida a decisão e monta o
emparelhamento — oferecer o que não se pode nomear, ou aceitar nomear o que não foi oferecido, seria
incoerente. Continua sendo só oferta: nada é creditado sem a decisão da autora. Política
`aceitacao-semantica-1.5.0`. Como todo scorer novo, muda `SCORER_FILES`: pacotes e decisões 1.4.0 não
são transpostos (`identidade-cartoes.ts` recusa scorer diferente) — a análise é refeita.

Dois limites ficam ditos. (1) O `scoreFlow` legado (`units-flow.ts`, `score:fluxo:legacy`) continua
casando por igualdade EXATA, de propósito: ele credita automaticamente, sem revisora, e alargar o
casamento ali seria crédito sem decisão — além de mudar os números v01 que ele existe para reproduzir.
(2) Uma unidade cujo participante é um HOST (o `br-header` da `privacidade`, por exemplo) passa a ser
oferecida para toda alegação sobre qualquer elemento dentro dele, inclusive no shadow root. A oferta
fica mais larga; a decisão não: a revisora ainda confere que a alegação é o defeito DAQUELA unidade,
e não outro defeito que só mora no mesmo componente.

**A campanha congela o scorer.** `fixed.scorerVersion` da campanha é conferido na análise
(`analisar-execucao.ts`, que o Recalcular/Preparar do painel chamam): versão diferente da atual é
recusada em uma frase ("a campanha piloto-01 foi congelada com flow-semantic-1.4.0; o scorer atual é
flow-semantic-1.5.0 — análise recusada para não misturar versões"), registrada em
`revisoes/falhas/` como as outras recusas, sem revisão nova; a revisão atual continua valendo. Uma
campanha sem a versão segue com aviso (o contrato `campaign.v1` a exige, então isso só cobre documento
fora do contrato). Analisar o piloto-01 sob 1.5.0 exige, portanto, decisão registrada sobre a campanha.

## Contrato do achado e evidência da execução (fluxo-1.3.0)

Cada achado separa o que foi constatado do que deveria valer e diz em que estado e com que evidência:

```json
{"selector":"#alvo","relatedSelectors":["#participante"],"rule":null,"observed":"…","expected":"…","state":{"viewport":{"width":1280,"height":900},"steps":["…"]},"evidence":[".playwright-mcp/page-….yml"]}
```

- `rule` é `null` quando o agente declara a atribuição incerta; `description` deixa de ser obrigatório.
- `state` são a janela e as interações desde o carregamento, nas palavras do agente — nunca um id de
  estado do gabarito.
- `evidence` são caminhos ou identificadores devolvidos pelas ferramentas. O coletor recusa relatório
  fora do contrato (400, com a lista de erros) e arquiva o corpo recusado como veio; o agente pode
  corrigir e reenviar. Se a execução termina sem nenhum relatório aceito, o desarme arquiva a
  **última** recusa como relatório dela (`recusa-arquivada`, surface-1.2.0): o corpo segue byte a byte
  em `collector.rawBody`, o runner avisa e grava `submission.status`/`promotedFrom` no manifesto e
  `submissionStatus`/`refusedSubmission` em `config`, e os achados entram no pacote como `recusado`,
  nunca como `achado-2`. Corpo que não é JSON, sem lista `findings` ou com a lista vazia vira um único
  cartão `malformado` com o texto recusado. Recusa anterior a um relatório aceito fica só em `rejected/`.
- O runner copia a raiz temporária da execução para `pipeline/logs/<runId>-evidencia/`, com
  `evidence-index.json` (caminho, bytes, sha256), e grava `evidence` no manifesto e `evidenceDir` /
  `evidenceIndexSha256` em `config`.
- A cópia confere os bytes de origem/destino. Se falhar, mantém a origem temporária para recuperação,
  grava `evidence.status: "failed"` e `collectionStatus: "evidence-failed"` no manifesto e interrompe
  a bateria antes de baselines/pontuação, mesmo com o cliente encerrando com código zero.
- Na preparação, cada referência é resolvida contra essa cópia: `encontrado` (exatamente um arquivo,
  com caminho e sha256), `ausente`, `ambiguo`, `identificador` (sem arquivo) ou `sem-arquivo` (a
  execução não preservou evidência). A preparação confere o SHA-256 do índice contra o manifesto e
  a configuração arquivada, quando presente, e confere tamanho/hash de cada arquivo. `score` e
  `render` repetem a verificação antes de produzir uma saída. Arquivo ausente/alterado, índice
  alterado e caminho fora da pasta de evidências abortam a operação. Guarde a pasta de evidência
  junto dos artefatos: a pontuação é offline, mas não dispensa esses arquivos.
- Identificadores opacos (`S-001`), referência vazia/ausente/ambígua, ausência de estado ou de build
  original verificável restringem o cartão à execução de origem. Mesmo texto e mesmo nome de scan
  em outra execução não provam equivalência. O cartão mostra essa restrição; a revisão humana da
  instância continua possível, mas a aprovação não é transferida automaticamente a outra execução.

Cada cartão carrega o rótulo de contrato do achado, e nenhum é promovido a outro:

| `contract` | Origem | No cartão |
|---|---|---|
| `achado-2` | `fluxo-1.3.0` | observado, esperado, janela e interações, evidência resolvida |
| `achado-1-legado` | até `fluxo-1.2.0` | texto único, sem estado nem evidência da execução; nunca conta como `achado-2` |
| `recusado` | relatório recusado pelo coletor e arquivado na última tentativa (`recusa-arquivada`) | motivo da recusa em `contrato-incompleto: …`; nunca conta como `achado-2`, mesmo que o achado sozinho esteja completo |
| `malformado` | qualquer | preservado como veio, com o JSON bruto; a revisão decide pelo texto |
| `deterministico` | linha de base da bateria (fatia 6) | texto da ferramenta, regra e cena da passada; revisado como qualquer cartão |

`flags` não mudam a pontuação; orientam a leitura: `regra-incerta`, `varias-regras` (indício de
alegação composta — decomponha em átomos; o software não divide), `sem-evidencia`,
`contrato-incompleto: …`, `legado-sem-estado-nem-evidencia` e `malformado`. Um pacote não mistura
contratos de coleta.

## Garantias e limites

- Seletor e norma apenas sugerem candidatos (sujeito igual ao participante da unidade, ou dentro dele
  — desde 1.5.0). **Nenhum texto recebe TP automaticamente.**
- A autora decide a correspondência semântica e a evidência, como já faz. Não há exigência de outra revisora.
- Todas as alegações da bateria entram no pacote, inclusive as que o scorer antigo considerava TP.
- A revisão decompõe alegações compostas em átomos; cláusulas falsas continuam cobradas.
- Atribuição de norma é avaliada separadamente da detecção do defeito.
- Um emparelhamento bipartido máximo atribui cada instância a no máximo uma unidade e cada unidade
  a no máximo uma instância. A ordem de achados, unidades ou decisões não muda a pontuação.
- Uma decisão agrupa os elementos da mesma alegação, mas deve contabilizar cada sujeito. Um membro
  conforme precisa de átomo próprio com veredito falso; não herda o acerto dos irmãos.
- Alegações sem decisão/evidência suficiente permanecem pendentes. Não são TP nem FP conhecidos.
- A fila é da bateria escolhida. Execuções antigas não reaparecem só porque existem no repositório.

**Isto não é um classificador geral de linguagem natural.** A correção semântica continua dependendo
da decisão da autora; o engine impede que um overlap de regra substitua essa decisão. Não certifica
automaticamente a verdade de um veredito humano, nem que uma referência textual de evidência existe.

## Uso

Execute em `govbr-eval`, com Node compatível com o projeto. O runner já prepara o pacote ao fim da
bateria; à mão, para uma bateria com manifesto de coleta (fatia 6):

```powershell
npm run flow:review -- prepare --battery pipeline/logs/STAMP-bateria.json --out results/semantic-review/minha-bateria `
  --collection-manifest pipeline/logs/STAMP-coleta/manifesto.json --site-dir pipeline/logs/STAMP-superficie `
  --baseline pipeline/logs/STAMP-linha-de-base.json
```

- A preparação **serve ela mesma** o site congelado de `--site-dir` (bytes conferidos contra o
  manifesto do site, que precisa ser o da coleta) e usa o **gabarito arquivado** pela coleta. Nenhum
  servidor precisa estar de pé; `--app-url` não existe nesse modo.
- A bateria precisa citar o manifesto pelo hash, cada execução também (`collectionManifestSha256`
  no manifesto da bateria e em `config`), e o manifesto da bateria precisa contabilizar todos os
  slots do plano. Slot `nao-tentada`, falho ou sem relatório impede a preparação.
- A linha de base precisa ser `linha-de-base-fluxo-2.2.0` (checks `tokens+structure+page`, D-54; alvo do
  axe dentro de shadow root como `host >>> interno`, NAT-34), ou a `2.1.0`/`2.0.0` de uma bateria já
  fechada (a 2.1.0 grava esse alvo achatado com espaço, que não resolve; a 2.0.0 pede só
  `tokens+structure`). As antigas são relidas como foram gravadas, nunca refeitas. `status: complete`, `scope: bateria`,
  escrita sob este manifesto, com identidade medida igual à da coleta e uma passada por janela do
  plano. Sem linha de base, declare `--no-baseline "motivo"` (ausência planejada, registrada).
- `--reference OUTRO.json` prepara uma **análise nova**, rotulada `nova-analise-com-outra-referencia`,
  mantendo o hash da referência coletada.
- Bateria anterior à fatia 6 (sem manifesto): `--legacy-reconstruction [--app-url URL]`, rotulada
  `reconstrucao-sem-manifesto`, sem linha de base. Recusado se a bateria tiver manifesto.
- Bateria interrompida, ou execuções de mais de uma bateria: **manifesto de análise**
  (`manifesto-analise-1.0.0`, `scripts/analysis-manifest.ts`), e `prepare --analysis-manifest ARQ
  --out NOVO_DIR` no lugar de `--battery/--collection-manifest/--site-dir/--baseline`. O pacote sai
  rotulado `analise-composta`, com `analysisManifest` (caminho, hash, justificativa, excluídos,
  divergências) e `sourceBatteries` na proveniência; `sourceBattery` fica nulo. O manifesto recusa:
  identidades de coleta diferentes (`compareIdentities`), dimensões diferentes entre as execuções
  incluídas (modelo, esforço, cliente, protocolo, contrato, suíte, escopo, invocação; perfil de
  oráculo dentro de cada braço), slot incluído que `--battery` recusaria, e qualquer slot de bateria
  fonte que não esteja incluído nem excluído com motivo. Diferenças fora da identidade (versão do
  cliente, Node, navegadores, commits) não recusam: ficam em `divergenciasRegistradas`. Coleta, site
  congelado e linha de base são os da bateria `--designada`; cada execução continua conferida contra
  o manifesto de coleta da SUA bateria. Na preparação, os hashes de baterias, manifestos de coleta,
  execuções e linha de base são reconferidos e o manifesto é refeito a partir das fontes — editado à
  mão, não confere.

  ```
  npm run manifest:analise -- build --out pipeline/logs/analises/NOME.json \
    --bateria A=pipeline/logs/X-bateria.json --bateria B=pipeline/logs/Y-bateria.json \
    --incluir A:1,2,3,4 --incluir B:1,2 \
    --excluir "A:5=limite de uso (429), sem relatório" --excluir "A:6=não tentado após o 429" \
    --designada A --baseline pipeline/logs/X-linha-de-base.json --baseline-motivo "..." \
    --justificativa "..."
  ```

O diretório precisa ser novo. É gerado:

- `package.json`: alegações, cenas, unidades, execuções (agente e linha de base), proveniência e hashes; **não editar**.
- `reviews.json`: decisões editáveis da autora, inicialmente pendentes.
- `review.md`: cartões com origem, cena, alegação, sujeitos, unidades candidatas e evidência declarada; sem coluna de braço/score.
- `reference.json` (os bytes do gabarito usado), `collection-manifest.json`, `baseline.json`, `source-battery.json`
  (na análise composta: `analysis-manifest.json` e um `source-battery-<RÓTULO>.json` por bateria fonte),
  `capture.json` e, por cena, `resolution-*.json`, `scene-*.html`, `scene-*.png`: proveniência e reconstrução.

Leia o cartão e preencha a decisão em `reviews.json`. Exemplo estrutural (substitua os IDs pelos do cartão):

```json
{
  "cardId": "C-ID_DO_CARTAO",
  "status": "reviewed",
  "reviewer": "NF",
  "rationale": "A observação descreve o defeito da unidade e foi conferida no estado indicado.",
  "complete": true,
  "evidenceRefs": ["scene-0.png; trecho do DOM em scene-0.html; evidência declarada no cartão"],
  "atoms": [
    {
      "id": "defeito-1",
      "text": "Descrição do defeito realmente afirmado, sem acrescentar outra alegação",
      "subjects": ["CHAVE_DO_SUJEITO_NO_CARTAO"],
      "verdict": "reference",
      "unitIds": ["U-ID_DA_UNIDADE"],
      "citation": "supported"
    }
  ]
}
```

`complete: true` atesta que **todas as cláusulas substantivas e todos os sujeitos** foram considerados.
O software consegue verificar a cobertura de sujeitos, mas não descobrir uma cláusula esquecida em texto livre.

| Campo | Valores e efeito |
|---|---|
| `verdict` | `reference`: defeito do gabarito; `novel`: defeito correto fora dele; `false`: afirmação falsa; `unresolved`: evidência insuficiente |
| `unitIds` | Alternativas semanticamente aceitas, apenas para `reference`; nos demais, `[]` |
| `subjects` | Um ou mais IDs do próprio cartão; o mesmo átomo é afirmado sobre cada sujeito listado |
| `citation` | `supported`, `unsupported` ou `uncertain`, independentemente da detecção |
| `duplicateOf` | Opcional: `{ "cardId": "C-...", "atomId": "..." }` no átomo repetido, após conferir equivalência |

**Dois defeitos = dois átomos.** Não coloque duas unidades em `unitIds` esperando dois TPs de um
mesmo átomo/sujeito. Essa lista representa alternativas do mesmo defeito. Para uma relação, a âncora
pode usar um participante explicitamente informado em `relatedSelectors`; um sujeito não resolvido
não pode emprestar um relacionado para obter crédito.

**Uma afirmação repetida com outra citação:** mantenha os cartões e as citações, mas vincule o
átomo repetido ao átomo original usando `duplicateOf`. A revisora declara essa equivalência, sem
agrupamento automático de paráfrases. O destino deve estar revisado e presente no mesmo run,
com mesmo veredito, estado, build, participantes relacionados e alternativas de unidade; deve
cobrir cada sujeito da duplicata. Ciclos, destinos ausentes/pendentes ou incompatíveis são erros.
Não se pode usar uma duplicata para esconder evidência insuficiente (`unresolved`). O resultado
mantém a instância com `verdict: "duplicate"` e o ID da instância canônica; `duplicateAssertions`
conta as repetições separadamente. Sem esse vínculo, duas afirmações de cartões distintos
continuam distintas. Para agrupamentos parcialmente duplicados, divida os sujeitos em átomos.

Depois, sem precisar do corpus:

```powershell
npm run score:fluxo -- --package results/semantic-review/minha-bateria/package.json --reviews results/semantic-review/minha-bateria/reviews.json --out results/semantic-review/minha-bateria/score-01.json --require-complete
npm run flow:review -- render --package results/semantic-review/minha-bateria/package.json --reviews results/semantic-review/minha-bateria/reviews.json --out results/semantic-review/minha-bateria/review-02.md
```

Resultados não são sobrescritos. `--require-complete` grava o diagnóstico e retorna código **2** se
houver pendências; código **1** indica erro de contrato/arquivo; código **0**, sucesso da operação.
Ausência de `--require-complete` permite explorar resultados provisórios, mas os campos finais
continuam `null` enquanto houver pendências.

### Reuso sem aumentar a fila indefinidamente

```powershell
npm run flow:review -- prepare --battery CAMINHO_DA_NOVA_BATERIA --out NOVO_DIRETORIO --reuse CAMINHO_DO_REVIEWS_ANTERIOR
```

Só reutiliza cartões com **mesmo conteúdo, sujeitos, evidência declarada, referência, cena e engine**.
IDs são SHA-256, não agrupamento por norma. Uma observação negada, outro valor, uma alteração da
cena ou da política não herda o veredito. Um achado adicional não invalida cartões idênticos só por
aumentar o número de seletores. Parafraseamentos não são agrupados automaticamente.

Reuso entre execuções também exige referências de arquivos verificadas, estado declarado e hash
do build original. Sem isso, o ID inclui a execução e sua identidade de evidência. Arquivos em
localizações diferentes podem continuar exigindo revisão separada, mesmo quando seus bytes são
iguais: o reuso é deliberadamente conservador. Uma duplicata cujo alvo não esteja no novo pacote
ou no mesmo run é recusada; não se transfere silenciosamente o seu efeito contábil.

O reuso é conservador: captura/HTML alterados podem pedir nova revisão. Não promete reduzir toda
paráfrase a um cartão. Uma futura interface pode propor grupos, desde que a autora confirme sua
equivalência e a decisão continue ligada à evidência de cada sujeito.

## Contabilidade publicada

Após decomposição, deduplicação exata por cartão e vínculos `duplicateOf` revisados no mesmo run:

- **D:** unidades de referência detectadas pelo emparelhamento máximo.
- **G:** número fixo de unidades no pacote; **FN = G − D**.
- **F:** instâncias de afirmações julgadas falsas (átomo × sujeito).
- **N:** instâncias de afirmações novas corretas, fora da referência.
- **R:** afirmações de referência redundantes: corretas, mas a unidade já recebeu crédito.
- Duplicatas declaradas não aumentam **D**, **F** ou **N**. A incidência/correção de cada citação
  permanece separada, inclusive em duplicatas.

O scorer publica:

| Métrica | Definição |
|---|---|
| `referenceRecall` | D/G |
| `referencePrecision` | D/(D+F), exclui descobertas corretas fora da referência e redundâncias |
| `referenceF1` | 2D/(D+G+F), métrica da referência congelada, não F1 de descoberta aberta |
| `assertionPrecision` | (D+N)/(D+N+F), precisão após colapsar afirmações de referência redundantes |
| `citationSupport` | fração de instâncias revisadas com citação julgada `supported`; inclui redundâncias e separa o problema da norma |

Denominador zero produz `null`. Se houver qualquer pendência, essas métricas finais ficam `null`;
`confirmedReferenceRecall` mostra somente o progresso confirmado. `unresolvedAssertions` é um
**mínimo** enquanto houver cartão não decomposto, pois um texto pendente pode conter vários defeitos.
`missedUnitIds` em saída provisória significa ainda não creditadas, não FN definitivamente estabelecidos.

As novas métricas não são diretamente intercambiáveis com o F1 legado: a semântica de aceitação e
a unidade das alegações compostas mudaram. O JSON inclui todas as instâncias, decisões, matches,
unidades restantes, famílias e hashes para tornar essa diferença auditável. Não agrega modelos,
braços ou clientes: os resultados são por execução e a configuração é preservada no pacote.

`novel` não aumenta G e não é FP. Isso permite concluir a bateria sem incorporar cada descoberta
ao gabarito e coletar tudo novamente. Registre a descoberta para uma próxima versão, se pertinente.

## Linhas de base e comparação (fatia 6)

Cada passada da linha de base da bateria vira cartões de duas execuções do pacote:

- `linha-de-base/validator-nao-guiada`: varredura de página inteira do validator, política fixa, sem
  seletor do gabarito — a comparável ao agente;
- `linha-de-base/axe`: axe-core, página inteira.

A varredura **guiada** (âncoras do gabarito) fica só como diagnóstico em
`provenance.baseline.guidedDiagnostic`; ESLint fica em `provenance.baseline.eslint`, sem atribuição a
elemento. O custo da linha de base (relógio por passada, US$ 0 de API) fica em `provenance.baseline.cost`.
Um cartão determinístico só é reaproveitável entre baterias com o mesmo build congelado
(`binding.build`), a mesma cena e o mesmo texto da ferramenta.

`score` publica, além dos `scores` de cada execução, `comparisons`: cada execução do agente contra
cada linha de base e contra a `uniao-deterministica`, com as unidades em `both`, `agentOnly`,
`baselineOnly` e `neither`, e as alegações novas/falsas/pendentes de cada lado, separadas da
detecção. `status` só é `complete` quando as duas execuções estão completas; antes disso a divisão
lista apenas detecções confirmadas.

## A unidade de detecção (fatia 3)

A unidade é **(elemento ou composição declarada) × (predicado de defeito atômico), no estado
aplicável**, com as citações normativas anexas. Isto esclarece — não substitui — o vocabulário
"elemento × regra" que o gabarito usa desde o D-23, e a mudança está em cada uma das três partes:

- **Elemento ou composição declarada.** `unico`/`todos` ancoram num elemento; `composicao` (D-33)
  ancora num conjunto nomeado que vale uma unidade. Já era assim; fica escrito.
- **Predicado de defeito atômico.** Um identificador normativo largo (uma WCAG genérica, uma
  recomendação e-MAG inteira) **não é** um predicado de defeito único: o mesmo `wcag:1.3.1` cobre
  defeitos diferentes no mesmo elemento. O que individualiza a unidade é o defeito que a spec
  descreve — é por isso que V-02 e V-11 coexistem no mesmo `#cpf`, ancoradas em regras distintas
  justamente para não colidir.
- **No estado aplicável.** Deixou de ser rótulo. `_meta.states` nomeia as paradas da sequência de
  `setup`, as âncoras são resolvidas em cada uma, e a unidade carrega os estados em que foi MEDIDA.

Três promessas do gabarito passaram a ser cobradas contra a página (D-06). Qualquer uma delas
falhando **para a preparação** em vez de medir:

| Promessa | Onde vivia | O que se cobra agora |
|---|---|---|
| A sequência de setup é aditiva | comentário em `_meta.setup_rationale` | elemento ancorado que resolve num estado tem de resolver em todos os posteriores |
| `state: "sempre"` | rótulo | a unidade existe em todos os estados medidos |
| `conditional: true` | documentação do campo | a unidade **não** existe antes do estado que declara |

### Navegação dentro da aplicação: segmentos (D-57)

A tela B (`vistorias`) é uma SPA cujo conteúdo mais rico só se alcança trocando de rota (lista →
detalhe → formulário). Uma sequência só aditiva não chega lá: a rota nova troca a árvore inteira.
Por isso o `setup` aceita um quarto passo:

```json
{ "action": "navigate", "selector": "<alvo do clique>", "waitFor": "<seletor da rota nova>" }
{ "action": "navigate", "path": "/pnip/portal-mpa/vistorias/…", "waitFor": "<seletor da rota nova>" }
```

- **Só dentro da aplicação.** Exatamente um de `selector` (clique; o endereço tem de mudar) ou
  `path` (pathname absoluto na MESMA origem, aplicado com `history.pushState` + `popstate`, que é o
  que o roteador escuta). `waitFor` é obrigatório. Nunca `page.goto`: o documento não pode ser
  recarregado — recarregar zera o backend em memória. Uma marca no `window` do documento acusa
  recarga, e o passo para.
- **Cada `navigate` abre um segmento.** A aditividade é cobrada só entre paradas do MESMO segmento
  (sem navegação entre elas); do outro lado de um `navigate`, sumir é o que a navegação declara, não
  defeito. `conditional` é cobrado dentro do segmento do estado declarado (a mesma chave estrutural
  noutra rota é outro elemento); `sempre` continua valendo para todas as paradas.
- **Toda parada declara `path`** quando o setup navega (`_meta.states[].path`, só o pathname). A
  conferência mede o endereço em cada parada e acusa o que diverge, a mudança de endereço sem
  `navigate` dentro de um segmento e a recarga do documento entre paradas.
- **Unidades por segmento.** Cada spec é construída no último estado do segmento do seu `state`
  (`sempre`, no último de todos), e seu predicado de aceitação só é medido nas paradas desse
  segmento. Sem navegação nada disso muda: um segmento só, o mesmo último estado, as mesmas saídas
  (`ground-truth-fluxo.json` e `ground-truth-solicitacao.json` conferidos byte a byte antes e depois).
- **Quem mede um estado só recusa.** Todo caminho que passa por `preparePage` (`score:fluxo:legacy`,
  `adjudicate`, `pacote:revisao`, todos do v01) para com erro nomeando o motivo quando o setup navega.
  Passo malformado ou de ação desconhecida também para — antes, um `click` sem seletor era pulado.

### Cenas por segmento: pacote, linha de base e manifesto (D-60)

Com navegação, a cena deixa de ser "a janela no fim do setup" e passa a ser **o fim de cada
segmento**. O argumento é o mesmo que sempre autorizou uma cena só: dentro de um segmento a sequência
é aditiva (cobrado), então a última parada dele contém tudo o que as anteriores ancoram.

- **Plano.** `statePlanOf` grava `paradas` (`id`, `afterStep`, `path`) quando o setup navega, e elas
  entram no `statePlanSha256`: mudar onde uma parada está ou o endereço dela é outro plano. Sem
  navegação o campo não existe e o hash é o de sempre. `cenasDoPlano` (em `collection-manifest.ts`) é a
  lista única de cenas que a linha de base mede e o pacote prepara: sem navegação, uma por janela
  (`1280x900`); com navegação, uma por segmento de cada janela, com id `1280x900@<última parada>`. Cada
  spec cai na cena do segmento do seu `state`; `sempre`, na do último segmento. O manifesto de coleta
  monta essa lista antes de congelar — plano malformado (parada sem `path`, última parada antes do fim
  do setup) não é congelado.
- **Pacote.** Uma página por janela percorre todas as paradas no mesmo carregamento; na última parada
  de cada segmento captura HTML, imagem e resolução. As unidades são construídas por
  `buildFlowUnitsAcross` — a mesma construção da `conferir:referencia` — e cada uma fica na cena do seu
  segmento. Cada predicado é medido só nas paradas do segmento da sua spec. `scenes[].segmento` e
  `capture.json` dizem número, parada, `path` e estados de cada cena.
- **Parada estável.** Com navegação, cada parada tem de ficar parada por 1 s depois do último passo
  (`JANELA_ESTABILIDADE_MS`): uma SPA real continua desenhando depois do seletor esperado aparecer, e
  resolução, captura, axe e scanner do oráculo a veriam em instantes diferentes. Parada que muda é
  defeito do plano (`conferir:referencia`, pacote e linha de base param), e o conserto é declarar uma
  espera pelo que ainda carrega. Sem navegação nada disso roda.
- **Entrada direta.** O scanner do oráculo só conhece clique, preenchimento, tecla e espera, e não
  herda a página de ninguém. Para alcançar a cena de um segmento ele entra direto na rota do último
  `navigate` por caminho, repetindo a consulta da entrada (é ela que escolhe sessão/perfil na tela B),
  e repete a espera dele e os passos seguintes; `navigate` por clique vira clique + espera. Isso não é
  presumido igual à navegação: a árvore da entrada direta é comparada com a navegada (chave, rótulo
  sem id do DOM e visibilidade de cada elemento sob `body`) e, se diverge ou ainda muda depois do
  último passo, a linha de base para. Ids numerados por contador (`br-input-14` direto, `br-input-105`
  navegando) são o mesmo elemento; por isso o seletor de alegação que não alcança nada navegando e
  alcança na entrada direta é resolvido lá — na linha de base (`passes[].segmento.entradaDireta`) e no
  pacote (`capture.json`, `scenes[].entradaDireta.seletores`).
- **Linha de base.** Uma passada por cena do plano, com `segmento` e, no scanner, `request.url` da
  entrada direta. O resumo `legacy` fica `null` (`legacyAusente` diz por quê): ele soma passadas por
  chave, e chaves de segmentos diferentes nomeiam elementos diferentes.
- **Alegação em mais de um segmento.** O achado do agente diz a janela e os passos em texto livre,
  nunca a rota; casar esse texto com um segmento seria a inferência que o D-39 proíbe. O seletor é
  resolvido em cada segmento da janela: resolvendo em um só, o cartão fica nele
  (`segmento-pela-resolucao`); em nenhum, fica no primeiro, não resolvido (`segmento-nao-resolvido`);
  em mais de um, o cartão é `a-decidir:<janela>`, traz `segmentos` e os sujeitos de cada um
  (`<cena>|<chave>`), e a decisão **precisa** de `"cena"` — só os sujeitos dela contam e só unidades
  dela podem ser creditadas. `"cena"` em qualquer outro cartão, ou numa decisão pendente, é recusado. A
  pendência conta o menor grupo de sujeitos (piso). A bancada (`review-ui.ts`) pede a cena antes de
  gravar. Linha de base nunca é ambígua: cada passada é uma cena.

Sem navegação, fluxo e solicitação saem byte a byte iguais ao código anterior: mesmo manifesto
(identidade e plano), mesma linha de base (fora relógio e caminhos) e o mesmo pacote e a mesma
pontuação — `package.json`, `review.md`, `reviews.json`, capturas, resoluções e `score.json` — sobre
as mesmas entradas, com o hash do scorer igualado.

A visibilidade passou a ser medida junto da chave canônica. A chave é estrutural: oculto e visível
produzem a mesma. Agora cada sujeito chega ao cartão dizendo se está oculto e por quê
(`nao-renderizado`, `aria-hidden`, atributo `hidden`). Não é veredito — há defeito legítimo em
elemento oculto, e há defeito que só existe porque o elemento está oculto.

## Predicados de aceitação: o que a máquina verifica, e o que ela nunca decide

A tela `/fluxo.html` e o `ground-truth-fluxo.json` foram redigidos pelo **assistente**, e a regra de
independência (`adjudicacao.md § Quem pode julgar`) desqualifica quem escreveu a tela ou o gabarito
de julgar sobre eles. Até aqui o gabarito era inteiramente autoria: afirmava "padding de 13px, fora
da escala do DS" e nada conferia isso contra a página.

Um predicado declarado em `acceptance` torna a afirmação **reexecutável**. A preparação mede a
condição na página congelada, no estado a que a spec pertence, e para se o que o gabarito afirma não
estiver lá. Consertar a tela faz o predicado deixar de sustentar: o gabarito não sobrevive em
silêncio à correção do defeito que cataloga.

**O que um predicado não faz.** Não credita. Sustentar prova que o **defeito existe na página**; não
prova que a alegação do agente **afirma aquele defeito**. Verificar que o defeito está lá é
insuficiente — a ponte entre o texto da alegação e o defeito é decisão semântica da autora (D-39), e
continua sendo. Também não é o oráculo: nada em `acceptance-predicates.ts` importa do
`govbr-ds-validator` nem lê a KB, porque reaproveitar os verificadores do avaliado faria o avaliador
confirmar o avaliado (D-41).

### Desfechos

| Desfecho | Significado |
|---|---|
| `sustenta` | a condição foi medida, participante a participante, no estado declarado |
| `refuta` | a página desmente a spec: a preparação para |
| `nao-implementado` | a spec não declara predicado, ou declara espécie que este avaliador não implementa. **Não é aceitação nem recusa**: é ausência de máquina, e a alegação segue para a fila |
| `nao-replicavel` | a medida não pôde ser feita, ou discordou de si mesma entre estados |

`nao-implementado` **nunca** recai em "casou por elemento, logo está certo". A aceitação automática —
que hoje nada emite, porque toda alegação de bateria v02 passa pela revisora — só é válida onde um
predicado implementado sustenta **e é da mesma espécie** que a decisão nomeia. A regra é código
(`validateDecision`), não intenção.

### Espécies implementadas

`estilo-computado` · `atributos-ausentes` · `classe-no-elemento` · `cor-de-borda-pintada`.

`allowed` enuncia a **norma** e é a forma preferida: sustenta quando o medido cai fora dela.
`forbidden` nomeia o **valor autoral** que o gabarito acusa, e existe porque o registro completo de
tokens do DS mora no oráculo — trazê-lo para cá seria reconstruir o avaliado dentro do avaliador.
Todo `forbidden` carrega `note` dizendo de onde o valor veio.

### As specs, e o contraexemplo de cada uma

O contraexemplo é a alegação **parecida que não estabelece o defeito** — o que a revisora precisa
distinguir.

| Spec | Predicado | O que estabelece o defeito | Alegação parecida que NÃO estabelece |
|---|---|---|---|
| V-01 | `estilo-computado` — padding fora de {0, 4px, 8px, 16px} | algum lado do padding computado fora da escala (medido: 13px nos quatro lados) | "o espaçamento parece apertado", ou apontar `margin` em vez de `padding`: a escala é sobre o valor medido, não sobre a impressão |
| V-02 | `atributos-ausentes` — `aria-describedby` | há texto de apoio visível e o campo não o referencia | dizer que falta `<label>`: o rótulo existe, e a regra é condicional ao apoio existir |
| V-03a | `atributos-ausentes` — `aria-invalid`, `aria-describedby` | o campo não identifica o estado de erro programaticamente | apontar a mensagem de erro: é a V-03b, outro elemento e outro estado |
| V-03b | `atributos-ausentes` — `role`, `aria-live` | a mensagem nasce sem região viva que a anuncie | dizer que a mensagem "não tem contraste": outro defeito no mesmo elemento, e é a V-09 |
| V-06 | `cor-de-borda-pintada` — `rgb(222, 226, 230)` | alguma borda **pintada** (largura > 0) na cor autoral | citar um lado de largura 0: herda a cor do texto e não aparece na tela — a cor sozinha não é o defeito |
| V-08 | `classe-no-elemento` — `.br-input` em `<input>` | a classe raiz aparece no próprio controle, além do contêiner | dizer que o contêiner `<div class="br-input">` está errado: ele é o canônico |
| V-09 | `estilo-computado` — `color` = `rgb(230, 0, 0)` | a cor do texto é valor autoral fora do registro de tokens | alegar contraste insuficiente: é outra pergunta, e o predicado não a responde |

**Sem predicado: V-04, V-05, V-10, V-11, V-12.** Foco suprimido exige focar o elemento; âncora de
salto e instruções de entrada são leitura de conteúdo; a barra a 320px é geometria de layout; a
semântica de lista é propriedade do conjunto. Nenhuma é impossível — nenhuma é pequena e
transparente o bastante para entrar sem reconstruir o avaliado dentro do avaliador. Ficam
`nao-implementado`, e a revisora decide como sempre decidiu.

## Proveniência e estados: limite importante

As capturas são **reconstruções para revisão**, não evidência capturada na execução original. O
preparador abre uma página nova **por janela do plano**, reproduz `_meta.setup` em cada uma e, nela,
resolve todos os seletores (gabarito, agente, linha de base), constrói as unidades das specs daquela
janela e captura HTML e imagem — no fim do setup, ou, quando ele navega, no fim de cada segmento
(D-60, acima). O mapa de cada cena fica em `resolution-*.json`, e seu hash em
`scenes[].resolutionHash`.

Um cartão do agente vai para a cena de **mesma largura** que `state.viewport` (altura diferente é
sinalizada: `altura-diferente`). Largura fora do plano vira cena `fora-do-plano:LxA`: os sujeitos são
lidos na cena padrão, mas o cartão não ancora unidade nenhuma (só `novel`, `false` ou `unresolved`).
Cartão sem janela (legado) vai para a cena padrão, com `sem-janela-declarada`. As interações de
`state.steps` continuam sendo texto do agente e **não** são casadas automaticamente com o `setup`:
casar texto livre com um estado nomeado seria a inferência semântica que o D-39 proíbe. O que existe
agora é sinal — quando as unidades candidatas do cartão só existem depois de uma interação e a
alegação não declara passo nenhum, o cartão recebe `estado-nao-declarado` dizendo em que estados
aquelas unidades foram medidas. É a autora quem confere se a observação descreve esse estado. Nada
disso prova que o agente visitou cada janela.

Não dê crédito a uma observação só porque a reconstrução mostra o defeito. Leia a afirmação e suas
limitações e, quando necessário, a transcrição original; use `unresolved` se a evidência faltar.
Desde `fluxo-1.3.0` a evidência gravada durante a execução fica preservada e aparece no cartão (ver
acima); para execuções legadas a reconstrução continua sendo o único apoio visual. O isolamento de rede
é a superfície de medida (D-40).

O fingerprint do engine (`SCORER_FILES` em `semantic-flow.ts`) inclui código de matching, resolvedor,
contrato do achado (`flow-contract.ts`), tipos, instrumento e aliases.
Código/aliases diferentes impedem pontuar silenciosamente um pacote antigo. O hash é controle de
consistência, não assinatura contra adulteração maliciosa.

## Integração e regressão

O runner agora prepara o pacote da bateria de fluxo em vez de imprimir F1 por coincidência de regra.
Um manifesto com falhas, sem arquivo, ou de outra suíte não é filtrado silenciosamente: a preparação
falha e preserva os artefatos. Uma análise parcial exige manifesto explicitamente documentado.

```powershell
npm run test:semantic
npm run test:manifest
npm run test:fatia6      # navegador + oráculo compilado + build do corpus; nenhum modelo
npm run test:contract
npm run test:evidence
npm run test:flow
npm run typecheck
npm run test:pipeline
```

`test:contract` cobre o coletor, o rótulo legado, a resolução de evidência e os cartões; a cópia da
evidência pelo runner está em `test:pipeline`.

O teste semântico cobre a reprodução da descrição falsa, permutações, compostos, composições,
referências relacionais, novos defeitos, reuso/invalidação e CLI offline. O matcher é confrontado
com busca exaustiva nos **512 grafos bipartidos 3×3**, além dos casos de integração.
