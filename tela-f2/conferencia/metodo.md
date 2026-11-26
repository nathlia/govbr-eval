# Método da conferência

## Fontes usadas (e só estas)

- Pasta do seletor (`../selecao/`), somente leitura: lista de candidatos e alegações. Não reaproveitei as medidas dele; todas foram refeitas.
- Documentação do DS 3.7.0 (`ds-rules/govbr-ds-3.7.0-corpus/`), sem a subpasta `normalizacao/`.
- A página `http://127.0.0.1:3300/pnip-d/portal-mpa/processos?mock-perfil=mpa`, aberta com Playwright headless (Chromium) em janela de 1280×900. O Playwright foi resolvido por `createRequire` em `govbr-eval/node_modules/`.
- O código-fonte `pnip-mock/src/`, somente leitura, para conferir os trechos "de" e o contexto dos templates.

Não usei web, MCP nem git, e não mexi no servidor.

## Scripts (nesta pasta)

| Script | O que faz |
|---|---|
| `base.mjs` | Abre a página e define a busca que atravessa shadow DOM. |
| `conferir-citacoes.mjs` → `citacoes-conferidas.txt` | Para cada candidato, verifica se o trecho existe literalmente no arquivo citado e em qual linha. Mostra os cabeçalhos da seção e o contexto (±12 linhas), usado para ver se outro trecho contradiz a cláusula. Também confere se o trecho "de" existe no arquivo-fonte. |
| `explorar.mjs` → `tokens-root-conferente.json`, `pagina-conferente.png` | Tokens do `:root` servido (1253 variáveis) e captura da página inteira. |
| `sonda.mjs`, `sonda2.mjs`, `regras.mjs` | Estrutura do DOM, atributos de encapsulamento do Angular e regras CSS que casam com cada alvo. Mostram, por exemplo, que td/th são estilizados por regras `td, th` que não dependem de `.br-table`. |
| `verificar.mjs` → `medidas.json`, `recortes/` | Para cada candidato, abre um contexto novo (sem sessionStorage herdado), leva a página ao estado indicado (rolagem, hover, foco, abertura da lista, escolha de filtro), mede ANTES, aplica no navegador o equivalente da mudança e mede DEPOIS. As regras que seriam escritas em `.scss` de componente foram injetadas com o atributo `_ngcontent-*` real do elemento, para reproduzir a especificidade do encapsulamento emulado. |
| `extra.mjs` → `medidas-extra.json` | Cor do rótulo do item selecionado, para o candidato de estado selecionado. Árvore de acessibilidade (CDP) antes e depois, para o candidato de rótulo de botão. |
| `t15-funcao.mjs` | Confere que a remoção do filtro continua funcionando sem a classe. |
| `t42-rota.mjs` → `medidas-T4-2.json` | Reproduz desde a inicialização a ausência de `is-active`. O script intercepta, no navegador (`page.route`), o chunk JS servido e reescreve a lista de atributos compilada do `br-tab-item`. O código em disco não muda. |
| `gerar-veredictos.mjs` → `veredictos.json`, `veredictos.md` | Consolida os veredictos. |

## Critérios aplicados

1. **Cláusula.** O trecho tem de existir literalmente e prescrever o que o candidato diz. Li a seção inteira em volta. Se outro trecho da documentação permite o que a mudança produz, o candidato é reprovado.
2. **Tipo.** Apliquei a precedência T4 → T1 → T2/T3. Para T2 e T3, o valor computado depois da mudança foi comparado com o `:root` servido: escalas de espaçamento, tipografia, raio, offset, blur e opacidade, e os 491 hexadecimais da paleta.
3. **Conforme hoje.** Medi a propriedade-alvo no estado indicado.
4. **Observável.** O "depois" medido precisa coincidir com o descrito e violar a cláusula. Mudança sem diferença computada nem visual é reprovada, e também a que produz um efeito diferente do descrito.
5. **Realismo e escopo.** Verifiquei se a mudança quebra a função da página e se introduz uma falha de acessibilidade geral: nome acessível pela árvore AX, foco ainda visível, texto que some.
6. **Nível.** Usei as definições do enunciado. Discordância de nível não reprova.
7. **Colisões.** Conta como colisão o par que atinge o mesmo elemento e a mesma propriedade, ou em que uma mudança anula ou mascara a outra quando as duas são construídas juntas. Os contatos sem colisão aparecem listados à parte.

## Limites

- Não compilei a aplicação. Quase tudo foi reproduzido por DOM/CSS depois da renderização. A exceção é o candidato da Tab, reproduzido na carga.
- No candidato do título do header, a remoção foi feita no host depois da renderização. O veredito dele, porém, se apoia na documentação, não na medida.
