# Tela C (Cadastrar empresa) — auditoria por medição (passada 1)

**Método:** `tela-b/metodo-auditoria.md` (`5838702`) + adendo da B (`9406aed`) + adendo da C
`tela-c/metodo-auditoria-adendo-cadastrar-empresa.md`, **finalizado antes desta auditoria**
(2026-10-18; só o cabeçalho de status mudou; regra de paradas intacta), **sha256
`42b2246a4cf745f64abb752263a3ad0c28dfed483e2075fa6e7a0f849e53838c`** (árvore de trabalho, LF),
gravado no plano (`plano-tela-c-2026-10-18.md` § 4). **Ainda não commitado** — o auditor não commita;
o adendo deve ser commitado SOZINHO antes dos arquivos desta auditoria (adendo, cabeçalho).
HEAD `govbr-eval` `43aafdf` (fase 1); `govbr-corpus` `c6388c4` (ala `pnip-c/` congelada).
**Executada em:** 2026-10-18, por agente LLM (Claude), em contexto novo, sem o oráculo, sob o D-48.
**Status:** referência **candidata** (`ground-truth-cadastrar-empresa.json` `1.0.0-candidata`),
**abaixo do piso** (§ 11). Faltam: re-medida do segundo agente, decisões da autora (§ 8 /
`recomendacoes-escaladas.md`) e a decisão L2. `telas.json › cadastrar-empresa.reference` = `null`.

| Arquivo (`govbr-eval/`) | O que é |
|---|---|
| `tela-c/comum.mjs`, `sequencia.mjs`, `teste-estados.mjs`, `selecionar-estados.mjs`, `conferir-paradas.mjs`, `inventariar.mjs` | fase 1 (inalterados) |
| `tela-c/inventario.json` | inventário **re-medido na árvore congelada** (§ 4) |
| `tela-c/montar-decisoes.mjs` → `decisoes.json` | tabela regra × veredito, 186 linhas |
| `tela-c/sortear-conformes.mjs` → `conformes.json` | controles conformes (sorteio com semente fixa) |
| `tela-c/conferir-auditoria.mjs` → `evidencia/*.json` | conferência sem modelo, N/N, e a evidência de cada spec/controle |
| `tela-c/recomendacoes-escaladas.md` | a lista para a autora, com recomendação |
| `ground-truth-cadastrar-empresa.json` | referência candidata |

## 0. A tela nunca foi medida por agente — conferido pelos nomes

`cadastrar-empresa|pnip-c|form-empresa`, só nomes: `git -C govbr-eval log --all --name-only` → só
`tela-c/` e `telas.json` da fase 1 (`43aafdf`); `results/` e `pipeline/` até a 3ª profundidade:
nada; `govbr-ds-validator` (todo o histórico): nada; `govbr-corpus`: só a ala `pnip-c/` (`c6388c4`).
Nada fora do esperado pelo adendo; nada escalado.

## 1. Objeto, condições e universo normativo

Árvore `govbr-corpus/{public,dist}/pnip-c/`: **190/190** arquivos do manifesto, nenhum fora;
**sha256 de `pnip-c/manifesto.json`: `c847e6be97f913ff1841ef60f3251258f8de0ef4d8051cd45987a2e5de38f7e4`**;
lista caminho⇥sha256 = **`041c9ed8…92baf`**, a mesma do candidato medido na fase 1 (o inventário da
fase 1 vale). Condições: as de `tela-c/comum.mjs` (1280×900, Chromium do Playwright do `govbr-eval`,
headless, fuso `America/Sao_Paulo`, Node 25.2.1, toda saída abortada: **0** externos, **0** escritas,
**0** chamadas sem fixture em todas as medidas).

**Universo:** a base normalizada 3.7.0 de 186 regras + e-MAG 3.1 (decisão E-0 do plano: igual à B),
lida da cópia `ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/` (`rules.jsonl` sha256
`5cac5fee9a6871bed9283d8c9714a2480adb50225aaa0d304f0ec337b80a2c56`). **Desvio de caminho:** o método
aponta `govbr-ds-validator/data/knowledge/…`, que o auditor cego não abre; o conjunto dos 186 ids é
idêntico ao de `tela-b/vistorias/decisoes.json` (conferido). Texto de norma lido: `rules.jsonl`,
`accessibility/emag.json`, `components/message.json`, `tokens/colors.json`,
`examples/html/{select,tab,message,checkbox,radio,list,item,breadcrumb}.json`.

