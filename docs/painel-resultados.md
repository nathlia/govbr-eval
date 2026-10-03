# Painel de resultados (T8a) — guia passo a passo

O painel é uma página no seu computador que abre o arquivo de resultados (o clone do
`govbr-resultados`) e mostra, do mais recente para o mais antigo: o que rodou, o que falhou, o que já
tem pontuação e a comparação sem/com. Nele você também revisa os cartões e recalcula a pontuação.
Ele não chama modelo, não usa a internet e não mostra o gabarito.

Plano e decisões: `thesis-workspace/planejamento/atual/plano-t8a-painel-2026-10-03.md`. Workflow e
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

Abra **http://127.0.0.1:4610/** no navegador. Se a 4610 estiver ocupada, o terminal mostra a porta
que foi usada. Para encerrar, use Ctrl+C no terminal. Para recomeçar do zero, apague a pasta e rode
o primeiro comando de novo.

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

- **Execuções e pares** é a página inicial. Os pares aparecem no topo e as execuções embaixo, cada
  uma com o status técnico, os achados, a pontuação, a publicação e a causa da falha.
- Clique na **data** de uma execução para abrir o **resumo técnico**. Ele existe mesmo sem
  pontuação, porque é lido direto do `run.json` arquivado.
- Clique no **par** para ver a comparação. Abaixo de cada número aparecem o arquivo e o campo de onde
  ele veio. Os números vêm só do `summary.json` da análise (T6); o painel não recalcula nada por
  conta própria.
- “indisponível” quer dizer que o número ainda não existe. Isso acontece com a revisão aberta ou a
  análise bloqueada. Não quer dizer zero.

Para um par real aparecer com análise, ela precisa existir no arquivo, em `analises/`. Hoje quem
prepara a primeira análise de uma execução real é o assistente. Veja "Limites", no fim deste guia.

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

Só dentro do arquivo aberto, e só em duas pastas:

| Pasta | O quê |
|---|---|
| `analises/<campanha>/<par>/` | `receita.json` (entradas da análise), `revisoes/rev-NNN/` (cada cálculo), `revisoes/falhas/`, `decisoes/` |
| `restauracoes/<runId>/` | o pacote inteiro restaurado do anexo, que o recálculo precisa. É um cache: pode ser recriado com `restaurar-execucao` e não precisa ir para o git |

## Segurança

- O painel só atende em `127.0.0.1`. Cada endereço é resolvido por um identificador conhecido, e
  nenhuma rota recebe caminho de arquivo. Tudo o mais responde 404, inclusive `ground-truth*.json`,
  `/@fs/...` e a referência arquivada. `npm run test:painel` confere isso.
- Na fila, o cartão não mostra o braço, o id da execução nem o nome dos arquivos de evidência.

## Limites (T8a)

- A **primeira** análise de uma execução real ainda não sai do painel. O arquivo do T4 não guarda o
  `campaign.json` nem o site, e o pacote navegável não tem `evidence/`. Por isso a análise precisa de
  uma `receita.json` e dos pacotes restaurados. A fixture tem tudo isso. Para o piloto (T5), o
  assistente prepara a receita.
- Sem filtros, gráficos, hospedagem nem controle de acesso. Isso fica para o T8b e para a decisão de
  hospedagem.
- Referência que navega (tela B) ainda é recusada pela análise (D-69).

## Testes

`npm run test:painel` monta a fixture, sobe o painel numa porta livre e confere os estados, os números
contra `summary.json`/`score.json`, as gravações versionadas, o recálculo, o download e o isolamento.
