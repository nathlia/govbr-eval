# Tela A2 — re-medida cega depois da mudança da página (2026-11-02)

Feita pelo mesmo auditor cego, com os mesmos scripts de `../` e a página reconstruída servida por
`node tela-a2/servir.mjs` (3218). Nada novo de `tela-a2/` foi aberto: só `ancoras-neutras.json` e
`tela-a2/auditoria/`. Sem validator, sem axe. A 1ª auditoria (`../*.json`, `../medidas/`) ficou
**byte a byte intacta**: os 28 sha256 foram conferidos depois de cada passo.

**Rodada:** todas as medidas foram refeitas de carga nova (`AUDITORIA_SAIDA=tela-a2/auditoria/remedida-2026-11-02`),
incluindo as observações de 360 s e 330 s. Depois, `conferir-auditoria.mjs` conferiu os 34 achados da 1ª
rodada na página nova (`CONFERIR_ACHADOS=../achados.json`): **22 persistem, 12 sumiram**. A diferença
está em `corrigidos.json`, um item por achado, com a medida nova. Os achados que persistem mantêm o id da
1ª rodada.

## O que mudou no HTML servido (diff dos bytes)

- O skiplink perdeu `role=menubar`/`menuitem`.
- Entrou um `<noscript>`.
- Os 10 elementos vazios deixaram de fechar com `/>`.
- O breadcrumb passou a ter `aria-label="Trilha de navegação"`, Home em `inicio.html` ("Página Inicial"), o 2º item "Meus Requerimentos" e o item atual sem `tabindex`.
- O botão passou a "Enviar Documento"; o rótulo do switch, a "…por SMS (mensagem de texto no celular)"; o botão do fim, de "Voltar para meus requerimentos" a "Meus Requerimentos".
- O CSS é um bundle novo: os botões de ajuda ganharam `margin-right: 176px`, e as setas dos tooltips agora ficam centradas.

## Achados

**Sumiram (12):** A2-04 (`/>`), A2-05 (noscript), A2-06 (menubar), A2-08 (span com tabindex), A2-10 (nome
em inglês), A2-11 (mesmo destino com descrições diferentes), A2-16 (rolagem a 640 px: scrollWidth agora
640), A2-17 e A2-18 (desvio da seta: 0,2 e 0,4 px), A2-32 e A2-33 (caixa dos rótulos), A2-34 (sigla SMS
agora explicada).

**Persistem (22, re-medidos 22/22):**

| Achado | Medida que persiste |
|---|---|
| A2-01, A2-02 | refresh de 300 s; recarga aos 300,2 s; o estado de S1 é perdido |
| A2-03 | `font` e `align` |
| A2-07 | skiplink invisível para o ponteiro |
| A2-09 | breadcrumb com peso 500 |
| A2-12 a A2-15 | rótulo de ajuda fora do nome acessível; rótulo fora da superfície do botão de 40 px |
| A2-19 a A2-21 | tooltips não pairáveis |
| A2-22 | accordion com `aria-expanded` false |
| A2-23 | indicador da etapa "Decisão" oculto |
| A2-24 | combobox sem nome |
| A2-25, A2-26 | upload com `aria-hidden` focável e etiqueta desassociada |
| A2-27, A2-28 | `aria-checked` fixo |
| A2-29 | fieldset sem legend |
| A2-30 | erro do select sem texto |
| A2-31 | h2 com 16 px |

**Novo: nenhum.** O diff das medidas brutas (página, instâncias, contraste, Tab, 45 sondas) não mostra
regressão: foco visível em todas as 16/21/22 paradas, contraste mínimo 4,59 e nenhum elemento além da borda
a 640 px. O único efeito novo que a norma não decide virou **incerto**, não achado:
component-button-a4d904dedad5. O botão do fim agora nomeia o destino ("Meus Requerimentos") e não a ação.

## Contagens (1ª → re-medida)

- Linhas da tabela: violada 44 → **30**, conforme 421 → **436**, não se aplica 273 → 273, incerto 170 → **170**. Nos incertos, component-breadcrumb-27095244993c virou conforme (Home → `inicio.html`) e entrou component-button-a4d904dedad5.
- Achados: 34 → **22** (DS 10 · e-MAG 5 · WCAG 7).
- Regras da base violadas: 38 → 26.
- Por componente: button 4, tooltip 3, página 2, select 2, upload 2, switch 2, e 1 cada em message, skiplink, breadcrumb, accordion, step, grupo e tipografia.

## Refazer

```
cd F:\Dev Nath\TCC\govbr-eval
node tela-a2/servir.mjs
node tela-a2/auditoria/rodar.mjs --longas --saida tela-a2/auditoria/remedida-2026-11-02   (usa corrigidos.json)
set CONFERIR_ACHADOS=tela-a2/auditoria/achados.json & set AUDITORIA_SAIDA=tela-a2/auditoria/remedida-2026-11-02 & node tela-a2/auditoria/conferir-auditoria.mjs   (22/34)
```
