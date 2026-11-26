# Método da conferência — Tela F

Conferente independente dos 24 candidatos de `selecao/candidatos.json`. Só aprovei ou reprovei: não corrigi, não reescrevi e não propus candidatos.

## Fontes lidas

- `selecao/candidatos.json` (a lista conferida). Não usei as medições do seletor; medi tudo de novo.
- Corpus público do DS 3.7.0 (`ds-rules/govbr-ds-3.7.0-corpus/`), sem abrir `normalizacao/`: os arquivos citados e os trechos vizinhos, além de `header__designer.md`, `header__desenvolvedor.md`, `signin__designer.md`, `fundamentos-visuais/iconografia.md`, `select__designer.md` e `item__designer.md`, lidos para checar contexto e contradições.
- `govbr-telas/README.md` e `server.mjs` para servir o site (porta 3421).
- `pnip-mock/src` (somente leitura): template, scss e componentes compartilhados que cada mudança toca.

## Passos

1. **clausulaLiteral**: `clausulas.mjs` divide cada trecho em "[…]" e procura cada parte de forma literal (`includes`) no arquivo citado. Todas as partes foram encontradas (`clausulas.json`).
2. **clausulaSustenta**: li a seção de cada trecho e as seções relacionadas. Reprovei quando a regra é uma orientação de julgamento que não decide o caso, quando outro documento do DS a contradiz, quando ela não rege o elemento ou quando o "depois" não a viola.
3. **especificoDoDS**: perguntei se o defeito se define por um token, uma anatomia ou uma composição do DS, e não só por um critério WCAG ou e-MAG.
4. **conformeHoje** e 5. **observavel**: `medir-candidatos.mjs` abre a página do zero para cada candidato (Playwright headless, 1280×900). O script leva a página ao estado pedido (lista de filtro aberta, opção escolhida, aba trocada, foco por Tab, mouse sobre o item, lista do "Exibir" aberta), mede o "antes", simula o "depois" manipulando DOM/CSS conforme a mudança proposta, mede de novo e faz uma captura. `medir-extra.mjs` complementa quatro casos: a tag em zoom 2×, o host do botão recriado com `type` (a troca do atributo em tempo de execução não re-renderiza o web component), a tag selecionada e as regras de hover que vencem. `medir-md3-teclado.mjs` confere a ativação por teclado de um botão sem `disabled`. Resultados em `medidas.json`, `medidas-extra.json`, `medidas-md3-teclado.json` e `capturas/`.
6. **nivelCorreto**: comparei o "depois" que medi com as definições (fácil, médio, difícil, muito difícil). Se eu atribuiria outro nível, o candidato reprova, sem renivelar.
7. **realista**: julguei se um desenvolvedor usando o DS cometeria esse erro.
8. **injetavelNoFonte**: localizei a linha ou o arquivo em `pnip-mock/src` e verifiquei que a mudança fica no código do app, não na biblioteca DS, e que preserva a função. Marquei `risco` quando a mudança depende de estilo global alcançando um componente filho, de herança ou de custom properties entrando num shadow root.
9. **independente**: comparei os pares de candidatos que tocam o mesmo componente (elemento + propriedade) e verifiquei se um esconde ou provoca o outro. Os casos de fronteira estão em `veredictos.md`.

## Limites

- As simulações manipulam o DOM e o CSS já renderizados. Não recompilei o app. Nos casos com `risco`, o comportamento após o build Angular pode diferir (encapsulamento e ordem das folhas de estilo).
- O botão primário foi simulado recriando o host, porque mudar o atributo depois da renderização não teve efeito. No template, o atributo existe desde a criação.
- Os julgamentos de realismo e de nível são do conferente. As evidências de cada critério estão em `veredictos.json`.

## Arquivos

`clausulas.mjs`, `comum.mjs`, `explorar-dom.mjs`, `medir-candidatos.mjs`, `medir-extra.mjs`, `medir-md3-teclado.mjs`, `gerar-veredictos.mjs` (gera `veredictos.json` e `veredictos.md`), `dom-inicial.json`, `medidas*.json`, `capturas/`, `server.log`.
