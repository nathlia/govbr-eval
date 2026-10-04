# Tela A — restrições de página (camada da referência 2.0.0, D-83)

**Escrito em 2026-10-03, ANTES de qualquer medição da página.** As seções 1 a 3 foram gravadas
antes de abrir a página congelada; a seção 4 foi acrescentada depois da medição, sem mudar as
anteriores.

**Cegueira.** Para escrever este arquivo e medir a página não foram abertos:
`govbr-ds-validator/src`, `govbr-ds-validator/data`, `checker-aliases.json`, `kb-aliases.json`,
`results/`, `reports/`, `govbr-resultados` (pacotes e análises do piloto) e `ds-rules/`. A lista de
áreas vem só da documentação pública do DS, citada abaixo.

---

## 1. Fonte

- **Página:** "Templates › Base", documentação pública do Padrão Digital de Governo (gov.br DS):
  <https://www.gov.br/ds/templates/base> (a aplicação redireciona para
  `https://www.gov.br/ds/templates/base?tab=visao-geral`).
- **Lida em:** 2026-10-03, renderizada em Chromium sem interface (o site é uma aplicação de página
  única; o texto abaixo é o `innerText` da área de conteúdo, copiado sem edição).

### Citações

Tabela "Anatomia" (colunas ID · Nome · Referência · Uso):

> 1 · Área de Cabeçalho · Componente Header · **Obrigatório**
> 2 · Área de Conteúdo · — · **Obrigatório**
> 3 · Área de Localização · Componente Breadcrumb · **Opcional**
> 4 · Área de Navegação · Componente Menu · **Opcional**
> 5 · Área de Rodapé · Componente Footer · **Obrigatório**

Detalhamento:

> **1. Área de Cabeçalho (Obrigatório).** "Esta é uma área essencial e obrigatória no template base.
> Nesta região deve-se utilizar apenas o componente header com suas variações." · "Todos os
> comportamentos e outras regras definidas na diretriz do Header devem ser utilizados dentro do Base."

> **2. Área de Conteúdo (Obrigatório).** "Esta é uma área essencial no template base. Esta região
> contém todo conteúdo específico de uma página."

> **3. Área de Localização (Opcional).** "Esta é uma área opcional e deve ser utilizado o componente
> Breadcrumb [...]. Quando utilizada, deve ser o primeiro conteúdo exibido dentro da Área de Conteúdo."

> **4. Área de Navegação (Opcional).** "Esta é uma área opcional. Esta região contém exclusivamente o
> componente Menu [...]."

> **5. Área de Rodapé (Obrigatório).** "Esta é uma área essencial do template base onde é utilizado o
> componente Footer com suas variações e tipos." · "Todos os comportamentos (e demais regras)
> definidos na diretriz do Footer devem ser utilizados dentro do Base."

Sobre o atalho (seção de acessibilidade da mesma página):

> "Oferecer um menu oculto (skip link) com âncoras para as principais áreas da página fornece
> benefícios para usuários que usam apenas teclado sem prejudicar aqueles que usam o mouse para
> navegar." · "O Design System conta com o componente skip link para realizar essa função."

### Ambiguidade

A tabela de anatomia não deixa dúvida para as cinco áreas. O skip link não está na tabela e o texto
o apresenta como benefício, sem a palavra "obrigatório"; fica como **não obrigatório pelo texto**.
Nenhuma área foi acrescentada ou retirada por conhecimento próprio do DS.

## 2. Lista

| Área | Componente citado | Uso pelo texto |
|---|---|---|
| Cabeçalho | Header | **obrigatória** |
| Conteúdo | — | **obrigatória** |
| Rodapé | Footer | **obrigatória** |
| Localização | Breadcrumb | não obrigatório pelo texto (opcional) |
| Navegação | Menu | não obrigatório pelo texto (opcional) |
| Skip link | skip link | não obrigatório pelo texto (fora da tabela) |

Só as três obrigatórias são medidas para a regra de inclusão. As outras ficam registradas, sem
spec, qualquer que seja o estado delas na página.

## 3. Regra de inclusão e medida (fixadas antes de medir)

Regra do plano (`thesis-workspace/planejamento/atual/plano-referencia-tela-a-2-2026-10-04.md`):
cada área obrigatória **ausente ou não conforme** na página congelada vira **uma spec** de escopo
página (estado `sempre`, cena S0), com âncora medida e descrição neutra, que não cita regra nem id de
regra. Área presente e conforme fica registrada como conforme. As 12 specs e 14 unidades da 1.0.0
não mudam, e o sorteio não é refeito.

