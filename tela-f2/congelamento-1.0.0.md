# Tela F2 — congelamento da referência 1.0.0 (26/11/2026)

`ground-truth-processos-f2.json` 1.0.0, sha256 `0725eb73be600002e7e26c173cd54ec3389416c30e6b089173439fd103f910c9`,
congelada no commit `9e77e7a` do ramo `tela-f2` do govbr-eval (commit só com a referência). Este registro e os arquivos
selados vão no commit seguinte. Nenhuma `main` tocada, nada enviado; oráculo, axe, detectores e MCP não rodaram na F2.

## Arquivos selados

| Arquivo | sha256 |
|---|---|
| `ground-truth-processos-f2.json` | `0725eb73be600002e7e26c173cd54ec3389416c30e6b089173439fd103f910c9` |
| `tela-f2/estratos-1.0.0.json` (`--selar`: cita a referência congelada) | `f67902715f9422d3c9ebfd10b59f04087045dafb3ba73e0e783120d3152c89de` |
| `tela-f2/criterios-de-julgamento.json` (25/25 specs; cita a referência congelada) | `f8484475ad6997259fbc00b109bb018d7865940a7a66e6be1f2033db5a726efd` |
| `tela-f2/conformes.json` (9 controles) | `1edb72b6dd158888e9b6c983a48c05d326a65e5c127a41906fa3fb6655f3fa97` |
| `tela-f2/classes-nat71/classes-finais.json` | `7205775719a78130dc2f5c6559d2ab5a0d475934c462312aa6ba64357b6ba90c` |
| `tela-f2/classes-d156-1.0.0.json` (ds × geral) | `83859de8edd97c80155e64d5baff11f0a56e26f7889fbc9106e33a3663d846f9` |
| `tela-f2/pagina-congelada.json` (190 arquivos, lista `b113879f…`; corpus `tela-f2` `a7d6ccd`) | `191a552d364508aedd58a078960da1bbca8e1975aeca6b139e72e44a90443ff7` |
| `tela-f2/auditoria-cega/chave.json` | `bdd33db3084d69be7bf8dd94f49fba2df4981f7b6f31a1030f7dfef466e71730` |
| `tela-f2/auditoria-cega/resultado.json` | `59c7051581a2b4e849d8ed2f9e164d562d231fdc708b65e16ccf4730b76650dc` |

## O que foi conferido

| Item | Resultado |
|---|---|
| Confirmação cega (2 auditores, 24 afirmações) | 12/12 semeadas confirmadas pelos dois; 12/12 iscas falsas nos dois; 0 respostas "o juiz não decide"; 0 descrições reescritas |
| NAT-71 (2 classificadores cegos) | acordo de classe 12/12 e de nível 12/12; nenhum desempate; classificador 3 não foi preciso; 13 naturais herdadas da D |
| Classes D-156 | não expostas: 21 = 13 ds + 8 geral; as 12 semeadas são ds; expostas 4 (geral) |
| `check-reference` final na ala do corpus (`a7d6ccd`, servida em 3320) | 0 problemas; 11/11 predicados sustentam (`conferir-referencia-1.0.0.log`) |
| Construção | 12/12 semeadas violadas no semeado e conformes no sem semente (`conferencia-construcao.json`, medida sobre o rascunho `d7ddb717…`, mesmas specs) |
| Naturais | evidência do código da D idêntica nos dois builds (`remedida-d/`) |
| Ids × base servida | 10/10 casam; 3 sem id confirmadas; 19/19 ids das naturais existem |
| Estratos e critérios | aceitos pela própria bancada (`conferirEstratos`, `criteriosParaOJuiz`, `regraDaTela`: primário 12) |

## Achado das auditorias sobre as abas (registro)

Os dois auditores notaram que, na carga, a aba marcada como ativa não é a que o texto da receita de estado nomeava, e
que uma afirmação pede clicar nas abas para conferir o conteúdo. Medido em três páginas (ala da D, build sem semente,
build semeado): a D e o sem semente marcam a mesma aba; só o semeado marca outra. Categoria: efeito de uma mudança
semeada, e é o próprio efeito pretendido dela (o defeito de uma spec semeada), não efeito colateral sobre outra spec;
nenhuma contagem, âncora ou predicado das outras specs muda (conferência da bancada e evidência da D idênticas). O erro
estava só no texto das receitas, que nomeava o estado inicial pelo rótulo da aba. Corrigido antes do congelamento, sem
mudar estado, passo nem spec: a nota da parada `inicial` (herdada da D) e o "como se alcança" dos critérios passam a
dizer "carga da rota, sem clicar em nenhuma aba". O pacote da auditoria já respondido fica como está (a frase não mudou
o sentido de nenhuma afirmação: os dois auditores decidiram todas).

## Limites

1. Curada por agente cego ao oráculo e conferida por um segundo; não sorteada. Nível oficial = o menor entre seletor e
   conferente (decisão do orquestrador).
2. 9 controles conformes, não 12 (só 9 elegíveis depois das exclusões; procedimento da D sem sorteio).
3. Uma natural (D-14) reancorada no mesmo elemento; descrição, classe e evidência iguais às da D.
4. Pacotes das auditorias e da NAT-71 montados sobre rascunhos (`d7ddb717…`); as specs semeadas que eles mostram são
   idênticas às da referência congelada (conferido em `fechar-1.0.0.mjs`).
