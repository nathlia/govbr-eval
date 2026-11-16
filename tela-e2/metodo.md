# Tela E2 — página construída (plano B da tela E): método fixado antes de tudo

Escrito e commitado **sozinho, antes** do inventário, antes de ler qualquer regra e antes de qualquer contagem.
Nada aqui muda depois de uma contagem, salvo pela regra de iteração do inventário (§ 3.4), que só vale antes do selo.

## 1. Por quê

A tela E pela rota real (`pais-importador`, pasta `tela-e/`, que fica como registro e não é tocada) não passou no
portão de adequação: 4 specs do DS semeadas que pegaram, o portão pede 5 (D-200,
`thesis-workspace/tcc2-decisions-log.md`). Entra o plano B pré-declarado
(`planejamento/atual/viabilidade-segunda-tela-ds-2026-11-12.md` § 7.2 "Plano B" e § 2.3; protocolo
`protocolo-nat78-estudo-complementar-REVISAO-2026-11-12.md` § 3.7–3.8): uma **página construída pelo procedimento da
A2**, com o mesmo portão. Corte: referência congelada até ter 17/11 23:59, senão a E sai e a D roda sozinha.

**Portão (§ 3.7, inalterado):** ≥ 5 specs do DS semeadas que pegaram, cada uma confirmada por medição por auditor cego
(só documentação do DS), num estado alcançável pelas paradas declaradas, violando cláusula que existe na base literal.

## 2. Entradas permitidas e proibidas

- **Lê:** o corpus literal `ds-rules/govbr-ds-3.7.0-corpus/` (DS 3.7.0 + e-MAG 3.1, com o `MANIFEST.json` e os sha256
  de cada arquivo), o material da A2 neste worktree (`tela-a2/`, `scripts/tela-a2-*.ts`, `scripts/draw-tela-a2.ts`),
  de `tela-e/` só `escolha-da-rota.json` (tipos de componente da rota), `elegibilidade*.json` (julgamentos de sítio),
  `parametros-sorteio.json` e `sortear-sementes.mjs` (regras de cota, déficit e reposição), e os **ids de regra** de
  `tela-e/sorteio.json` e `tela-e/sementes-vigentes.json`.
- **Exposição:** dos `ground-truth-*.json` das telas A (`solicitacao`), A2 (`acompanhamento`), B (`vistorias`) e
  D (`processos`) do checkout principal `F:\Dev Nath\TCC\govbr-eval`, **só** os ids de `violations[].rules`.
- **Ponte de ids (decisão deste método, a confirmar pelo coordenador):** os ids das referências e da tentativa
  real são da base literal (`govbr-3.7.0-…`); o universo é por unidade do corpus (`a2-…`). Para ligar os dois, lê-se de
  `ds-rules/govbr-ds-3.7.0-corpus/normalizacao/rules.jsonl` **apenas** os campos `id`, `source.corpusFile` e
  `source.charRange` (o localizador de proveniência no corpus), e a unidade do universo é ligada ao id cujo trecho do
  corpus (lido no próprio corpus, pelo localizador) se sobrepõe ao texto dela. Nenhum outro campo da base é lido
  (nem texto normalizado, força, estratégia de validação, automatizável, confiança, evidência esperada). O mesmo
  localizador decide a exclusão `sem-clausula-na-base` (§ 5): é a condição 3 do portão, aplicada antes do sorteio.
  e-MAG: `emag:X.Y` = a recomendação X.Y do universo, sem ponte.
- **Proibido:** `govbr-ds-validator` (qualquer checkout, código ou dado), `checker-aliases.json`, `kb-aliases*.json`,
  `results/`, `reports/`, ferramentas MCP do validator, axe. Nada do que o oráculo detecta influencia nada aqui.
  Script da A2 que leia dado do validator não roda; escreve-se o equivalente que lê só o corpus literal.
- Sem docker, sem script que chame modelo, sem disparo de workflow, sem push.

## 3. Inventário (escrito antes de ler qualquer regra)

1. **Tipos sorteáveis = os tipos de componente da rota escolhida** (`tela-e/escolha-da-rota.json`): `button`, `input`,
   `item`, `list`, `message`, `radio`, `select`, `switch` (o `select-pnip` da rota escreve a marcação do `select` do
   core e conta como `select`).
2. **Página:** HTML puro com a marcação oficial do `@govbr-ds/core` 3.7.0 (scripts clássicos, CSS do DS), como a A2;
   não é o app Angular. Serviço de governo plausível, no mesmo domínio da rota (cadastro de país importador), com
   8–10 instâncias sorteáveis e 2–3 estados declarados e alcançáveis por receita.