**Página medida:** o site congelado `govbr-telas-site-1a6e8daf3cdb` (o mesmo do `piloto-01`), servido
por `govbr-telas/server.mjs`, entrada `/solicitacao.html`, janela 1280×900, Chromium sem interface,
estado S0 (depois do `waitFor` da referência, antes de qualquer interação).

**Como cada área é julgada:**

- **Cabeçalho.** Procura-se a raiz do componente Header do DS (classe `br-header`, a do exemplo de
  código da página pública do componente) e qualquer região de cabeçalho da página (`header`,
  `[role=banner]`). *Presente e conforme*: existe uma raiz `br-header` visível, antes da área de
  conteúdo na ordem do documento. *Não conforme*: há região de cabeçalho, mas sem o componente
  Header. *Ausente*: nem uma nem outra.
- **Conteúdo.** Procura-se a região principal (`main`, `[role=main]`). *Presente e conforme*: existe
  exatamente uma, visível, com o conteúdo da página. *Ausente*: nenhuma.
- **Rodapé.** Procura-se a raiz do componente Footer do DS (classe `br-footer`) e qualquer região de
  rodapé da página (`footer`, `[role=contentinfo]`). *Presente e conforme*: existe uma raiz
  `br-footer` visível, depois da área de conteúdo. *Não conforme*: há região de rodapé, mas sem o
  componente Footer. *Ausente*: nem uma nem outra.

**Âncora da spec, quando houver.** Área ausente não tem elemento próprio: a âncora é `body` (o
documento), escopo `unico`, `expectedCount` 1, estado `sempre`. Área não conforme ancora na região
que existe. Ids `P-01`, `P-02`… (camada de página), na ordem da tabela de anatomia.

## 4. Medição e veredito

*(acrescentada depois da medição, 2026-10-03)*

**Como foi medido.** `node govbr-telas/server.mjs --port 3301` (o servidor confere o sha256 de cada
arquivo contra `site-manifest.json`; item `govbr-telas-site-1a6e8daf3cdb`), Playwright + Chromium sem
interface, janela 1280×900, `/solicitacao.html`, espera por `.linhas-anteriores tr`. Contagens por
`document.querySelectorAll`, posição por `getBoundingClientRect`, visibilidade por tamanho não nulo e
`display`/`visibility` computados. As contagens foram repetidas nas três paradas da referência
(inicial, apos-envio-vazio, dialogo-aberto), com o mesmo resultado.

Filhos do contêiner da aplicação, em ordem: `nav.br-skiplink.atalho-conteudo` ·
`header.barra-superior` · `nav.br-breadcrumb.trilha-servico` · `main.area-solicitacao`. Nada depois
do `main`.

| Área | Medida (S0; igual em S1 e S2) | Veredito |
|---|---|---|
| Cabeçalho | `.br-header`: 0. `header, [role=banner]`: 1 — `header.barra-superior`, visível, x 0 · y 0 · 1280×51,8 px, conteúdo inteiro: `<a class="marca-govbr" aria-label="gov.br — página inicial"><span aria-hidden="true">gov</span><strong>.br</strong></a>` | **não conforme** — há região de cabeçalho, mas sem o componente Header |
| Conteúdo | `main, [role=main]`: 1 — `main.area-solicitacao`, visível, x 160 · y 107,8 · 960×1717,4 px, 1048 caracteres de texto (o formulário e o histórico) | **presente e conforme** |
| Rodapé | `.br-footer`: 0. `footer, [role=contentinfo]`: 0 | **ausente** |

Áreas não obrigatórias pelo texto, só registradas (sem julgamento, sem spec): Localização —
`.br-breadcrumb` 1, entre o cabeçalho e o `main`; Navegação — `.br-menu` 0; skip link —
`.br-skiplink` 1.

### Specs que entram na 2.0.0

| Id | Área | Âncora | Escopo · estado | Unidades |
|---|---|---|---|---|
| P-01 | Cabeçalho (não conforme) | `header.barra-superior` | `unico` · `sempre` | 1 |
| P-02 | Rodapé (ausente) | `body` | `unico` · `sempre` | 1 |

Sem predicado de aceitação: nenhuma espécie de `scripts/acceptance-predicates.ts` mede ausência de
um elemento, e o predicado não foi estendido para isto. `rules` fica vazio: as regras da base do
oráculo não foram abertas (cegueira), e a decisão de crédito é semântica de qualquer modo (D-39).
`npm run conferir:referencia -- --tela solicitacao` contra o site congelado: verde, 14 specs,
16 unidades.

**Limitação.** P-02 ancora no `body`. Pela regra de casamento da 1.5.0 (D-84), toda alegação com
evidência dentro da página passa a ter P-02 como candidata; cabe à revisora conferir que a alegação
é a falta do rodapé.