**Versões (§ 1):** cores computadas todas em `tokens/colors.json` 3.7.0; único valor que difere entre
versões medido: grid 24 px (core 3.4.1) × 40 px (KB) → E-08. Para separar autoral de DS, foram lidos
dois ativos **do DS** congelados na árvore: o bundle dos web components (`scripts.*.js`: o `br-input`
renderiza o botão de ação com `icon/disabled/submit/circle/density:"small"`, sem rótulo) e o CSS do
core (`styles.*.css`: `.br-input .br-button{border-radius:50%}`, `.br-select .br-list:focus{outline:none}`).
Nenhum chunk do app foi aberto.

## 2. Exposição prévia do auditor (marca `exposto`)

Lidos antes de julgar: o método e os dois adendos; **o plano da C inteiro** (o plano pede só §1–§4 e
§6: desvio — o § 2 lista as vistas excluídas, inclusive a validação ao sair de campo, e o § 5 cita
"P1 associação campo/mensagem" do oráculo; nenhuma lista de defeito); da B, `auditoria.md`,
`recomendacoes-escaladas.md`, `montar-decisoes.mjs`, `conferir-auditoria.mjs`, `comum.mjs` e a lista de
specs de `ground-truth-vistorias.json` (B-01…B-29, inclusive B-10/B-29 no `br-select-pnip`); NAT-71
§ 3; protocolo NAT-78 § 5.3. **Não abertos:** `pnip-mock/src/`, capturas, validator, axe, ESLint,
comparadores, scorers, `results/`, `pipeline/logs/`. Marca `exposto` (adendo § E, casco): **C-04,
C-05, C-06, C-07**. Além do adendo, o item E-07 (o "Exibir lista", B-10/B-29) é marcado exposto.

## 3. Estados

Os da fase 1, sem mudança (`sequencia.mjs`): `inicial` (afterStep 0) e `lista-usuarios` (afterStep 2:
clique em `br-select-pnip input#idUsuario` + espera de `.br-item`). Re-conferidos aqui na carga
principal: path, mesmo documento, sem escrita/externo/sem-fixture, âncoras inalteradas entre as duas
paradas (exceto `data-focus-visible-added`, marca de foco do polyfill no campo clicado — § 12).

## 4. Inventário

`node tela-c/inventariar.mjs` (sem `--candidato`) na árvore congelada: `inicial` 248 elementos
(100 em shadow), 168 visíveis, 26 focáveis, h2 h3 h2, marcos main/banner/form/navigation, Tab 33
pontos, 30 textos com contraste; `lista-usuarios` 181 visíveis, 30 focáveis, 33 textos. Diferença
para a fase 1: só o id aleatório de componente do Angular num `<style>` (1 elemento por parada).

## 5. Tabela de decisão — `node tela-c/montar-decisoes.mjs`

186 linhas: **viola 9 regras** (→ 7 specs, 14 unidades) · conforme 38 · não-mensurável 16 (→ § 8) ·
não-aplicável 49 · observação 31 · não normatiza 43. Nenhum filtro por `automatable`/
`automationConfidence`/`validationStrategy`.