3. **Andaime (nunca hospeda defeito, construído conforme):** o casco da rota real (`header`, `footer`, `avatar`,
   `signin`, `breadcrumb`, `divider`; mesma lista da § 7.2 que a tentativa real usou), o `skiplink` e a região
   principal (moldura de página, D-53/D-83), os botões que disparam os estados declarados (o gatilho de estado não
   pode receber defeito que impeça a parada) e o documento (`pagina`: title, lang, títulos, regiões). Componente de
   tipo sorteável embutido em outra instância sorteável (ex.: botão gatilho do select, itens da lista) hospeda as
   unidades do seu componente **só** nas instâncias declaradas em `embutidos`. Todos os outros componentes do pacote
   (36 no total) ficam em `fora` e as regras deles saem com `componente-fora-da-tela`.
4. **Iteração (só antes do selo):** se o `--validar` mostrar menos que a meta de folga (§ 6), podem-se acrescentar
   instâncias **por tipo** (dos tipos do item 1) e repetir; cada iteração é registrada em `registro.md` com as
   contagens que a motivaram. Nunca se muda o inventário depois de um sorteio, nem se tira instância para mudar contagem.
5. Nenhum id ou rótulo de instância descreve defeito (D-24).

## 4. Universo e elegibilidade (procedimento da A2)

1. **Universo:** a mesma extração da A2 (`scripts/tela-a2-universo.ts`: marcadores de força, imperativos de lista
   fechada, requisito herdado, tabela de especificação = uma unidade, auditoria de leitura `tela-a2/universo-auditoria.json`,
   e-MAG por recomendação), sobre o mesmo corpus, com o sha256 de cada arquivo conferido contra o `MANIFEST.json`.
   Os ids são os mesmos da A2 (hash de arquivo|seção|texto); o universo tem de sair igual ao da A2 unidade a unidade,
   e isso é conferido.
2. **Passo 1 (mecânico):** força `recomendacao` → `forca`; componente em `fora` → `componente-fora-da-tela`; componente
   de andaime não embutido → `andaime`.
3. **Passo 2 (julgado), critérios fechados da A2** (`tela-a2/passo2-lotes/CRITERIOS.md`, motivos `forca`,
   `nao-se-aplica`, `escopo` (contrato 1280×900), `so-andaime`, `nao-normativa`, `sem-medicao`, `acoplada`,
   `duplicada:<id>`, `conflito`; aceita com hospedeiros, variantes, tipo e caminho a priori; nenhum motivo cita
   detector, busca ou oráculo — o script recusa).
4. **Herança, por id de unidade:**
   - da A2, herdam-se como estão as rejeições de motivo intrínseco à frase: `forca`, `nao-normativa`, `sem-medicao`,
     `escopo`, `conflito`, e `duplicada:<id>` quando a unidade-alvo também chega ao passo 2 da E2 (senão, rejulga);
   - rejulgam-se para a página da E2 (hospedeiros e variantes novos) as aceitas da A2 e as rejeições que dependem da
     página (`nao-se-aplica`, `so-andaime`, `acoplada`); a justificativa da A2 pode ser lida;
   - da rota real, herda-se só o que é de sítio e não é próprio de web component: a lista de casco (item 3.3). O único
     motivo de inelegibilidade de `tela-e/elegibilidade.json` (`interno-do-pacote`) é próprio de web component e não
     vale aqui; não há julgamento por regra a herdar de lá;
   - unidade nunca julgada (componente que a A2 não tinha, ou motivo rejulgado) é julgada nova, em lotes, com os
     validadores da A2 adaptados. O registro diz quantas foram herdadas e quantas novas.
5. **Efeitos e compatibilidade:** efeitos de cada colocação (regra × variante × hospedeiro) no vocabulário fechado da
   A2 (`toca`, `remove`, `cascata`, `estado`) sobre um `VOCABULARIO.json` da E2 fixado a partir do inventário; duas
   colocações são incompatíveis se tocam nó comum, se cascata ou remoção de uma atinge a instância de um nó da outra,
   ou se as duas mudam o estado da página; matriz derivada por script, sem semente. Construtibilidade no core 3.7.0
   só nos pontos sinalizados (variante que dependa de classe, atributo ou JS cujo efeito no 3.7.0 não é óbvio).

## 5. Células, classe e exclusões (antes do sorteio)

- **Célula** = unidade elegível × hospedeiro (instância em que ao menos uma variante dela vale). Id `<hospedeiro>::<unidade>`.
- **Classe por célula, antes do sorteio, pela regra da `categories` da referência** (D-156 3.i; convenção de 04/11;
  `CLASSE_DA_CATEGORIA` de `scripts/reanalise-nat74/e14-deteccao.ts`): a célula recebe `categories` do vocabulário
  {token, tipografia, estrutura, componente, comportamento, acessibilidade, navegacao, formulario}; classe `DS` só
  se **toda** categoria é do DS. Atribuição:
  - unidade do e-MAG, de guia geral de acessibilidade do site do DS, ou com `equivalenteEmag` → `acessibilidade` (G);
  - unidade do DS: categoria-base pelo tipo a priori (`visual-token` → `token`, ou `tipografia` se o observável é
    família, tamanho, peso ou altura de linha de texto; `estrutura-classe` → `estrutura`, ou `componente` se o
    observável é parte da anatomia do componente; `comportamento` → `comportamento`), **mais** `acessibilidade` se o
    observável que a variante muda é propriedade de acessibilidade (nome, papel, estado ou propriedade acessível,
    alternativa textual, operação por teclado, foco visível, contraste), `formulario` se é rótulo, obrigatoriedade,
    instrução ou mensagem de erro de campo, `navegacao` se é destino de navegação, landmark ou ordem de navegação.
    Qualquer uma dessas três puxa a célula para G. A atribuição fica gravada por célula com uma linha de razão.
