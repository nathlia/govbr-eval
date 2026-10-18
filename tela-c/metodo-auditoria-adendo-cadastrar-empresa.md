# Tela C — adendo ao método para a tela "Cadastrar empresa" (2026-10-18)

**Status:** **final**, congelado em 2026-10-18 antes da auditoria (fase 2) e antes de qualquer
julgamento da tela C; o rascunho foi escrito antes do teste de estados (D-134; plano
`thesis-workspace/planejamento/atual/plano-tela-c-2026-10-18.md`). O sha256 deste arquivo está no
plano (§ 4). A regra de escolha de paradas (§ B) não mudou desde o rascunho. Vale o método da
tela B (`tela-b/metodo-auditoria.md`, commit `5838702`) com o adendo da Vistorias
(`tela-b/metodo-auditoria-adendo-vistorias.md`, `9406aed`), salvo o que este adendo troca. Ele é
commitado sozinho, antes da auditoria (fase 2); o commit fica registrado no início de
`tela-c/auditoria.md`, e desvio posterior é escrito lá, nunca reescrito aqui.

## A. O que muda no método

**§ 0 (nunca medida por agente).** Mesma conferência só por nomes, com
`cadastrar-empresa|pnip-c|form-empresa`: log de todos os ramos do `govbr-eval`, `results/`,
`pipeline/` até a 3ª profundidade, `govbr-ds-validator` e `govbr-corpus`. Esperado: só o que a fase 1
criou (`telas.json`, `tela-c/`, `scripts/congelar-pnip.mjs`, `vite.config.ts`, a ala `pnip-c/`).
Qualquer outro nome é escalado antes de seguir.

**§ 1 (objeto).** A árvore `govbr-corpus/public/pnip-c/` (build do `pnip-mock` com base href
`/pnip-c/`), conferida arquivo a arquivo contra `pnip-c/manifesto.json`. Na fase 1 (antes do commit
do `pnip-mock`) o objeto é o build candidato `pnip-mock/dist/pnip-c/`, identificado pelo sha256 da
lista "caminho⇥sha256" dos 190 arquivos; o inventário da fase 1 só vale para a auditoria se essa
lista for idêntica à do manifesto congelado (`tela-c/comum.mjs › conferirBytes`). Entrada:
`/pnip-c/portal-admin/empresas/cadastrar-empresa?mock-perfil=admin`. Condições: as da bateria
(1280×900, Chromium do Playwright do `govbr-eval`, Node 25.2.1, fuso `America/Sao_Paulo`, "hoje"
congelado 2026-03-16 09:30, `externos: []`, carga nova por medida). Versões: inalteradas (core
3.4.1, webcomponents 1.16.0; norma KB 3.7.0).

**§ 9 (piso).** Fixado antes da auditoria (protocolo NAT-78 § 3.5, C5): **≥ 8 specs**, specs em
**≥ 3 das 4 famílias normativas** (F1 componente, F2 página/Template Base, F3 fundamentos, F4 e-MAG)
e unidades sobre **≥ 3 tipos de componente do DS** diferentes, e **≥ 4 controles conformes**
declarados. As três condições contam sem as unidades marcadas `exposto`. Abaixo do piso: a autora
decide entre a rota nº 5 (`/portal-mpa/processos`, nova auditoria inteira) e derrubar a tela C
(protocolo § 9, corte 2).

## B. Escopo de estados — regra fixada antes do teste

1. **Uma tela = uma rota.** A tela C é a rota `empresas/cadastrar-empresa`. Gesto que navega para
   outra rota (breadcrumb, "Cancelar", "Salvar" com formulário válido, menu do avatar) é
   registrado e fica **fora**: nenhum `navigate` no `setup`, um só segmento. (A rota
   `empresas/editar/:uuid` usa o mesmo componente, mas não é alcançável por clique a partir da
   entrada; fica fora e é registrada como o que mostraria a tabela de usuários com `br-switch`.)
2. **Gatilhos**, enumerados mecanicamente no light DOM e em toda shadow root aberta: os da tela B
   (`button`, `a[href]`, `[role=button|menuitem|tab|option]`, `[aria-expanded]`,
   `[aria-haspopup]`, `[aria-controls]`, `[data-toggle]`, `[tabindex]`, `.br-sign-in`,
   `.br-avatar`) **mais os campos de formulário** (`input`, `select`, `textarea`, exceto
   `type=hidden`).
3. **Gestos:** clique real e `Enter` com foco (como na B) e, só para campos, **saída de campo**
   (foco + `Tab`), porque o formulário mostra validação ao tocar o campo. Preencher com valor
   **não** é gesto do teste: exigiria escolher dados, e a escolha seria do auditor. As vistas que só
   um valor alcança (consulta de CEP, CNPJ, CPF, máscara inválida) ficam fora e são registradas.
