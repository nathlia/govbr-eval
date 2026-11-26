# Conferência dos candidatos — veredictos

Conferência independente dos 24 candidatos de `../selecao/candidatos.json`. As medidas foram refeitas no navegador (ver `metodo.md`). Os dados completos estão em `veredictos.json` e `medidas*.json`, e os recortes em `recortes/`.

## Resumo

- Aprovados: 21/24. Por tipo: T1 4, T2 6, T3 6, T4 5.
- Por nível (conferente): fácil 2, médio 4, difícil 11, muito difícil 4.
- Reprovados: 3. Por categoria: cláusula 1, não observável 2.
- Discordâncias de nível (entre aprovados): 3.
- Pares em colisão: 3 no total, 1 entre aprovados.

| id | veredito | tipo (conf.) | nível seletor → conferente | interação | motivo |
|---|---|---|---|---|---|
| T1-1 | APROVADO | T1 (anatomia) | médio → médio | não | Cláusula literal (Setas de Navegação, Obrigatório; reforçada em Tipos: "apenas as Setas de Navegação são obrigatórias"). Hoje: 2 setas. Depois: só "Página seguinte". Remoção estática, sem quebra funcional (1 página). |
| T1-2 | APROVADO | T1 (marcacao) | fácil → fácil | não | Propriedade obrigatória "content" do Avatar. Hoje: 40×40, raio 50%, flex. Depois: 18,2×40, raio 0, display block — avatar deformado, visível a qualquer pessoa. |
| T1-3 | REPROVADO (cláusula) | T1 (anatomia) | difícil → difícil | não | A cláusula é contradita na mesma seção (header__designer.md, linhas 115 e 117): "é possível utilizar texto ou outro elemento para substituí-lo" e "Caso não deseje utilizar o título textual, opte pelo elemento Logo". Depois da mudança o header mantém o logo (medido: logo presente), o que a documentação admite como substituto do título. |
| T1-4 | APROVADO | T1 (anatomia) | difícil → difícil | não | Rótulo obrigatório no tipo padrão (exceção só no circular). Hoje: texto "Exportar", 117,7 px. Depois: só ícone fa-file-export, 78 px, ainda pílula (padrão). Nome acessível "Exportar" preservado (árvore AX via CDP, 0 botões sem nome antes e depois) — não introduz falha de acessibilidade geral. |
| T1-5 | APROVADO | T1 (marcacao) | muito difícil → fácil **≠** | sim | Classe obrigatória br-button. No estado (filtro escolhido): hoje 28×28, raio 50%, fundo #1351b4. Depois: botão nativo 40×30,3, raio 0, fundo #f0f0f0, borda outset. A remoção do filtro continua funcionando (testado). Nível: a quebra é evidente a qualquer pessoa depois de chegar ao estado; não precisa da regra do DS. |
| T1-6 | REPROVADO (não observável) | — | difícil → — | não | Sem efeito observável: estilos computados do contêiner, th, td e tabela idênticos antes/depois e captura de página inteira idêntica byte a byte. Os estilos da tabela vêm de regras "td, th" sem o seletor .br-table. |
| T2-1 | APROVADO | T2 | médio → difícil **≠** | não | Linhas (densidade padrão) padding-top --spacing-scale-2x. Hoje 16px. Depois 10px (fora da escala servida 0/4/8/12/16/20/24…). Linha 1: 154,3→142,3 px. Nível: diferença de 6 px por lado em linhas de ~150 px não se percebe comparando com o cabeçalho; só contra a regra. |
| T2-2 | APROVADO | T2 | difícil → difícil | não | Superfície do avatar restrita à paleta do DS. Hoje #ff8c00 (orange-vivid-30). Depois #f5871f, ausente dos 491 tokens hexadecimais do :root servido (conferido de novo). |
| T2-3 | APROVADO | T2 | difícil → difícil | não | H2 Size --font-size-scale-up-05. Hoje 34,832 px (≥576 px). Depois 32 px, fora da escala (29,036 / 34,832). |
| T2-4 | APROVADO | T2 | médio → médio | não | Label da Tag de Interação --font-size-scale-up-01. Hoje 16,8 px (igual às tags vizinhas). Depois 15 px, fora da escala (14 / 16,8). |
| T2-5 | APROVADO | T2 | difícil → difícil | não | Divider fundo claro --gray-20. Hoje #ccc. Depois #d6d6d6, ausente da paleta servida. Diferença sutil, mas mensurável. |
| T2-6 | APROVADO | T2 | difícil → difícil | não | Sombra da superfície do Header --surface-shadow-sm. Hoje 0 1px 6px rgba(0,0,0,.16). Depois 0 2px 12px rgba(0,0,0,.3): offset 2 px e blur 12 px fora dos tokens (0/1/3/6/9); não compõe nenhum --surface-shadow-*. Regra reproduzida com o atributo de encapsulamento real. |
| T3-1 | APROVADO | T3 | difícil → difícil | não | Header da Tabela background --gray-5. Hoje #f0f0f0. Depois #f8f8f8 = --gray-2 (token do DS). |
| T3-2 | APROVADO | T3 | médio → médio | não | Arredondamento da Tag de Interação --surface-rounder-sm. Hoje 4 px (vizinhas 4 px). Depois 16 px = --surface-rounder-lg. |
| T3-3 | APROVADO | T3 | médio → difícil **≠** | não | Ícone do Botão Terciário Home --blue-warm-vivid-70. Hoje #1351b4. Depois #005ea2 = --blue-vivid-60 (token). O texto do link Home acompanha; o crumb "Processos" não muda. Nível: dois azuis próximos; não se nota por comparação, só contra a regra. |
| T3-4 | APROVADO | T3 | difícil → difícil | não | Rótulo da Tab --font-size-scale-up-02. Hoje 20,16 px nos 3 rótulos. Depois 16,8 px = --font-size-scale-up-01. |
| T3-5 | APROVADO | T3 | muito difícil → muito difícil | sim | Sombra da superfície do Select --surface-shadow-md. Com a lista aberta: hoje 0 3px 6px rgba(0,0,0,.16). Depois 0 6px 6px = --surface-shadow-lg. O estilo inline persistiu ao abrir a lista. |
| T3-6 | APROVADO | T3 | difícil → difícil | não | Ação interna do Input: Button circular "sempre com densidade alta". Hoje 32×32 (--button-small). Depois 40×40 = --button-medium, ultrapassando o campo de 32 px (416–456 vs 418–450); o círculo aparece no hover. |
| T4-1 | APROVADO | T4 | difícil → difícil | não | Estado desabilitado opacity --surface-opacity-md. Hoje 0,45 nos 8 "Desassociar" desabilitados (habilitado = 1). Depois 1 (cursor continua not-allowed). "Limpar filtros" (outro componente) continua 0,45. |
| T4-2 | APROVADO | T4 | médio → médio | não | Item da Tab Ativo mostra em qual aba o usuário está. Reproduzido desde a inicialização reescrevendo no navegador o template compilado servido: "Aguardando análise" fica ativo enquanto o conteúdo continua o de Tramitando (tag "Meus processos", status em tramitação). A navegação entre abas continua funcionando. |
| T4-3 | APROVADO | T4 | muito difícil → muito difícil | sim | Hover: overlay da cor do primeiro plano com --surface-opacity-xs. Hoje rgba(19,81,180,.16) em hover. Depois rgba(19,81,180,0); "Exportar" mantém .16. |
| T4-4 | APROVADO | T4 | muito difícil → muito difícil | sim | Foco (fundo claro) borda --gold-vivid-40. Hoje borda e anel rgb(194,133,12). Depois rgb(19,81,180). O foco continua visível (2 px): não vira falha de acessibilidade geral. |
| T4-5 | APROVADO | T4 | muito difícil → muito difícil | sim | Hover do item da list do Select. Hoje overlay rgba(51,51,51,.16) sobre "25". Depois rgba(51,51,51,0). |
| T4-6 | REPROVADO (não observável) | — | muito difícil → — | sim | O "depois" descrito não acontece: o fundo do item selecionado fica transparente, mas o rótulo continua branco (label rgb(255,255,255) sobre lista branca), e o "10" desaparece da lista. Não fica "indistinguível dos demais", como o candidato diz. O efeito real é texto invisível, que também cai em contraste, fora do escopo DS. |