| Spec | Estado | Âncora (escopo, n) | Regras | Fam. | Medida | Evidência (sha256) |
|---|---|---|---|---|---|---|
| C-01 | inicial | `br-select-pnip input[type=text]` (único) | b95c42b61ed3 · e-MAG 6.2 · b5fad7ce076d · 7e6420514860 · e-MAG 1.1 | F4 | id `idUsuario` duplicado (hospedeiro + input); `label for` resolve no hospedeiro; labels 0; nome AX = placeholder "Selecione" | `evidencia/C-01.json` `a93aed3c…bd62` |
| C-02 | inicial | `br-button[label=Cancelar]` (único) | 79db88c7f55d · e-MAG 1.4 · 7e6420514860 · e-MAG 1.1 | F4 | hospedeiro com `tabindex="0"`: ponto de Tab generic sem nome, Enter/Espaço sem efeito, antes do botão real | `evidencia/C-02.json` `c61521d7…f3be` |
| C-03 | inicial | 8 campos obrigatórios `>>> input` (todos, 8) | 01b1806c30e9 · e-MAG 6.5 | F4 | "Campo obrigatório" ao sair dos 8; nenhuma marca no rótulo, nenhuma instrução, sem required/aria-required; 2 opcionais iguais na aparência | `evidencia/C-03.json` `9f2ba136…fe6e` |
| C-04 | sempre | `pnip-root` (único) | 7d2b85f81c52 · e-MAG 1.5 | F4 | 0 âncoras `#`, 0 skiplink; 1º Tab = Menu — **exposto** | `evidencia/C-04.json` `363d696c…0d9e` |
| C-05 | inicial | 1º `h2` (único) | 3ac0aaa53900 · e-MAG 1.3 | F4 | h2 h3 h2, nenhum h1 — **exposto** | `evidencia/C-05.json` `cd3caf7e…3c67` |
| C-06 | sempre | `head > title` (único) | 5d5a5f21d94b · e-MAG 3.3 | F4 | `<title>PNIP</title>` — **exposto** | `evidencia/C-06.json` `9f6e0b55…a4d5` |
| C-07 | sempre | inicial do avatar (único) | cb09bc0c77c0 · e-MAG 4.1 | F4 | 2,33:1 — **exposto** | `evidencia/C-07.json` `d8c9c386…851b` |

Força de todas: `required`. Texto de norma (normalizedRule) por regra em `decisoes.json`; os ids
`govbr-…` de cada spec em `_meta.normas`; os sha256 completos em `_meta.evidencia`.

**Classes pré-registradas** (NAT-71 § 3; proposta do auditor — o protocolo § 5.3 pede ainda dois
classificadores cegos e a autora nos desacordos): C-01, C-02, C-03, C-04, C-05 contextual/relacional,
nível b; C-06 semântico, nível c (cobra a adequação do título); C-07 layout/visual, nível b. O nível a
não é verificável pelo auditor cego (não abre detectores). Detalhe e motivo em `_meta.classes`.

**Escolhas de forma.** C-03 `todos` (cada campo carrega o defeito, D-33); o CEP fica fora dela
(rejeitado vazio, mas sem "Campo obrigatório" ao sair: obrigatoriedade não medida do mesmo modo). C-04
ancora em `pnip-root` (ausência). Nenhum predicado `acceptance`: nenhuma das quatro espécies exprime
estas medidas sem distorcer (C-03 só teria `atributos-ausentes [required, aria-required]`, que não é o
que a norma cobra); a medida mora em `conferir-auditoria.mjs`.

## 6. Observações e registro sem norma

`recommended`/`discouraged`/`permitted` (nunca unidade): "Exibir lista" fora do Tab (`tabindex=-1`,
padrão do Select); Enter ≡ clique nos botões com efeito, exceto no hospedeiro do Cancelar (C-02);
uma só br-message, curta; rádios da lista sem `name` (não formam grupo); nenhum CDN; Raleway como
alternativa; sem Skip Link (ver C-04). **Sem norma no universo** (descoberta se alegado): dois botões
primários visíveis ("Adicionar", "Salvar").

## 7. Fundo (`_meta.fundo`)

DS 3.4.1/1.16.0: botão de busca do CEP com `aria-label=""` e 32×32 (shadow do `br-input`, que não
recebe rótulo para ele — medido no bundle); `alt="logo"` do `<br-header>`; item atual do breadcrumb
sem `aria-current`; "Home" `sr-only`; Menu/Home 32×32; a lista do seletor focada não mostra foco
(`.br-select .br-list:focus{outline:none}` do core — conferido: sem contorno, só a sombra que já
tinha); grid 24 px. Mock: breadcrumb aponta para `/portal-admin…` sem `/pnip-c/` (recarga);
"Coordenadas" vazio (stub do mapa).

## 8. Lista escalada à autora