4. **Candidato** = vista que (i) não dispara escrita no mock (nenhum `POST` lido no log do mock e de
   rede), (ii) repete 3/3 em cargas novas, (iii) mantém o endereço, (iv) é aditiva em relação à
   parada anterior (nenhum elemento presente some ou deixa de ser visível), (v) não troca conteúdo
   no lugar (as abas "Usuário Existente"/"Cadastrar Usuário" trocam o painel: não são estado; o
   componente de abas é auditado em `inicial`), e (vi) é alcançável com ≤ 4 passos de `setup`.
5. **Cobertura e ordem gulosa:** as da tela B (adendo § B, regras 3 e 4): tipos = componente do
   DS (tag/classe `br-*`) e estrutura de página (regiões, títulos, formulário, campo, mensagem,
   lista, `dialogo` = `role=dialog|alertdialog` ou sobreposto modal); entra a vista com mais
   componentes do DS novos; empate → mais estruturas novas → menos passos → ordem do documento.
   Diálogo SweetAlert2 é estrutura (UI autoral fora do DS), abaixo de qualquer vista que traga
   componente do DS novo.
6. **Um só segmento, várias paradas** (como a tela A, que tem três): as paradas escolhidas são
   encadeadas na ordem da escolha, com o diálogo, se houver, por último. Diálogo só entra se trouxer
   **componente do DS novo** (regra 5 do adendo da B, literal; esclarecido depois de ler a saída do
   teste de estados e antes de rodar a escolha — o rascunho anterior não repetia essa condição). A cadeia inteira é
   re-medida (aditividade parada a parada, 3/3, estável por 1 s, sem recarga nem escrita); vista
   que quebre a cadeia sai, com o motivo, e a escolha segue com a próxima. **Teto: 4 paradas**
   (`inicial` + 3).
7. O que sobrar vai para `auditoria.md` e `_meta.fora_de_escopo`, com o motivo.

## C. Defeitos do app original × artefatos do mock

Como o adendo da B § C. **Entram** os comportamentos autorais visíveis numa parada escolhida, se
uma norma do § 3.2 os cobre. **Fora, por serem do mock:** conteúdo das fixtures
(`portal-admin-empresas.json`: módulos, permissões, três usuários fictícios, respostas de CEP, CNPJ,
CPF e salvar), a sessão semeada, o relógio, as respostas do interceptor e o stub do Google Maps (o
geocodificador nunca responde, então "Coordenadas" e o mapa ficam vazios — em produção o mapa
apareceria depois do CEP, e sem coordenadas o formulário nunca fica válido), e o efeito do base href
`/pnip-c/` sobre caminhos absolutos do app (o breadcrumb "Home"/"Empresa" monta `/portal-admin...`
sem o prefixo e recarrega o documento fora da ala — medido no teste de estados; em produção o app
fica na raiz, como o README-MOCK § 3.2–3.3 já registra para a ala `pnip/`). **Fundo:** código do DS 3.4.1/1.16.0, interno do SweetAlert2 e do
`ngx-mask`, perdas da isolação (fontes, ícones).

## D. Dados fictícios

Como o adendo da B § D: texto vindo de fixture fica fora de redação; texto fixo do template é autoral
e segue o método § 6 (escalada).

## E. Exposição declarada (marca `exposto`)

Antes da auditoria já foram lidos, por quem preparou a fase 1 (o assistente orquestrador e o agente
da fase 1): o template e o componente `form-empresa` inteiros (`pnip-mock/src/app/shared/empresa/`),
`README-MOCK.md` § 7 (lista de componentes da rota nº 3), o protocolo NAT-78 § 3.4 (a mesma lista), e
a captura de tela da parada inicial. **O auditor da fase 2 não é esse agente**: é um agente em
contexto novo, que não abre `pnip-mock/src/` nem as capturas, e lê do plano só o procedimento. O
casco da aplicação (`br-header`, salto, ordem de títulos, rodapé ausente, `<title>` "PNIP") é o
mesmo das telas B e das páginas do D-54..D-56: unidade que coincida com os achados registrados lá
(B-01, B-25 etc.) é `exposto`, e o recall é dado com e sem elas.

## F. Entregáveis e portão

Como o adendo da B § F, trocando os nomes: `tela-c/auditoria.md`, `tela-c/decisoes.json`,
`tela-c/inventario.json` (por parada), `tela-c/conferir-auditoria.mjs` (headless; confere o
manifesto inteiro, serve pela superfície, alcança cada parada pelo **mesmo** `setup`, e re-mede
cada unidade e cada conforme, `N/N`), `ground-truth-cadastrar-empresa.json` 1.0.0 (`_meta.url` =
a entrada, `waitFor`, `viewport`, `setup`, `setup_rationale`, `states`, `conformes`, `fundo`,
`fora_de_escopo`, `classes` pré-registradas por spec (protocolo § 5.3), `nunca_agregar_com`,
`baselines`, `version_note`), `telas.json › cadastrar-empresa.reference`. **Portão**, nesta ordem:
`conferir-auditoria` N/N; re-medida do segundo agente sem divergência aberta; `npm run
conferir:referencia -- --tela cadastrar-empresa`; decisões da autora sobre a lista escalada; **só
depois** do congelamento, `test:isolation` e qualquer detector na tela C.
