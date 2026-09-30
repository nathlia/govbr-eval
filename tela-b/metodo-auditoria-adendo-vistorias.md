# Tela B — adendo ao método para a tela Vistorias (2026-09-30)

**Status:** adendo escrito antes de qualquer julgamento da tela `vistorias` (D-57). O método de
`5838702` (`metodo-auditoria.md`) vale integralmente, salvo o que este adendo troca. O commit deste
arquivo é registrado no início de `tela-b/vistorias/auditoria.md`; desvio posterior é escrito lá.

## A. O que muda no método

**§ 0 (nunca medida por agente).** Mesma conferência só por nomes, com `vistorias|pnip`: log de
todos os ramos do `govbr-eval`, `results/` (`runs-vistorias*`, `semantic-review-vistorias`),
`pipeline/` até a 3ª profundidade, validator e corpus. Esperado: só integração e instrumento (`e4d644b`, `1cb499b`,
`5a3c3f8`, `tela-b/vistorias-integracao/`, sem modelo). Outro nome qualquer é escalado antes de seguir.

**§ 1 (objeto).** O objeto é a árvore `govbr-corpus/public/pnip/` (commit `5a3c3f8`), não quatro
arquivos. `conferir-auditoria.mjs` recalcula o sha256 de **cada** arquivo listado em
`pnip/manifesto.json`, recusa medir se algum divergir ou se houver arquivo fora do manifesto, e grava
o sha256 do próprio manifesto em `auditoria.md`. Entrada: `/pnip/portal-mpa/vistorias?mock-perfil=mpa`,
servida pela superfície (fallback de SPA e o alias do ícone "Sair", `telas.json › vistorias.isolamento.site`).
Condições: as da bateria (1280×900, Chromium do Playwright do `govbr-eval`, Node 25.2.1, fuso
`America/Sao_Paulo`, "hoje" congelado 2026-03-16 09:30); `externos: []`, então **qualquer**
requisição fora da origem é falha de medida, não estado. Cada medida parte de carga nova (recarregar
zera a loja).
**Versões:** inalterado (lockfile: core 3.4.1, webcomponents 1.16.0; norma KB 3.7.0); a prova de
materialização do § 1 é medida nos CSS/bundles da árvore `pnip/`.

**§ 9 (recuo).** Não há página de recuo. Se a referência sair fina pelos mesmos limiares (< 8
unidades, < 3 famílias ou < 4 conformes), a autora decide entre rodar declarando baixa resolução ou
encerrar a tela B. Não se abre outra rota do PNIP como tela: uma tela = uma entrada.

## B. Escopo de estados — a decisão central

**O instrumento (`govbr-eval` `1cb499b`, D-58; `docs/semantic-scoring.md` › segmentos).** Uma
sequência linear `_meta.setup` (`click`/`fill`/`wait`/`navigate`), paradas em `_meta.states`
(`afterStep`; a primeira em 0, a última no fim). `navigate` (`selector` ou `path` da mesma origem,
`waitFor` obrigatório, nunca recarga) abre um **segmento**; aditividade e `conditional` são cobrados
só dentro dele; com navegação, toda parada declara `path` (pathname), medido junto com recarga e troca
de endereço sem `navigate`. A identidade é o caminho estrutural (`keyOf`). Daí:
1. **Outras rotas do mesmo fluxo valem** (decisão D-58): detalhe `agendar-vistoria/:uuid`, edição de
   dados, etapas do preenchimento, editor do laudo, alcançadas **só** por `navigate` da mesma origem,
   sem recarga. Continua uma tela = uma entrada (`_meta.url` é a lista).
2. **Abas não são estado.** `#AGENDAR`/`#CONCLUIDOS` trocam as linhas sem mudar o endereço: não há
   `navigate` a declarar, e a troca é não aditiva (ou passa em silêncio com linhas diferentes sob a
   mesma chave). O componente de abas é auditado em `inicial`. O mesmo vale para página da
   paginação, "Exibir N" e filtro aplicado: auditados como componentes, nunca pelas vistas que dão.
   Esses passos só podem aparecer como **trânsito** depois da última parada de um segmento.
