# Tela D — adendo ao método para a tela "Processos" do portal MPA (2026-10-18)

**Status:** **final**, congelado em 2026-10-18 antes da auditoria (fase 2) e antes de qualquer
julgamento da tela D; o rascunho foi escrito **antes do teste de estados**, e só esta linha de status
mudou desde então. A tela D substitui a tela C (`cadastrar-empresa`), que ficou abaixo do piso
(eval `b469118`: 3 specs não expostas, 1 família). Preparação = a fase 1 da C, repetida
(`thesis-workspace/planejamento/atual/plano-tela-c-2026-10-18.md` §1–§3, §7, §11). Vale o método da
tela B (`tela-b/metodo-auditoria.md`, commit `5838702`) com o adendo da Vistorias
(`tela-b/metodo-auditoria-adendo-vistorias.md`, `9406aed`), salvo o que este adendo troca. Decisões
já tomadas (`decisoes-do-assistente` 2026-10-18): universo normativo = base normalizada de 186 regras
(`ds-rules/06`, a mesma da B e da C) + e-MAG; nenhuma parada escolhida sabendo o que o oráculo
verifica (nenhuma parada só de validação). Commitado sozinho, antes da auditoria; desvio posterior é
escrito em `tela-d/auditoria.md`, nunca reescrito aqui.

## A. O que muda no método

**§ 0 (nunca medida por agente).** Mesma conferência só por nomes, com `processos|pnip-d|tela-d`:
log de todos os ramos do `govbr-eval`, `results/`, `pipeline/` até a 3ª profundidade,
`govbr-ds-validator` e `govbr-corpus`. "processos" é palavra comum (há telas e fixtures de processos
em outros contextos): só conta como medida prévia o que se refere à rota `/portal-mpa/processos`
servida de `pnip-d/`. Esperado: só o que a fase 1 da D criou (`telas.json › processos`, `tela-d/`,
`vite.config.ts`, a ala `pnip-d/`). Qualquer outro achado é escalado antes de seguir.

**§ 1 (objeto).** A árvore `govbr-corpus/public/pnip-d/` (build do `pnip-mock` com base href
`/pnip-d/`), conferida arquivo a arquivo contra `pnip-d/manifesto.json`. Na fase 1 (antes do commit
do `pnip-mock`) o objeto é o build candidato `pnip-mock/dist/pnip-d/`, identificado pelo sha256 da
lista "caminho⇥sha256" dos 190 arquivos; o inventário da fase 1 só vale para a auditoria se essa
lista for idêntica à do manifesto congelado (`tela-d/comum.mjs › conferirBytes`). Entrada:
`/pnip-d/portal-mpa/processos?mock-perfil=mpa` (sessão fictícia de coordenadora com o vínculo que o
login e a página inicial gravariam, README-MOCK § 1). Espera: `main .br-table tbody tr`. Condições:
as da bateria (1280×900, Chromium do Playwright do `govbr-eval`, Node 25.2.1, fuso
`America/Sao_Paulo`, "hoje" congelado 2026-03-16 09:30, `externos: []`, carga nova por medida).
Versões: inalteradas (core 3.4.1, webcomponents 1.16.0; norma KB 3.7.0 normalizada, 186 regras).

**§ 9 (piso).** O mesmo da C, fixado antes da auditoria (protocolo NAT-78 § 3.5, C5): **≥ 8 specs**,
specs em **≥ 3 das 4 famílias normativas** (F1 componente, F2 página/Template Base, F3 fundamentos,
F4 e-MAG), unidades sobre **≥ 3 tipos de componente do DS** diferentes, e **≥ 4 controles conformes**
declarados — tudo sem as unidades `exposto`. Abaixo do piso não há rota de reserva: a autora decide
derrubar a tela (protocolo § 9, corte 2).

**Triagem de riqueza (feita antes deste adendo, declarada).** Para decidir se a rota nº 5 valia a
preparação, a fase 1 mediu, **só por estrutura e sem norma nem detector**, a parada inicial com o
inventário da B (`tela-d/inventariar.mjs`): elementos, tipos `br-*`, campos, focáveis, cabeçalhos,
marcos e quanto é casco compartilhado. Nenhum veredito foi formado; a escolha da rota por ser "rica
o bastante para medir detecção" é legítima porque não usa a saída de nenhum detector.

## B. Escopo de estados — regra fixada antes do teste

A regra é a do adendo da C (`tela-c/metodo-auditoria-adendo-cadastrar-empresa.md` § B, final,
sha256 `42b2246a…3838c`), **literal**; só os exemplos entre parênteses foram trocados pelos da rota
`processos` (lidos do template, não do teste).

1. **Uma tela = uma rota.** A tela D é a rota `portal-mpa/processos`. Gesto que navega para
   outra rota (breadcrumb, "Exportar", "Voltar", número do processo, "Ver processo", "Assumir", menu
   do avatar) é registrado e fica **fora**: nenhum `navigate` no `setup`, um só segmento.
2. **Gatilhos**, enumerados mecanicamente no light DOM e em toda shadow root aberta: os da tela B
   (`button`, `a[href]`, `[role=button|menuitem|tab|option]`, `[aria-expanded]`,
   `[aria-haspopup]`, `[aria-controls]`, `[data-toggle]`, `[tabindex]`, `.br-sign-in`,
   `.br-avatar`) **mais os campos de formulário** (`input`, `select`, `textarea`, exceto
   `type=hidden`).
