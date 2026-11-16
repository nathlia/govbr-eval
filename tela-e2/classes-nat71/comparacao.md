# Classes pré-registradas da tela E (protocolo NAT-78 §5.3, NAT-71 §3) — duas classificações cegas, 16/11/2026

Dois classificadores novos e cegos, cada um com as definições da NAT-71 §3.1–3.2, a §5.3 do protocolo
congelado e as specs da referência `cadastro-pais` 1.0.0 (sha256
`661cc54b7b291bc6e455065ecb23c08e5279bf7a0e9c7d6494afd78ae112c528`), sem ver o outro (fontes lidas:
campo `definicoes`/`nota` de cada arquivo). Nove specs: as 8 da referência principal (U-01…U-08) e U-09, que só existe na variante
de sensibilidade `comU09` (fora da referência principal, DV-01). Arquivos: `classificador-1.json`
(sha256 `9a12c094191cc0f4971fb6cee21bae4f43e64371ef5b91d78bc12bce11b7e0fb`), `classificador-2.json`
(sha256 `f506a406c38359cebe3162861227927f089f92fa2f0344f211ea897785843dcc`).

**Estado: acordo total. Nenhum desacordo; nenhuma decisão da autora foi necessária.**

| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | | Limítrofe (1) | Limítrofe (2) |
|---|---|---|---|---|---|---|---|---|
| U-01 | contextual/relacional | contextual/relacional | igual | b | b | igual | sim | sim |
| U-02 | semântico | semântico | igual | c | c | igual | não | não |
| U-03 | contextual/relacional | contextual/relacional | igual | b | b | igual | sim | sim |
| U-04 | layout/visual | layout/visual | igual | a | a | igual | sim | sim |
| U-05 | layout/visual | layout/visual | igual | b | b | igual | sim | sim |
| U-06 | semântico | semântico | igual | b | b | igual | sim | sim |
| U-07 | layout/visual | layout/visual | igual | a | a | igual | não | não |
| U-08 | contextual/relacional | contextual/relacional | igual | b | b | igual | não | não |
| U-09 (só `comU09`) | layout/visual | layout/visual | igual | b | b | igual | sim | sim |

Acordo: classe 9/9; nível de automatizabilidade 9/9 (na referência principal, 8/8 e 8/8). A marca de
limítrofe também coincide nas nove.

## Nível a

U-04 e U-07 são nível a nos dois classificadores, e os dois nomeiam a mesma ferramenta e a mesma regra:
U-04, Stylelint `declaration-property-value-allowed-list` com a mesma configuração; U-07, axe-core
`color-contrast`. Os dois deixaram versão e testes "a verificar". A condição da NAT-71 §3.2
(implementação e testes positivos e negativos) está documentada em `documentacao-nivel-a.md`, no
modelo usado na tela D: duas de duas com documentação completa, testes upstream lidos e não executados
localmente; U-04 com a ressalva de que a configuração com `font-family` não está no comparador L
congelado e não tem teste próprio.

## Decisão

Não há desacordo de classe nem de nível, então nada vai à autora pela §5.3. A classificação final é a
dos dois classificadores (`origem: "acordo"` nas nove), em `classes-finais.json`.