3. **Diálogo é a última parada do seu segmento.** Fechá-lo apaga o que ele ancorou; o fechamento,
   se preciso, é trânsito antes do `navigate` seguinte.

**Regra de escolha (fixada aqui, antes de procurar defeito; nada nela olha para defeito).**
1. O teste de estados do método § 2 roda na entrada e em cada rota alcançável por clique a partir
   dela, com gatilhos enumerados mecanicamente (light DOM + shadow roots abertas, mais `br-tag` e
   controles da barra de filtros). Hidratação: `waitFor` da rota e `customElements.whenDefined` dos
   `br-*` presentes.
2. **Candidato** = vista que (i) não dispara escrita no mock (nenhum `POST`/`DELETE` do README-MOCK
   § 8.3, lido no log de requisições; só `GET`), (ii) repete 3/3, (iii) é aditiva dentro do segmento
   ou abre segmento por `navigate`, (iv) não é do tipo do item 2 acima, (v) é alcançável a partir da
   entrada, em carga nova, com **≤ 4 passos** de `setup` contados **a partir do início do seu
   segmento** (um segmento pode abrir com `navigate` por `path`, o que permite encadear todas as
   escolhidas numa sequência só; decisão do orquestrador, D-58), e (vi) não
   depende da popup de assinatura. Para a rota de detalhe, a vistoria é a da primeira linha da aba
   padrão que oferece a ação (desempate: ordem no documento); `navigate` por clique é preferido a `path`.
3. **Cobertura** = tipos do inventário do § 3.1: componente do DS (classe/tag `br-*` ou anatomia
   equivalente) e estrutura de página (regiões, título, formulário com validação, `dialogo` =
   `role=dialog|alertdialog` ou sobreposto modal). Vista só vira estado se tornar **visível** ao menos
   um tipo que nenhuma parada escolhida mostrou.
4. **Ordem gulosa:** entra a vista com mais **componentes do DS** novos; empate → mais estruturas
   novas; empate → menos passos; empate → ordem do documento. Diálogos SweetAlert2 (UI autoral, fora
   do DS) são elegíveis como estrutura e, por isso, ficam abaixo de qualquer vista que traga
   componente do DS novo. O `br-modal` "Trocar embarcação" é elegível e entra se acrescentar tipo.
5. **Uma parada por segmento de rota**, mais uma de diálogo nesse segmento só se o diálogo trouxer
   componente do DS novo.
6. **Teto: 6 estados** (`inicial` + 5). Tela A tem 3; acima disso cada estado multiplica inventário
   e re-medida sem somar componente, e um agente numa sessão não o percorre.
7. As escolhidas são encadeadas numa sequência só (segmentos em ordem de profundidade na aplicação;
   em cada um, a parada comum antes do diálogo). O que sobrar (fora do teto, não aditivo, 2/3, > 4
   passos, com escrita) vai para `auditoria.md` e `_meta.fora_de_escopo`, com o motivo.

Sabido sem julgar: os diálogos da lista (excluir, notificar, exportar, datas) são SweetAlert2; o
`br-modal` do DS aparece no detalhe. A lista final sai do teste, não deste texto.

**Bateria (D-58).** Pacote, linha de base, manifesto de coleta e todo `preparePage` ainda
**recusam** referência com vários segmentos; só a auditoria e `conferir:referencia` a medem. A cena
multi-segmento tem de existir antes de qualquer bateria na `vistorias`; a auditoria não espera por ela.

## C. Defeitos do app original × artefatos do mock

