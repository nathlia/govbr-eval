# Tela A2 (Acompanhar requerimento): o que a autora decide — 9 itens

Nada aqui foi aplicado. A referência está só como rascunho (`tela-a2/candidata/ground-truth-acompanhamento.json`,
`1.0.0-candidata`): as specs dos itens E-01 e E-02 ficam em `_meta.aDecidir` e **não contam** até a sua
resposta. Cada item traz a medida, a pergunta e a recomendação do assistente. **"Aceito tudo"** é
resposta válida; para recusar, basta citar o número. Critério (o mesmo da B, da C e da D): vira unidade
o que tem medida determinística, norma obrigatória ou proibida, fato autoral (não DS, não versão, não
linguagem) e cai numa parada declarada. **Na dúvida, fica fora** (⚠ marca onde a dúvida existe).
Detalhes em `reconciliacao.md`. Tempo estimado: ~15–20 min.

## O piso, antes de tudo

Piso (plano § 14 / adendo da D § A): **≥ 8 specs, ≥ 3 famílias, ≥ 3 tipos de componente do DS, ≥ 4
controles conformes**, sem as unidades expostas.

- **Sem nenhum item aceito:** 7 specs / 8 unidades, famílias F1, F3, F4, 6 conformes → **não passa**
  (7 < 8).
- **Com E-01:** 9 specs → passa. **Com E-02:** 12 specs → passa.
- **Com E-01 e E-02:** 14 specs / 16 unidades; com E-03 a U-11 fica exposta e o piso conta 13 / 15 →
  passa. Depois das correções F-01…F-07: 11 conformes.

Recusar E-01 **e** E-02 deixa a tela abaixo do piso.

## Itens