- **Exclusões, nesta ordem (vale a primeira):** `sem-clausula-na-base` (nenhum id da base literal tem localizador
  sobreposto à unidade; e-MAG sempre tem); `exposta` (a unidade liga a um id que é spec numa referência de A, A2, B
  ou D, ou é — ou é equivalente a — recomendação `emag:X.Y` citada lá; aliases WCAG não contam, como na tentativa
  real); `tentativa-e` (a unidade liga a uma regra sorteada ou posta em vigor na tentativa real,
  `tela-e/sorteio.json` › sementes e `tela-e/sementes-vigentes.json` › vigentes; a E2 não compartilha regra semeada
  com ela).

## 6. Parâmetros do sorteio (fixos agora)

- **Cotas alvo: 6 DS + 3 G**, exatas na cota efetiva, sem transferência DS↔G.
- **Um defeito por hospedeiro; no máximo uma semente por regra; sem cópias compartilhadas; sem alternativas válidas
  nem chamarizes sorteados.** Colocações sorteadas têm de ser compatíveis duas a duas (§ 4.5).
- **Ordem:** key(L, x) = sha256(semente|L|x) em hexadecimal minúsculo, crescente, empate por id; L = `celula` para a
  ordem por classe (sobre TODAS as células elegíveis da classe, gravada inteira) e `variante` para a ordem das
  variantes válidas no hospedeiro.
- **Alocação:** busca em profundidade determinística, fila = células DS na ordem da classe, depois G; em cada célula,
  primeiro incluir (cota efetiva não cheia, hospedeiro livre, regra livre, e a primeira variante na ordem que é
  compatível com as já incluídas), depois pular. A primeira solução completa é o resultado.
- **Déficit (regra escrita):** DS_ef = maior k ≤ 6 com alocação de k células DS; G_ef = maior g ≤ 3 com DS_ef e g ao
  mesmo tempo. Calculado pelos insumos, sem semente. Se DS_ef < 5, ou se as células DS elegíveis − DS_ef < 2
  (reposição mínima, como na tentativa real), o script recusa sortear.
- **Meta de folga (para o inventário, § 3.4):** ≥ 12 células DS elegíveis em ≥ 8 hospedeiros distintos depois de
  todas as exclusões.
- **Reposição, sem novo sorteio:** semente que não pega sai (motivo da lista, com evidência medida) e é reposta pela
  próxima célula da mesma ordem da classe, depois da posição da que saiu, que ainda caiba: hospedeiro livre, regra
  livre, nunca vigente antes, e com variante compatível com as vigentes. Sem célula que caiba, a classe fica com uma a
  menos, sem transferência. Motivos de descarte: `nao-observavel`, `estado-inalcancavel`, `quebra-fluxo`,
  `interfere`, `nao-construivel` (os da tentativa real menos os próprios de web component, `interno-do-pacote` e
  `versao-do-pacote`).
- **Pegou:** a conferência de construção (medição, sem oráculo e sem axe, página semeada × página sem semente) mostra
  que só o observável da célula mudou, no estado declarado. Unidade sorteada e medida fica na referência mesmo que a
  auditoria cega não a ache (E-02 da A2); para o portão ela só conta se o auditor cego a confirmar.
- **Semente:** o commit do `thesis-workspace` que registra a D-200,
  `f82c2f7c16baed0ce04fea9f27909c1a1fbe2fa8`, fixado aqui antes de qualquer contagem e **não usado** antes do selo.
- **Selo:** o primeiro commit do ramo em que `tela-e2/parametros.json` diz `SELADO` (o pai não diz); os insumos são
  conferidos byte a byte contra esse commit no momento do sorteio; o script só aceita a semente acima.
- **Uma vez:** um sorteio, sem ensaio com outra semente, sem execução antes do selo; o script recusa se
  `tela-e2/sorteio.json`, `sorteio-execucao.json` ou `sorteio-falha.json` existem ou já existiram no histórico.

## 7. Passos e parada

1. este método; 2. inventário; 3. universo e passos 1–2; 4. efeitos, compatibilidade e construtibilidade pontual;
5. exclusões (exposição e tentativa real); 6. `--validar` (só contagens). **Para aqui:** sem selo, sem sorteio, sem
construção. Commits locais no ramo `tela-e`, um por passo, sem push.

**Pendência fora deste ramo, antes de qualquer bateria:** o checkout esparso do CI
(`.github/workflows/execucao-isolada.yml`) exclui `tela-e/`, mas não `tela-e2/`.