**Entram como qualquer comportamento autoral** (não são `fundo`: foram escritos pelo projeto, não
pelo DS), se uma norma do § 3.2 os cobre, **no estado em escopo** em que se manifestam: README-MOCK
§ 8.6 — tabela que passa de 1280 px, "Selec" truncado no "Exibir", aviso de término anterior ao
início que nunca dispara, "Exibir 25/50" esvaziando a lista em página > 1, filtro do cliente pelo
primeiro caractere, "Hora da vistoria" vazia (detalhe). Cada um só conta se visível numa parada
escolhida pelo § B. Sem norma aplicável → registro, não unidade.
**Fora, por serem do mock:** conteúdo das fixtures; popup de assinatura (`autorizador-govbr.ts`) e
o prefixo do `redirect_uri`; suposições do § 8.5 e recusa do laudo vazio; relógio; respostas do
interceptor. Medi-los julgaria o substituto, não a tela do projeto.
**Fundo:** código do DS 3.4.1/1.16.0, interno de bibliotecas de terceiros (Summernote, SweetAlert2 —
a escolha e a configuração delas pelo app são autorais) e perdas da isolação (fontes, ícones).

## D. Dados fictícios

Texto de células, nomes e datas vem de fixtures inventadas: redação e linguagem sobre ele ficam fora
(§ 6). Entram as normas estruturais: cabeçalhos da tabela e sua associação, nome acessível da
tabela, anatomia de `br-tag`/status e da paginação (rótulos dos controles, página atual), estado
vazio/carregando se visível numa parada. Texto fixo do template é autoral e segue o § 6 (escalada).

## E. Exposição declarada (marca `exposto`)

Antes da auditoria, quem escreve este adendo e quem audita já leram: D-56 e D-57; README-MOCK § 8
inteiro (§ 8.4 validações, § 8.6 defeitos listados em C); `tela-b/vistorias-integracao/percurso.mjs`
(o que ele mede, não as capturas PNG — quem as tiver visto declara em `auditoria.md`); e, para este
adendo, a lista de tags `br-*` do template da lista e o uso de SweetAlert2 no componente. O casco da
aplicação (`br-header`, sem salto para o conteúdo, ordem de títulos, rodapé ausente) é o mesmo das
páginas do D-54..D-56: unidade que coincida com aqueles achados é `exposto`. Toda unidade cujo par
(elemento, norma) coincida com algo desta lista leva `exposto`, e o recall é dado com e sem elas.

## F. Entregáveis e portão

Como o § 8 do método, trocando nomes: `govbr-eval/tela-b/vistorias/auditoria.md`,
`decisoes.json` (tabela elemento × norma × veredito), `inventario.json` (por estado),
`conferir-auditoria.mjs` (**headless por padrão**, `--headed` opcional; confere o manifesto inteiro,
serve pela superfície, alcança cada estado pelo **mesmo** `setup` da referência, confirma em cada
parada o `path` declarado, nenhuma recarga e nenhuma escrita no mock, e re-mede cada unidade e cada
conforme, `N/N`); `govbr-eval/ground-truth-vistorias.json` 1.0.0 com `_meta.url` =
`/pnip/portal-mpa/vistorias?mock-perfil=mpa`, `waitFor`, `viewport`, `setup`, `setup_rationale`,
`states` (com `path`), `conformes`, `fundo`, `fora_de_escopo` (vistas excluídas), `nunca_agregar_com`,
`baselines`, `version_note`; `telas.json › vistorias.reference` e `isolamento.interacao` atualizados.
Como o caminho estrutural não distingue linha trocada de linha mantida, `conferir-auditoria.mjs`
também confere, para cada âncora, que texto e atributos não mudaram entre paradas do mesmo segmento.
**Portão**, nesta ordem: `node tela-b/vistorias/conferir-auditoria.mjs` N/N; re-medida do segundo
agente sem divergência aberta; `npm run conferir:referencia -- --tela vistorias`; `npm run
test:isolation -- --tela X` para `fluxo`, `solicitacao` e `vistorias`; ratificação da autora no log.
