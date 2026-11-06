# B1 — recusa de evidência de rotas diferentes no mesmo achado

Implementação local de 06/11/2026, NAT-111, lista 3.7.3. Não é julgamento de correção,
equivalência de registros ou crédito: o coletor apenas detecta referências medidas de rotas
distintas citadas em `findings[i].evidence` do mesmo achado.

## Fonte e limites

O harness monta o diretório da ponte do oráculo **somente leitura** no coletor quando a imagem
travada declara `govbr.collector.route-guard=collector-route-guard-1.0.0`. A montagem não entra no
agente. O coletor lê os eventos no POST, antes de gravar o relatório aceito. Evento concluído
`oracle/call`, `outcome:ok`, sem erro, de `scan_page` ou `get_finding_details` é elegível.

A URL vem exclusivamente de `state.observed.url` da resposta ou do ledger entregue. URL pedida
nos argumentos ou no topo da resposta não comprova destino final depois de navegação/redirect.
Continuações podem herdar a rota de um scan previamente identificado. Só o scan e seus próprios
ids estruturados de achado/membro/família/pendência são associados; `alsoIn`, estado anterior,
`sessionPending`, texto normativo e consultas normativas ficam fora do índice. Conflito entre
metadado de elemento e rota medida fica sem associação. Id reutilizado em mais de uma rota é
ambíguo, e não sustenta recusa.

A identidade de rota segue `routeKeyOf` da sessão do oráculo: origem + caminho sem barra final,
com fragmento somente para rotas SPA `#/…`/`#!/…` e sem query desse fragmento. Query normal de
paginação/filtro e âncora comum não constituem outra rota. IDs de registros no caminho continuam
distintos; nenhuma equivalência entre registros é inferida.

Somente tokens inteiros em `evidence` são comparados. Dois ou mais vínculos não ambíguos para
rotas distintas produzem HTTP 400 `mixed-routes`, com índice do achado, referências e orientação
para separar os relatos. O corpo recusado fica em `refused/`; reenvio corrigido continua possível.
Referência desconhecida, prova incompleta ou contexto indisponível não produz recusa. Os eventos
de aceitação registram `checked` e `unavailable` quando o contexto foi armado. Isso é um gate
parcial: não prova que o relatório representa uma única rota nem que o estado foi alcançado.

Resultados inline exigem hash de evento correto. Payload integral exige status completo,
tamanho e hash do payload e do resultado; caminhos ficam em `payloads/` e são conferidos por
`realpath`, inclusive contra links para fora. Limites: 16 MiB de eventos e 2 MiB por payload;
incompletude, falha ou excesso ficam indisponíveis.

## Compatibilidade e verificação

Imagem histórica sem a capacidade declarada conserva o comportamento anterior; o runner não
afirma B1 nessa condição. Reconstruir imagem do coletor e atualizar lock é obrigatório para ativar
este comportamento numa campanha futura. Nenhuma imagem/lock/campanha foi alterada nesta fatia.

`npm run test:inspecao` contém sete testes novos, incluindo HTTP real do coletor com recusa,
preservação do corpo e reenvio corrigido, IDs de itens e colisões, query/SPA, navegação, payload
íntegro/adulterado/caminho externo, contexto incompleto e seleção da capacidade pelo rótulo.
`tsc --noEmit` verifica o código do harness. Testes locais não substituem `test:runner` com imagens
novas nem o ensaio integrado exigido antes da próxima campanha.
