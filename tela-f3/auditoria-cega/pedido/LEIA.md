# Auditoria de afirmações — instruções (texto a entregar ao auditor)

Você é um auditor independente. Outro auditor faz o mesmo trabalho sem ver o seu. Seu número de auditor (1 ou 2) vem
no pedido que você recebeu.

## O que você pode usar

- Esta pasta (`pedido.json`, `LEIA.md`, `servir.mjs`), só leitura.
- A página servida em http://127.0.0.1:3340/pnip-f3/portal-mpa/processos?mock-perfil=mpa (já está no ar; se não responder, veja `pedido.json › pagina.comoServir`).
  Abra-a num navegador (por exemplo Playwright/Chromium headless, janela 1280×900, fuso America/Sao_Paulo), meça e use
  a página (clicar, escolher, passar o mouse, teclado), com um contexto novo por afirmação.
- A documentação do DS 3.7.0 em `F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus/`, **sem** a subpasta `normalizacao/`.

## O que você não pode usar

Nenhum outro arquivo do disco (nenhum repositório, nenhuma pasta `.tmp-eval` fora desta e da sua pasta de saída,
nenhum código-fonte da aplicação), nenhuma ferramenta de validação automática (validadores de design system, axe ou
similares), nenhum servidor MCP, nenhuma busca na web. Não mude nada na página servida nem no servidor. Num diálogo
de confirmação de assinatura, clique sempre em "Cancelar", nunca em "Assinar".

## Tarefa

Para cada uma das 24 afirmações de `pedido.json`: alcance o estado de `comoChegar`, ache o elemento
(`elemento` é um seletor CSS; `>>>` entra no shadow root do hospedeiro) e verifique, medindo e usando a página, se a
página mostra exatamente o que `aPaginaMostra` diz. Confira também se cada trecho de `documentacao` existe literalmente
no arquivo. Algumas afirmações são verdadeiras e outras falsas; não há cota.

## Saída

Crie `F:/Dev Nath/TCC/.tmp-eval/tela-f3-auditoria/auditor-<n>/respostas.json` (n = seu número), uma entrada por id:

```json
{
 "auditor": "<n>",
 "pedidoSha256": "<sha256 de pedido.json, que você calcula>",
 "respostas": [
  { "id": "A-01", "veredicto": "verdadeira | falsa | indecidivel", "violaClausula": "sim | nao | nao-se-aplica",
    "clausulaConfere": "sim | nao", "juizDecide": "sim | nao", "medida": "<o que você mediu>", "nota": "<opcional>" }
 ]
}
```

`violaClausula`: só para afirmação `verdadeira` (a página mostra o fato; o fato contraria o trecho citado?); para
`falsa` ou `indecidivel`, `nao-se-aplica`. `juizDecide`: `sim` se um juiz com só a página e a frase decidiria sem
ambiguidade; `nao` se a frase deixa dúvida sobre elemento, estado ou fato (diga qual em `nota`). Pode guardar
medidas e capturas na sua pasta de saída. Não altere nada nesta pasta.
