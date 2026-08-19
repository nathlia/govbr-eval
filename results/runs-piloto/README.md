# runs-piloto/

Execução piloto de 2026-07-11 (`claude-fable-5`), sobre o corpus de **26 casos** que existia então.

Fica aqui, e não em `results/runs/`, porque o diretório é o que informa o rótulo da configuração
ao scorer (D-17). O scorer **lê** este diretório: a execução aparece no relatório como um grupo
próprio, com aviso de cobertura parcial, e nunca é agregada com as execuções atuais.

Por que não é comparável: modelo diferente (`fable-5` × `opus-5`, ver política em D-17) **e**
corpus diferente. O piloto julgou 26 dos 52 casos do gabarito atual — as outras unidades não
existiam, então a revocação dele é limitada por construção, não por desempenho. O scorer detecta
isso sozinho, contando quantos casos do gabarito a execução de fato julgou.

Mesmo princípio do D-13 (orgânico × injetado) e do D-16 (braços da ablação): **nunca agregue
configurações diferentes.** Narrativa completa em `docs/pilot-run-2026-07-11.md`.
