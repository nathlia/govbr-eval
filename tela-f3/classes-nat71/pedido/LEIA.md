# Classificação de specs (NAT-71) — tela F3, processos

Você é um classificador independente. Classifique cada spec de `specs.json` por **classe do defeito**
(sintático, layout/visual, contextual/relacional, semântico) e por **nível de automatizabilidade** (a, b, c),
usando só as definições de `definicoes.md` (NAT-71 §3.1–3.2 e protocolo NAT-78 §5.3, copiadas literalmente).

## Condições (as mesmas das telas D e E)

- Leia só os arquivos desta pasta. Não abra navegador, página, repositório, ferramenta de validação nem nenhum
  outro arquivo; não procure outras classificações. Outro classificador faz o mesmo trabalho sem ver o seu.
- A classe é propriedade do defeito e do que é preciso observar para decidi-lo (§3.1), não de qual ferramenta o
  detectaria. O nível é um eixo separado (§3.2): **a** = há predicado implementado em ferramenta, com positivos e
  negativos que passam (diga qual ferramenta e qual regra, se for o caso); **b** = predicado determinístico
  escrevível, não implementado ou não testado; **c** = exige interpretação de significado.
- Uma spec pode ter mais de uma parte: classifique pela parte que a spec efetivamente cobra (§3.1, linha
  "Semântico"). Se ficar entre duas classes, escolha uma, marque `limitrofe: true` e diga entre quais e por quê.
- `criterios-de-julgamento.json` é leitura auxiliar (o que um juiz olha em cada spec); não muda as definições.

## Saída

Escreva `classificador-<seu número>.json` (o número vem no pedido que você recebeu) nesta pasta, no formato:

```json
{
 "arquivo": "classificador-<n>",
 "referencia": "specs.json (tela F3, processos-f3 1.0.0)",
 "referenciaSha256": "c8d1a84effc8312a36e1c67eec7ae45b4a220b44338040fa7ba0f6cf6e01e861",
 "definicoes": "<o que você leu: arquivos desta pasta>",
 "specs": [
  { "id": "F3-01", "classe": "sintático | layout/visual | contextual/relacional | semântico", "automatizabilidade": "a | b | c", "limitrofe": true, "motivo": "<uma a três frases, citando a definição>" }
 ]
}
```

Uma entrada por spec, todas as 12 (F3-01, F3-02, F3-03, F3-04, F3-05, F3-06, F3-07, F3-08, F3-09, F3-10, F3-11, F3-12).

## Herança (nota para quem monta o pedido; não muda a sua tarefa)

A referência da F3 tem também 13 specs naturais (D-01…D-14), idênticas às da referência 1.1.0 da tela D (byte a byte;
a D-14 só com outro seletor, a mesma troca da F2, para o mesmo elemento), que já têm classe final (duas classificações cegas e a decisão da autora, `tela-d/classes-nat71/classes-finais.json`).
O procedimento da D (§5.3) classifica o texto da spec, sem navegador e sem ferramenta: para uma spec idêntica, a
entrada da classificação é a mesma, e o procedimento não exige refazê-la. Por isso essas 13 herdam a classe final da D
(registrado em `heranca-naturais.json`, fora deste pedido) e só as 12 specs F3-01…F3-12 vêm a você.
