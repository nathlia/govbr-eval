# govbr-telas

Duas páginas web prontas para abrir no navegador, servidas por um servidor mínimo que usa só o
Node.js. Não há código-fonte a compilar nem dependência a instalar: a pasta `site/` já traz os
arquivos finais.

## O que é preciso

- **Node.js.** A versão usada está em `.node-version`. O servidor usa só módulos nativos, então
  qualquer Node.js 20.19 ou mais novo também o executa.
- Um navegador.

Não há `npm install`: o projeto não tem dependências.

## Iniciar

Na pasta do projeto:

```sh
npm start
```

ou, sem npm:

```sh
node server.mjs
```

O servidor escuta em `http://127.0.0.1:3300` e imprime os endereços das duas telas. `Ctrl+C`
encerra.

Outra porta: `node server.mjs --port 8080` (ou a variável de ambiente `PORT`). O servidor só aceita
conexões da própria máquina; para escutar em outra interface, use `--host` (ou `HOST`).

## Abrir as telas

| Tela | Endereço (porta padrão) |
|---|---|
| Solicitar serviço | <http://127.0.0.1:3300/solicitacao.html> |
| Vistorias | <http://127.0.0.1:3300/pnip/portal-mpa/vistorias?mock-perfil=mpa> |

**Solicitar serviço** é uma página única: um formulário de solicitação com o histórico de pedidos
anteriores.

**Vistorias** é uma aplicação de página única que roda inteira no navegador, com dados fictícios
(pessoas, documentos, embarcações e endereços inventados). O parâmetro `?mock-perfil=mpa` abre uma
sessão de demonstração já autenticada; sem ele, a aplicação leva à página de entrada. A aplicação
retira o parâmetro da barra de endereço depois de lido. O que for alterado nela vale enquanto a
página estiver aberta; recarregar volta ao estado inicial. Nenhuma das telas faz pedidos a outros
endereços.

## O que o servidor faz

- Serve somente os arquivos listados em `site-manifest.json`, a partir de `site/`. Se algum
  arquivo diferir do sha256 registrado no manifesto, o servidor não sobe.
- Sob `/pnip/`, um endereço sem extensão recebe `site/pnip/index.html` (rotas da aplicação de
  página única). O único endereço fora de `/pnip/` que aponta para dentro dela é o declarado em
  `routing.aliases` do manifesto.
- Qualquer outro endereço responde 404, sem listagem de pasta. Caminhos com `..`, barra invertida ou
  equivalentes codificados respondem 400. Métodos diferentes de GET e HEAD respondem 405.

## Conteúdo

| Arquivo | Papel |
|---|---|
| `server.mjs` | Servidor estático (somente módulos nativos do Node.js). |
| `site/` | Os arquivos servidos: `solicitacao.html` + `assets/`, e a aplicação em `pnip/`. |
| `site-manifest.json` | Origem dos arquivos, rotas e sha256 + tamanho de cada arquivo. |
| `package.json` | Só o script `npm start`; sem dependências. |
| `.node-version` | Versão do Node.js usada. |
| `.gitattributes` | Desliga a conversão de fim de linha do Git, para que os arquivos continuem idênticos ao manifesto depois de um clone. |

Os arquivos deste projeto são gerados por um exportador; não os edite à mão. Uma mudança em qualquer
página é uma nova versão do projeto, com novo manifesto.
