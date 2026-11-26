# Classificação de specs (NAT-71) — tela F2, processos

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
 "referencia": "specs.json (tela F2, processos-f2 1.0.0)",
 "referenciaSha256": "d7ddb7179862ffb7ce9e59432fa72c64af6dd806daecdc9db3a11d8cce00adee",
 "definicoes": "<o que você leu: arquivos desta pasta>",
 "specs": [
  { "id": "F2-01", "classe": "sintático | layout/visual | contextual/relacional | semântico", "automatizabilidade": "a | b | c", "limitrofe": true, "motivo": "<uma a três frases, citando a definição>" }
 ]
}
```

Uma entrada por spec, todas as 12 (F2-01, F2-02, F2-03, F2-04, F2-05, F2-06, F2-07, F2-08, F2-09, F2-10, F2-11, F2-12).

## Herança (nota para quem monta o pedido; não muda a sua tarefa)

A referência da F2 tem também 13 specs naturais (D-01…D-14), idênticas às da referência 1.1.0 da tela D (byte a byte;
a D-14 só com outro seletor para o mesmo elemento), que já têm classe final (duas classificações cegas e a decisão da autora, `tela-d/classes-nat71/classes-finais.json`).
O procedimento da D (§5.3) classifica o texto da spec, sem navegador e sem ferramenta: para uma spec idêntica, a
entrada da classificação é a mesma, e o procedimento não exige refazê-la. Por isso essas 13 herdam a classe final da D
(registrado em `heranca-naturais.json`, fora deste pedido) e só as 12 specs F2-01…F2-12 vêm a você.