| # | O que | Medida | Pergunta | Recomendação |
|---|---|---|---|---|
| E-01 | U-07 (switches com `aria-checked` fixo) e U-08 (accordion com `aria-expanded` fixo), sorteadas, que **coincidem com o core 3.7.0** | A auditoria cega achou as duas (A2-27/28, A2-22). O core não mantém esses atributos; os exemplos oficiais nem os trazem — o `="false"` fixo foi escrito na página. | Mantém as duas como unidades, marcadas "coincide com o core", com recall dado com e sem elas? | **Sim.** Saíram do sorteio antes de qualquer medida e o atributo fixo é autoral. Não é a E-03 da D (lá era estilo do core sem escolha da página). |
| E-02 | 5 sorteadas que a auditoria cega **não achou**: U-01 (rótulo das abas 14 px), U-02 (borda do upload não fica verde ao arrastar), U-05 (ícone do Fechar fora do centro), U-11 (Fechar em `div`), U-12 (upload sem formatos e tamanho) | U-01, U-02 e U-05 não têm frase nenhuma na base que o auditor usou, então ele não tinha como citá-las. U-11: ele conferiu classe e teclado, não a tag. U-12: ele deu a norma (e-MAG 6.5) como **conforme**, pela instrução geral da página. As 5 estão medidas na conferência de construção (79/79); U-01, U-05 e U-11 têm predicado que refaz a medida. | Mantém as 5 como unidades? | **Sim** ⚠ na U-12: o auditor julgou o contrário, mas sem olhar a restrição do upload (um .txt é recusado com "PDF, JPG ou PNG até 5 MB", e nada avisa antes). A U-02 também coincide com o core; a página escreve o estilo do arrasto e deixa a borda de fora. |
| E-03 | U-11 (Fechar em `div role=button`) | Mesma variante, mesmo componente e mesma norma (e-MAG 1.2) da A-06 da tela A. | Marca como "exposto" (recall com e sem; o piso conta sem ela)? | **Sim.** |
| E-04 | Normas que o auditor citou para o **mesmo fato** de uma unidade | U-03: escala Minor Third. U-06: "o botão cresce com o rótulo" e WCAG 2.5.3. U-10: e-MAG 2.4 (a frase nomeia `http-equiv refresh`). U-07/U-08: guia WAI-ARIA / e-MAG 2.2. U-09, U-13, U-14: frases do DS que repetem o e-MAG. Lista em `_meta.aDecidir.aliases`. | Aceita como citações válidas da mesma unidade? | **Sim**: mesmo elemento, mesmo estado, mesmo observável. É o critério de norma concorrente do plano § 14.2. |
| E-05 | A2-02: a recarga de 300 s apaga o que a pessoa fez (e-MAG 2.5, WCAG 2.2.1) | Fora do protocolo: em S1, com select escolhido e switch ligado, a recarga dos 300,2 s voltou tudo ao início. A 2.5 saiu antes da semente ("a tela não tem limite de tempo"). | Fica fora da referência (nem unidade nem citação aceita)? | **Sim, fora** ⚠. É consequência da U-10, que já está na referência. O que a observação muda: numa bateria, um agente que passe de 300 s em S1/S2 volta ao S0. O plano § 14.5 já declara isso, e o runner não muda. |
| E-06 | Marcação oficial do pacote que viola norma, em chamarizes: skiplink com `role=menubar` (A2-06, e-MAG 1.2 — a mesma norma da U-11), `span tabindex=0` no item atual da trilha (A2-08, e-MAG 1.4), `aria-label="Breadcrumbs"` (A2-10) | Copiados dos exemplos `skiplink-*.html` e `breadcrumb-default.html` do @govbr-ds/core 3.7.0. | Corrige (F-01…F-03), mesmo desviando do exemplo oficial? | **Sim, corrigir.** Plano § 4: andaime não conforme é defeito de construção, e chamariz tem de ser conforme. Na tela A o skiplink com menubar ficou como fundo; aqui ele cita a mesma norma de uma unidade, o que confundiria o casamento. |
| E-07 | Seta do tooltip fora do centro do balão (A2-17 na alternativa "balão abaixo"; A2-18 no Fechar da pendência) | 9,2 e 8,4 px. O componente de tooltip do core calcula a posição uma vez, na criação, e não recalcula ao abrir. O tooltip do prazo sai centrado. | Corrige na página (F-07: recalcular a posição ao abrir, sem mexer no core) em vez de deixar como fundo? | **Sim, corrigir.** A alternativa válida tem de cumprir todas as normas (plano § 14.3), e a regra da seta centrada é elegível. |
| E-08 | Padrões do core 3.7.0 que a auditoria achou: skiplink invisível para o mouse (A2-07), peso medium no item atual da trilha (A2-09), balão que some quando o ponteiro vai até ele (A2-19…21), select sem nome no `combobox` (A2-24), botão do upload com `aria-hidden` (A2-25), rótulo do upload preso ao input escondido (A2-26) | Vêm do CSS ou do JS do pacote; a página não escreveu nada disso. | Ficam como fundo (fora da referência; alegação certa vira descoberta)? | **Sim, fora**, como a E-03 da D ⚠ na A2-26, cuja norma (e-MAG 6.2) é elegível — mas o fato é do componente de upload do core. |
| E-09 | Dois defeitos autorais cujas normas saíram antes da semente: `/>` em 10 elementos vazios (A2-04) e nenhum `noscript` (A2-05) | Bytes do HTML; a página depende de script. | Corrige também (F-09, F-10)? | **Sim, corrigir.** Não custa nada, não toca nenhuma unidade e tira duas alegações verdadeiras que só virariam descoberta. |

**Corrigido sem precisar de decisão** (defeito de construção; plano § 4 e regra do sorteio): três
descrições diferentes para o mesmo destino na trilha e no Voltar (A2-11 → F-04), iniciais minúsculas
nos botões (A2-32/33 → F-05), rótulo da ajuda do NUP passando da janela a 200 % (A2-16 → F-06) e SMS
sem forma completa (A2-34 → F-08).

**Se tudo for aceito:** 14 specs / 16 unidades (13 / 15 sem a exposta), famílias F1, F3 e F4, 11
conformes depois das correções e da re-medida. Ordem: correções → `conferir-construcao` →
re-medida da auditoria → referência 1.0.0.
