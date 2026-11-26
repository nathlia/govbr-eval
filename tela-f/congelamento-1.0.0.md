# Tela F (processos-f): congelamento da referência 1.0.0 (2026-11-26)

## O que foi congelado

A referência é `ground-truth-processos-f.json` 1.0.0, na raiz do govbr-eval, ramo `tela-f`. Ela foi gravada num
commit só dela, o último da cadeia de congelamento.

| Campo | Valor |
|---|---|
| versão | `1.0.0` |
| sha256 | `d32088bfd7ecb44c2bf75de58f95f425047aa0b2180e80dad9fefbec24d5b3e0` (também em `tela-f/ground-truth-processos-f.sha256`) |
| suite | `processos-f` |
| rota | `/pnip-f/portal-mpa/processos?mock-perfil=mpa` |

**Página congelada com ela** (`tela-f/pagina-congelada.json`, sha256 `d0d3330f…3d63681`):
- ala `pnip-f`, com 190 arquivos e lista `195f1e47b4dea2fb0281d47de0f35e2de59d9048e01eace8b57bc45a453955b0`;
- govbr-corpus, ramo `tela-f`, commit `157a3cc` (`public/pnip-f/` + manifesto), com a mesma lista, conferida
  arquivo a arquivo;
- build do `pnip-mock`, ramo `tela-f`, commit `f8905a8`;
- base de comparação: o build sem semente da ala, lista `e694a39f…`.

Arquivos congelados com a referência (sha256):

| Arquivo | sha256 |
|---|---|
| `tela-f/niveis-1.0.0.json` (formato `tela-f-niveis-1.0.0`, cita a referência acima) | `6ea71d3b4347be06389445616a811aa3b3676b21f900ef465df50f013ccc6977` |
| `tela-f/criterios-de-julgamento-sem-predicado.json` | `3daa97943b657ad0334846e3f99f6f943cf90462bdcc26d1571d6b5efd3a9ef2` |
| `tela-f/classes-nat71/classes-finais.json` (NAT-71, 25 specs) | `f5bbae958acf8dfd1b821765ccc0312c049f4431bfb13bf47c82087ab69936de` |
| `tela-f/classes-d156-1.0.0.json` (ds × geral) | `a81e319185cdc770b6aa7d7345aa5d22ba19d6ca0fe7c58a5d90ed1fb58b3f8f` |
| `tela-f/conformes.json` (10 controles) | `1cdb4cfbe35307337bba800120855d3224fb25573e2837c718435a66ad1b2e39` |
| `tela-f/sem-id-mapeado-1.0.0.json` | `a7a6a07c37e447601b1c32c6aab876507955e6b919ac5576d7dcbd88692d65f4` |
| `tela-f/conferencia-ids-base.json` | `bb2c8f9421592cc3655aded0cee5b794d4bdb920ca24eeff22f14c9f0e6b4a51` |
| `tela-f/auditoria-cega/chave.json` · `resultado.json` | `76edd9b1…a4678` · `2673e12d…6f0` |
| `tela-f/composicao.json` · `filtros.json` | `0529b7bd…d27c` · `f0766081…cb54` |

## Contagens

- **25 specs, 77 unidades.**
  - Estrato semeado: F-01…F-12, com 20 unidades, 3 por nível, todas classe `ds`.
  - Estrato natural: as 13 specs da D 1.1.0, sem mudança, com 57 unidades.
  - Estrato exposto: D-11…D-14, dentro do natural.
- **Estados:** 4 paradas em 3 segmentos. O `setup` tem 2 passos `navigate`, e só os segmentos 0 e 2 têm paradas.
  - Segmento 0: inicial e lista-exibir (as paradas da D, intactas).
  - Segmento 1: passagem pela rota de vistorias, sem parada.
  - Segmento 2: filtro-escolhido e lista-filtro.
- **Predicados de aceitação:** 11 das 12 semeadas, todos `sustenta`. A F-11 fica `nao-implementado`, com critério
  escrito.
- **Controles conformes: 10, não 12.** Só há 10 elegíveis na página semeada. Foi usado o procedimento da D, sem
  sorteio; saem K-06, K-11 e K-12 da D e entra breadcrumb-orientacao.
- **Ids:** 12 ids das semeadas na base servida pelo oráculo congelado, 12 casam; 1 spec sem id mapeado (F-12); 19
  ids das naturais existem.
- **Confirmação cega:**
  - Semeadas confirmadas pelos 2 auditores: 12 de 12.
  - Iscas falsas nos 2: 12 de 12.
  - Descrições reescritas: 0.
- **NAT-71:**
  - Acordo 1×2 em classe: 10/12; em nível: 12/12.
  - 2 desempates pelo classificador 3; 0 sem maioria.
  - 13 classes herdadas da D.
  - Total: layout/visual 13, contextual/relacional 7, sintático 4, semântico 1; nível b 19, a 5, c 1.

## Conferências

Todas sem modelo, sem oráculo e sem axe na página F.

| Passo | Resultado |
|---|---|
| `check-reference` (`scripts/check-reference.ts`, entrada `processos-f` temporária em `telas.json`, sem commit) sobre `corpus-tela-f/public/pnip-f` servido | 0 problemas; 25 specs, 77 unidades, 4 estados; 11/11 predicados sustentam (`conferir-referencia-1.0.0.log`) |
| O mesmo no build sem semente (rascunho) | os 11 predicados refutam (`conferir-referencia-sem-semente-rascunho.log`) |
| Naturais e controles com o código da D (`remedida-d/`), nos dois builds | evidência das 13 naturais idêntica; 0 coviolações |
| Construção (`construcao/`) | 12/12 pegaram, 0 diferenças sem atribuição; diff do fonte = lista de mudanças, 12/12 |
| Ids × base servida (`conferir-ids-base.mjs`) | 12/12 + 1 sem id confirmado + 19/19 naturais |
| Auditoria cega (`auditoria-cega/`) | 12/12 semeadas confirmadas pelos dois; 12/12 iscas falsas pelos dois |
| Classes D-156 (`tela-d/classes-d156.ts`) | 13 ds e 8 geral entre as 21 não expostas; as 12 semeadas são ds |

## Limitações declaradas

1. **Defeitos curados, não sorteados.** Escolheu um agente cego ao oráculo, conferiu um segundo, e os filtros
   foram mecânicos. A cegueira é de quem escolheu, não de quem construiu o projeto.
2. **Os níveis** são juízo de agentes, não validado com pessoas. O arquivo de níveis fica fora da referência.
3. **A F-12 não tem id na base do oráculo:** a coluna fundamentada não a credita por id.
4. **Controles: 10, não 12.**
5. **Lacunas da construção:**
   - pseudo-elementos não foram comparados (nenhuma spec depende deles);
   - não há diff de pixels, porque as alturas das páginas diferem;
   - duas mudanças nas mesmas células foram atribuídas a um id só. Foram medidas à parte e não interferem
     (`lacunas-construcao.json`).
6. **Os estados novos** dependem de uma ida e volta por navegação. Na medida, a árvore do segmento 2 é igual à de
   uma entrada direta.
7. **O portão de teto (§ 5) ainda não rodou.** Ele aceita ou rejeita a composição inteira; se rejeitar, a
   recomposição fixada é sair F-03 e F-06 e entrar R-03 e R-04, com reconstrução e nova referência.
