# Painel de resultados (T8a) — guia passo a passo

O painel é uma página no seu computador que abre o arquivo de resultados (o clone do
`govbr-resultados`) e mostra, do mais recente para o mais antigo: o que rodou, o que falhou, o que já
tem pontuação e a comparação sem/com. Nele você também revisa os cartões e recalcula a pontuação.
Ele não chama modelo e não mostra o gabarito. A única saída para a internet é baixar, com o `gh`, um
anexo de evidências que ainda não esteja na máquina (desligue com `--sem-download`).

Plano e decisões: `thesis-workspace/planejamento/atual/plano-t8a-painel-2026-10-03.md` e, para o redesenho
(ids curtos, avisos de uma frase, comparação com × sem, guia em diagramas, porta),
`plano-t8a2-painel-redesenho-2026-10-03.md`. Workflow e
arquivo: [`pipeline-isolado.md`](pipeline-isolado.md). De onde vêm os números:
[`analise-execucao.md`](analise-execucao.md).

## 0. Experimentar primeiro com a fixture

A fixture é um arquivo de resultados **inventado**, com todos os casos que o painel precisa mostrar.
Todas as páginas exibem uma faixa roxa "FIXTURE SINTÉTICA" enquanto ela está aberta.

```sh
cd govbr-eval
npm run painel:fixture -- ../painel-fixture        # monta numa pasta nova (uns 10 s)
npm run painel:resultados -- --arquivo ../painel-fixture
```

Abra **http://127.0.0.1:4610/** no navegador. Para encerrar, use Ctrl+C no terminal. Para recomeçar do
zero, apague a pasta e rode o primeiro comando de novo.

> **Porta ocupada.** Se já houver **outro painel** na 4610, o novo **não sobe**: o terminal mostra, num
> quadro, qual arquivo o outro está servindo. Feche o outro (Ctrl+C no terminal dele) ou abra este ao
> lado com `--porta 4611`. Se a 4610 estiver ocupada por **outro programa** (ou se você deu `--porta`
> e ela estava ocupada), o painel sobe na próxima livre e o terminal mostra **em destaque** o endereço
> certo. Em toda página, logo abaixo do título do painel, aparece o caminho do arquivo aberto: confira
> antes de ler qualquer número.

O que tem na fixture:

| Par | Situação |
|---|---|
| par-05 | só o braço com, e ele foi interrompido **sem pacote** |
| par-04 | o sem enviou **0 achados**, que é uma lista vazia aceita; o com terminou **sem submissão**, então não há comparação |
| par-03 | só o braço sem, com o **anexo de evidências não publicado** |
| par-02 | par completo com a revisão **pendente**: é o que você revisa |
| par-01 | par completo com a revisão fechada (final), mais uma tentativa de recalcular que falhou |

## 1. Disparar uma execução (GitHub)

1. GitHub → `govbr-eval` → **Actions** → `execucao-isolada` → **Run workflow**.
2. Preencha campanha, slot, tela, braço e modelo, mais os **commits completos** (40 caracteres) de
   `govbr-telas` e `govbr-ds-validator`. Na primeira vez use `modo: roteirizado`, que não gasta modelo.
3. Um disparo por vez. O detalhe de cada campo está em [`pipeline-isolado.md`](pipeline-isolado.md).

## 2. Acompanhar

Na página da execução no GitHub, os quatro jobs aparecem em ordem: `preparar` → `coleta` e
`linhas-de-base` → `arquivar`. O resumo de cada job aparece no fim da página. O `arquivar` roda
mesmo quando algo antes dele falha, para que a falha também fique registrada no arquivo.

## 3. Abrir os resultados no painel

```sh
cd govbr-resultados && git pull                      # traz o que o job arquivar gravou
cd ../govbr-eval
npm run painel:resultados -- --arquivo ../govbr-resultados
```

- **Estado das execuções** é a página inicial. Cada execução tem um **id curto**: o slot da campanha
  (`p01-sem` = par 1, braço sem). É o mesmo id nos quadros do topo, nos avisos, nas listas, no
  endereço (`/execucao/<campanha>/<id>`) e no título do resumo técnico. Sem slot legível, o id é
  `<par>-<braço>-r<repetição>`; um slot disparado de novo vira `<slot>-t1`, `<slot>-t2`… O runId
  completo fica em “Identificadores completos”, na página da execução.
- Os **quadros do topo** dizem, pelos ids, quais execuções falharam, quais terminaram com 0 achados,
  quais pares estão incompletos, quais estão prontos para preparar, aguardando revisão ou com
  comparação final. Ensaios não entram nos quadros quando há campanhas reais.
- **Avisos**: cada um é uma frase, `<id>: o que aconteceu — o que fazer`, com o link “Como resolver”.
  Log e stack nunca vão para a tela; o texto inteiro fica no `erro.json` ou no detalhe da execução.
