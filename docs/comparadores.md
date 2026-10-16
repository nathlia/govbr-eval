# Comparadores determinísticos do OE5 (NAT-76)

Dois comparadores sem modelo e sem oráculo, rodados sobre bytes congelados: **L** (Stylelint com
configuração normativa) e **V** (regressão visual contra o gêmeo conforme). O desenho, as versões,
a configuração congelada e os desvios estão no plano
`thesis-workspace/planejamento/atual/plano-nat76-comparadores-2026-10-16.md`; este arquivo é só o
método de uso.

## Uso

```sh
npm run build --prefix ../govbr-corpus      # os controles são servidos de govbr-corpus/dist
npm run comparadores                         # desenvolvimento + telas A e B → comparadores/medicoes/<carimbo>/
npm run comparadores -- --so lint|visual --gemeos F6-01-D,F6-01-C --sem-telas
npm run test:comparadores                    # unidades + determinismo (dois runs → bytes idênticos)
npm run comparadores:tokens                  # regenera lint/ds-3.7.0-tokens.json do core.min.css 3.7.0
```

A reserva (`--divisao reserva`) usa a mesma configuração e só roda com `--portao-nat86`.

## O que cada um mede

| | L — Stylelint normativo | V — regressão visual |
|---|---|---|
| Entrada (controles) | HTML da página (`<style>`, `style=""`) + `recursos/biblioteca.css`; nunca o CSS do DS | captura de página inteira em cada ponto `capturar`/`recortar` da receita, 1280×900, Chromium sem interface |
| Entrada (telas) | folhas citadas pela entrada no `govbr-telas` congelado, menos fontes/ícones de fornecedor; achado de origem DS — par (seletor, propriedade) declarado no `core.min.css` da versão da tela (D8) — não conta, e o valor dele é auditado contra o do DS | lacuna: nenhuma tela tem versão conforme |
| Regras | N1 cor pré-definida, N2 escala tipográfica, N3 contorno de foco (normativas); H1–H7 higiene, à parte | pixelmatch 0.1, sem AA, qualquer pixel diferente; sem normalização; tamanhos diferentes estendidos com magenta opaco (D9); piso de ruído medido |
| Atribuição | seletor da regra CSS reduzido ao sujeito estático, resolvido por `scripts/anchors.ts` nos estados | pixels diferentes dentro da caixa do sujeito (gêmeo ∪ referência, D1) + 8 px; as duas caixas e a contagem sem D1 ficam no arquivo |
| Crédito | atribuído + norma cruzada | atribuído (a ferramenta não nomeia norma) |

## Como ler as tabelas

- Achado de lint ≠ diferença visual ≠ violação normativa. Uma diferença de pixels não nomeia norma.
  Pixels e linhas não são N experimental.
- **Principal = por gêmeo (página):** defeituosos com sinal, com sinal no sujeito do defeito, com
  sinal também em sujeito conforme; conformes avaliados com sinal.
- **Por célula = descritiva:** `confirmed` → positivo (TP/FN), `conforme`/`nao-aplicavel` →
  negativo (FP/TN), o resto à parte. Células não são independentes: o mesmo sujeito pode estar em
  duas células (o mesmo sinal vira TP e FP), gêmeos com a mesma diferença contam duas vezes, e o
  sujeito `documento` é a página inteira. FN e TN que não são medida ficam em colunas próprias:
  sem mudança declarada (T-01 no lint), sujeito não resolvido pela notação do catálogo, contexto ARIA.
- Negativos de L e V não são comparáveis: L avalia os `-C`; V não (são a referência).
- V sai também **sem D1** (caixa só do gêmeo), com o efeito líquido do D1 escrito na tabela.

## Limites conhecidos

- N3 é cópia fiel de `a11y/no-outline-none` 1.2.3: aceita qualquer `border`/`border-color`/
  `box-shadow` no bloco como substituto (inclusive `box-shadow: none`), acusa
  `:focus:not(:focus-visible)` sem substituto, e o `#0000` do CSS minificado escapa da checagem de
  `transparent`.
- N2 não vê a exceção da fonte base. `font` abreviado não é lido.
- Atribuição do lint é um-para-muitos: o seletor de uma regra credita todo elemento que casa.
- Telas: origem DS por (seletor, propriedade) — uma sobrescrita da página que só muda o valor seria
  contada como DS; a contagem "valor diferente do DS" é o alarme disso. Bibliotecas embutidas no CSS
  da página (Summernote, SweetAlert2 na B) contam como página; a tabela as separa por prefixo de
  seletor, só para descrever.

## Saída

`comparadores/medicoes/<carimbo>/`: `lint/<divisao>/<gemeo>.json`, `lint/telas/<tela>.json`,
`visual/<divisao>/<gemeo>.json` + `capturas/<caso>/*.png` (diferenças só quando > 0),
`tabelas.{json,md}`, `resumo.json` (comando, versões, hash da configuração, sha256 das
expectativas), `tempos.json` (à parte) e `manifesto.json` (sha256 de tudo). Nenhuma captura das
telas é gravada.