3. **Gestos:** clique real e `Enter` com foco (como na B) e, só para campos, **saída de campo**
   (foco + `Tab`). Preencher com valor **não** é gesto do teste: exigiria escolher dados, e a escolha
   seria do auditor. As vistas que só um valor alcança (termo de pesquisa, página digitada) ficam fora
   e são registradas.
4. **Candidato** = vista que (i) não dispara escrita no mock (nenhum `POST` lido no log do mock e de
   rede), (ii) repete 3/3 em cargas novas, (iii) mantém o endereço, (iv) é aditiva em relação à
   parada anterior (nenhum elemento presente some ou deixa de ser visível), (v) não troca conteúdo
   no lugar (as abas "Aguardando análise"/"Tramitando"/"Concluídos", "Meus processos", filtros
   aplicados e troca de página recarregam a lista: não são estado; o componente é auditado em
   `inicial`), e (vi) é alcançável com ≤ 4 passos de `setup`.
5. **Cobertura e ordem gulosa:** as da tela B (adendo § B, regras 3 e 4): tipos = componente do
   DS (tag/classe `br-*`) e estrutura de página (regiões, títulos, formulário, campo, mensagem,
   lista, `dialogo` = `role=dialog|alertdialog` ou sobreposto modal); entra a vista com mais
   componentes do DS novos; empate → mais estruturas novas → menos passos → ordem do documento.
   Diálogo SweetAlert2 é estrutura (UI autoral fora do DS), abaixo de qualquer vista que traga
   componente do DS novo.
6. **Um só segmento, várias paradas** (como a tela A, que tem três): as paradas escolhidas são
   encadeadas na ordem da escolha, com o diálogo, se houver, por último. Diálogo só entra se trouxer
   **componente do DS novo** (regra 5 do adendo da B, literal). A cadeia inteira é re-medida
   (aditividade parada a parada, 3/3, estável por 1 s, sem recarga nem escrita); vista que quebre a
   cadeia sai, com o motivo, e a escolha segue com a próxima. **Teto: 4 paradas** (`inicial` + 3).
7. O que sobrar vai para `auditoria.md` e `_meta.fora_de_escopo`, com o motivo.

O script de escolha (`tela-d/selecionar-estados.mjs`) é o da C, sem mudança de lógica.

## C. Defeitos do app original × artefatos do mock

Como o adendo da B § C. **Entram** os comportamentos autorais visíveis numa parada escolhida, se
uma norma do § 3.2 os cobre. **Fora, por serem do mock:** o conteúdo devolvido pelo manipulador
só-leitura `processos-mpa` (lista de processos, nomes, números, datas, status, opções dos filtros
"Espécie alvo"/"Método de pesca"/"Petrecho"; README-MOCK § 10), a sessão semeada, o relógio
congelado (e o que deriva dele: "Última atualização", "Aberto há"), as respostas do interceptor às
ações da linha (assumir, desassociar, assinar não têm manipulador), e o efeito do base href
`/pnip-d/` sobre caminhos absolutos do app (README-MOCK § 3.2–3.3). **Fundo:** código do DS
3.4.1/1.16.0, interno do SweetAlert2, perdas da isolação (fontes, ícones).

## D. Dados fictícios

Como o adendo da B § D: texto vindo do manipulador fica fora de redação; texto fixo do template é
autoral e segue o método § 6 (escalada).

## E. Exposição declarada (marca `exposto`)

Antes da auditoria já foram lidos, pelo agente da fase 1 da D: o template e o componente
`processos.component.{html,ts}` inteiros, os serviços que eles chamam, os rótulos de
`StatusSolicitacaoLabelUtils`, `README-MOCK.md` § 7 (lista de componentes da rota nº 5), a captura
da parada inicial (página inteira, 1280 px) e o resumo da triagem de riqueza (§ A). **O auditor da
fase 2 não é esse agente**: é um agente em contexto novo, que não abre `pnip-mock/src/` nem as
capturas, e lê do plano só o procedimento. O casco da aplicação (`br-header`, salto, `<title>`
"PNIP", rodapé ausente) é o mesmo das telas B e C: unidade que coincida com os achados registrados
lá (B-01, B-25, C-xx etc.) é `exposto`, e o recall é dado com e sem elas. A tela C foi auditada
(`b469118`) e a auditoria dela é exposição para este casco; quem a leu não audita a D.

## F. Entregáveis e portão

Como o adendo da C § F, trocando os nomes: `tela-d/auditoria.md`, `tela-d/decisoes.json`,
`tela-d/inventario.json` (por parada), `tela-d/conferir-auditoria.mjs` (headless, N/N),
`ground-truth-processos.json` 1.0.0, `telas.json › processos.reference`. **Portão**, nesta ordem:
`conferir-auditoria` N/N; re-medida do segundo agente sem divergência aberta; `npm run
conferir:referencia -- --tela processos`; decisões da autora sobre a lista escalada; **só depois** do
congelamento, `test:isolation` e qualquer detector na tela D.