Em `tela-c/recomendacoes-escaladas.md`, com medida, pergunta e recomendação por item (E-01…E-11) e a
pergunta L2 do piso. Resumo das recomendações: **incluir** E-01 (instrução de formato, 3 campos) ⚠ e
E-02 (fieldset, 1 unidade no form) ⚠; **manter** C-02 (E-09) ⚠; **fora** E-03, E-04, E-05, E-06,
E-07, E-08, E-11; **precedente do D-61** em E-10.

## 9. Controles conformes — `node tela-c/sortear-conformes.mjs`

Regra do plano § 6 + exclusões declaradas no script antes do sorteio (casco; linhas de página
inteira; pares de significado; elementos que são âncora de unidade ou objeto de escalada pendente).
18 pares elegíveis → **12 sorteados** (semente "tela-c/conformes 2026-10-18 (gravada antes do
sorteio)", mulberry32; camada 1 = um por tipo do DS): K-01 links do breadcrumb no Tab; K-02 `li` do
breadcrumb (1.7); K-03 h2 6,72:1; K-04 12 rótulos 12,63:1; K-05 foco do checkbox; K-06 abas por
teclado; K-07 divisores fora do foco/árvore; K-08 ícone da mensagem à esquerda; K-09 "Adicionar" com
rótulo; K-10 rádios com rótulo; K-11 item: superfície inteira + hover; K-12 item: padding 16 px.
**sha256 `tela-c/conformes.json`: `09210fbb950fc30951a60ef6b453f5f9ccbf853b1a7b77388f5f7292da8b9118`**
(citado no `_meta.conformes`). Todos os 18 elegíveis são re-medidos na conferência.

## 10. Fora do escopo

O do `_meta.fora_de_escopo`: painel "Cadastrar Usuário", validação ao sair de campo, os dois
SweetAlert2, menu do avatar, tabela com br-switch, outras janelas/zoom, linguagem, fixtures, regras só
da base literal.

## 11. Portão (partes do auditor) e piso

| Passo | Resultado |
|---|---|
| `node tela-c/conferir-auditoria.mjs` | **110/110** (bytes e lista da fase 1; referência × sequência; sha256 dos conformes; por parada path, documento, escrita/externo/sem fixture e contagem de cada âncora; segmento inalterado; as 7 specs; os 18 pares conformes; linhas conformes de `decisoes.json`; Tab real, gestos e árvore AX em cargas auxiliares; as 19 evidências reproduzem o sha256 registrado). Rodado 3× com o mesmo resultado. |
| `conferir:referencia`, re-medida do 2º agente, decisões da autora | **pendentes** (portão do adendo § F, nesta ordem) |

**Piso (adendo § A), sem `exposto`:** specs **3** (< 8 ✗) · famílias **1** — só F4 (< 3 ✗) · tipos
do DS **3** — select, button, input (✓) · conformes **12** (✓). Com as expostas: 7 specs, 14
unidades, ainda só F4. Com todas as recomendações aceitas: 5 specs sem expostas, só F4. **A tela C é
fina** → L2: a autora decide entre a rota nº 5 e derrubar a C (protocolo § 9, corte 2). Nenhuma
unidade foi criada para alcançar o piso.

## 12. Desvios e notas

1. Universo lido de `ds-rules/06` (mesmos 186 ids da B), não do caminho do validator (§ 1).
2. O plano inteiro foi lido (§ 2), não só §1–§4 e §6.
3. Sondas exploratórias (fora do repositório, apagáveis) mediram fatos antes da tabela; tudo que
   sustenta veredito foi re-medido por `conferir-auditoria.mjs`.
4. Conformes: a 1ª execução do sorteio incluiu a lista do seletor e os 12 campos, contra a própria
   regra de exclusão (elementos de escalada/unidade); corrigida a lista de elegíveis antes de fixar,
   mesma semente, 1º resultado descartado. Os dois sorteios são reproduzíveis.
5. A comparação de âncoras entre paradas ignora `data-focus-visible-added` (polyfill de foco no campo
   clicado pelo setup).
6. `tela-c/inventario.json` foi regravado pela re-medida na árvore congelada (§ 4).
7. O adendo finalizado não foi commitado (instrução do agente: sem commit).
