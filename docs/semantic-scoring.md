# Pontuação semântica e revisão finita — flow-semantic-1.1.0

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

`flags` não mudam a pontuação; orientam a leitura: `regra-incerta`, `varias-regras` (indício de
alegação composta — decomponha em átomos; o software não divide), `sem-evidencia`,
`contrato-incompleto: …`, `legado-sem-estado-nem-evidencia` e `malformado`. Um pacote não mistura
contratos de coleta.

## Garantias e limites

- Seletor e norma apenas sugerem candidatos. **Nenhum texto recebe TP automaticamente.**
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

Execute em `govbr-eval`, com Node compatível com o projeto. Na preparação, o corpus deve estar acessível.

```powershell
npm run flow:review -- prepare --battery pipeline/logs/2026-09-14T17-35-45-bateria.json --out results/semantic-review/minha-bateria
```

O diretório precisa ser novo. É gerado:

- `package.json`: alegações, unidades, referências a execuções e hashes; **não editar**.
- `reviews.json`: decisões editáveis da autora, inicialmente pendentes.
- `review.md`: cartões com alegação, sujeitos, unidades candidatas e evidência declarada; sem coluna de braço/score.
- `reference.json`, `source-battery.json`, `capture.json`, `scene-*.html`, `scene-*.png`: proveniência e reconstrução.

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

## Proveniência e estados: limite importante

As capturas são **reconstruções para revisão**, não evidência capturada na execução original. O
preparador reproduz `_meta.setup`, resolve as âncoras no viewport principal e captura também os
viewports declarados no gabarito. Isso atende ao corpus aditivo atual; ainda não implementa resolução
independente para cada estado não aditivo nem prova que o agente visitou cada viewport.

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