## Colisões

- T1-2 × T2-2: Mesmo elemento (span.content do avatar), mesmo atributo class na mesma linha. T1-2 desfaz a superfície circular cuja cor T2-2 altera.
- T1-6 × T2-1: T1-6 remove .br-table, que o seletor de T2-1 usa: construído junto, T2-1 deixa de pegar. (envolve candidato reprovado)
- T1-6 × T3-1: Idem: o seletor de T3-1 depende de .br-table. (envolve candidato reprovado)

Contatos que não são colisão:

- T2-4 e T3-2: mesma tag "Meus processos", mas elementos e propriedades diferentes (fonte do label e raio da superfície). Não é colisão.
- T3-5 e T4-5 (e T4-6, reprovado): mesmo template/lista do select, mas elementos e propriedades diferentes.
- T3-4 e T4-2: mesmo br-tab, mas propriedades diferentes (tamanho do rótulo e item ativo).
- T3-6 e T4-4: mesmo campo de busca, mas elementos diferentes (botão de ação interna e input interno).

## Observações gerais

- As 24 citações existem literalmente nos arquivos e nas linhas indicadas, e os 20 trechos "de" existem no fonte (os outros 4 são acréscimos). Ver `citacoes-conferidas.txt`.
- Os valores T2 e T3 foram resolvidos contra o `:root` servido (`tokens-root-conferente.json`, 1253 variáveis).