- Depois vêm as **campanhas**, a mais recente primeiro, cada uma com o rótulo do que ela é:
  **calibração (D-67) — não é resultado** (piloto com o modelo real), **campanha formal**, ou
  **ensaio** (dublê/roteiro/fixture; ficam dobrados no fim quando há campanhas reais). Dentro de cada
  campanha, os pares, e em cada par uma linha por execução: id, braço, estados (o que está bem aparece
  discreto, com ✓; o que pede atenção vira pílula), achados e duração.
- Um par a que falta um braço que a campanha **não planejou** (a prova do cliente, só braço com)
  aparece como “um braço só, pelo desenho da campanha”, não como par incompleto.
- Clique no **par** para ver a comparação com × sem, na mesma linguagem da página Resultados do painel
  do TCC: uma faixa **PROVISÓRIO** (revisão aberta, com quantos cartões faltam) ou **FINAL**, um cartão
  por braço com o número grande (defeitos da referência confirmados, de N), barras lado a lado
  (confirmados, achados, tempo, custo) e a diferença com − sem, sempre com “n = 1 par”. A tabela
  completa, com o arquivo e o campo de cada número, fica em “Resultado por braço”. Os números vêm só do
  `summary.json` da análise (T6); o painel não recalcula nada por conta própria, e nunca soma pares.
- Quando uma campanha tem pares com revisão **fechada**, a página inicial mostra a comparação de cada
  um, lado a lado, com n dito — nunca somados (D-69).
- “indisponível” quer dizer que o número ainda não existe. Isso acontece com a revisão aberta ou a
  análise bloqueada. Não quer dizer zero.
- **Guia em diagramas** (`/guia`): três figuras para quem chega agora — como um disparo anda, as
  paredes da execução e de um achado ao número. É um deck reveal.js (versão fixada no `package.json`,
  servido de `node_modules`, sem internet); no celular vira uma página que rola. Os SVG ficam em
  `docs/diagramas/`, para o deck da defesa reaproveitar.

## 3a. Preparar a primeira análise (T8a.1)

Um par que acabou de chegar do workflow aparece como **“sem análise: pronta para preparar”**.

1. Abra o par e clique em **Preparar análise**. Nada mais: o painel monta a análise sozinho a partir
   do arquivo, conferindo cada peça pelo sha256 que o workflow registrou — a campanha, o conjunto de
   snapshots, a referência congelada (lida só pelo cálculo, nunca exibida), o site congelado, a linha
   de base dos mesmos disparos e o pacote completo de cada braço.
2. O pacote completo (com as capturas de `evidence/`) vem do **anexo da Release**. O painel procura
   o anexo em `anexos/<release>/` dentro do clone; se não estiver lá, baixa com
   `gh release download`, usando a sua sessão do `gh` (rode `gh auth login` uma vez). Cada anexo é
   conferido pelo sha256 do índice antes de ser aberto.
3. Ao terminar, o painel abre a **fila de revisão** da versão `rev-001`, com a pontuação “aguardando
   revisão”.

Se algo faltar, a página do par diz **em que etapa parou e por quê** — por exemplo “anexo ausente”
(o anexo não está na máquina e o download falhou ou estava desligado), “hash divergente” (um arquivo
não é o que o workflow registrou) ou “linha de base ausente”. Nada parcial vira análise: resolva a
causa e clique em **Tentar de novo**. O registro de cada tentativa fica em
`analises/<campanha>/<par>/preparacao/falhas/`.

Uma execução sem par completo (o outro braço falhou sem pacote, por exemplo) tem o mesmo botão na
página dela: **Preparar a análise desta execução (individual)**.

Tela com referência que navega (a tela B) aparece como **“fora do alcance da análise”**, sem botão:
a análise ainda não aceita esse caso (D-69, NAT-51). As execuções e o resumo técnico continuam ali.

**“hash divergente” em tudo, logo de cara?** É quase sempre o Git do Windows trocando os finais de linha
do clone (`core.autocrlf=true`): nenhum arquivo de texto tem mais o sha256 que o workflow registrou. O
painel detecta isso, avisa no topo da página inicial e não prepara nada (a conferência continua byte a
byte). Corrija o clone **uma vez**, dentro da pasta do `govbr-resultados`:

```sh
git config core.autocrlf false
git rm --cached -r -q .
git reset --hard
```

As pastas que o painel cria (`analises/`, `restauracoes/`, `anexos/`) não são do Git e ficam como estão.

Sem `gh` (ou com `--sem-download`), baixe o anexo pela página da Release e coloque o arquivo em
`anexos/<release>/` dentro do clone, ou abra o painel com `--anexos <pasta onde ele está>`.

Para experimentar sem disparar nada: `npm run painel:fixture -- --t4 ../painel-t4` monta um arquivo
inventado, pelo mesmo código do job arquivar, ainda sem análise. O terminal mostra o comando para
abrir o painel sobre ele.

## 4. Revisar

1. No par, clique em **Abrir fila de revisão**. Faça a revisão **antes** de abrir “Achados enviados
   por braço”: abrir essa lista revela de que braço veio cada alegação.
2. Escreva seu nome no topo da página. O navegador lembra dele.
3. Em cada cartão, leia o que foi observado, o que era esperado, os elementos, as unidades candidatas
   e a evidência. Depois escolha uma das cinco decisões:
   - **Defeito do gabarito**: marque também a unidade que a alegação acertou.
   - **Defeito novo correto**: a alegação está certa, mas o defeito não está na referência.
   - **Incorreta**: a alegação está errada.
   - **Duplicada**: a mesma alegação já foi decidida em outro cartão da mesma execução.
   - **Evidência insuficiente**: não dá para decidir com o que está no cartão.
4. Escreva a **justificativa**, que é obrigatória, e clique em **Salvar decisão**.

Cada vez que você salva, o painel grava um arquivo novo
(`analises/.../decisoes/decisoes-NNNN.json`) e não apaga nada. O histórico aparece no fim da página.
Para mudar uma decisão, decida o cartão de novo: a mudança vira uma versão nova. Se duas janelas
estiverem abertas, a segunda gravação é recusada e o painel pede para recarregar a página.

## 5. Recalcular

Clique em **Recalcular**, que está no topo da fila e na página do par. O painel roda a análise (T6)
de novo com as suas decisões e grava uma versão nova (`rev-002`, `rev-003`…) sem tocar nas anteriores.
A pontuação só fica **final** quando não sobra nenhum cartão pendente. O botão funciona sem
internet e sem chave de IA.

Se o recálculo falhar, a versão anterior continua na tela e um aviso vermelho diz o motivo. O que
deu errado fica guardado em `revisoes/falhas/`.

Para baixar uma versão, use **Baixar esta versão (.tar.gz)** na página do par. O arquivo traz tudo
o que a página mostra, **sem** a referência congelada.

## 6. Recuperar uma publicação que falhou

Quando aparece o selo **“anexo de evidências não publicado”** ou **“pendente”**, o pacote já está no
arquivo, mas o anexo da Release não foi confirmado.

1. No GitHub, abra a mesma execução do workflow (Actions → `execucao-isolada` → a execução).
2. Clique em **Re-run failed jobs**. Só o `arquivar` roda de novo, reenviando o mesmo pacote. O
   modelo **não** é chamado.
3. No computador, rode `git pull` no `govbr-resultados` e recarregue o painel. O selo muda para
   “anexo confirmado”.

Execução **sem pacote** (interrompida, VM perdida) não tem o que recuperar: o slot continua
visível como falha, e uma nova tentativa é um novo disparo.

## Onde o painel grava

Só dentro do arquivo aberto, e só em três pastas:

| Pasta | O quê |
|---|---|
| `analises/<campanha>/<par ou runId>/` | `receita.json` (entradas da análise, montada pelo **Preparar análise**), `revisoes/rev-NNN/` (cada cálculo), `revisoes/falhas/`, `decisoes/`, `preparacao/falhas/` |
| `restauracoes/<runId>/` | o pacote inteiro restaurado do anexo, que o recálculo precisa. É um cache: o painel o refaz do anexo se estiver adulterado (a cópia ruim fica ao lado, `.invalido-<data>`), e não precisa ir para o git |
| `anexos/<release>/` | anexos baixados pelo painel com o `gh`. Também é cache: não precisa ir para o git |

## Segurança

- O painel só atende em `127.0.0.1`. Cada endereço é resolvido por um identificador conhecido, e
  nenhuma rota recebe caminho de arquivo. Tudo o mais responde 404, inclusive `ground-truth*.json`,
  `/@fs/...` e a referência arquivada. `npm run test:painel` confere isso.
- Na fila, o cartão não mostra o braço, o id da execução nem o nome dos arquivos de evidência.

## Limites (T8a)

- A primeira análise sai do botão **Preparar análise** (T8a.1) só para disparos arquivados com o
  manifesto de coleta 1.1.0, que traz a campanha. Disparos arquivados antes disso não têm a campanha
  e aparecem como “não dá para preparar”, com o motivo.
- Um braço com mais de uma tentativa arquivada é recusado com motivo: escolher a tentativa pela
  política da campanha ainda não é feito pelo painel.
- Sem filtros, lista de defeitos entre campanhas, hospedagem nem controle de acesso. Isso fica para o
  T8b e para a decisão de hospedagem.
- Referência que navega (tela B) ainda é recusada pela análise (D-69).

## Testes

`npm run test:painel` monta a fixture, sobe o painel numa porta livre e confere os estados, os números
contra `summary.json`/`score.json`, as gravações versionadas, o recálculo, o download e o isolamento.
Num segundo arquivo, montado pelo código do job arquivar e sem análise, confere o **Preparar
análise**: pronto para preparar, fora do alcance (referência que navega), anexo ausente e hash
divergente como falhas com etapa, o caminho completo até “aguardando revisão”, a análise individual,
o 404 da referência, do site, da campanha e das restaurações, e o cache adulterado refeito do anexo.
Do redesenho (T8a.2): o id curto em toda página e na URL (e ausente da fila cega), avisos de uma frase
sem stack, a porta ocupada (outro painel recusa e diz o arquivo; outro programa → porta ao lado com
aviso), o `/guia` servido sem rede, ensaio que não vira “fixture” e o clone com CRLF.
