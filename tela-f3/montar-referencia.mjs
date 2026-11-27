/**
 * Tela F3 — monta a referência ground-truth-processos-f3.json 1.0.0 (adendo 3 de 27/11 § 4 e § 7; adendo da F § 4
 * "Referência da F", mantido pelos adendos 2 e 3). Molde: tela-f2/montar-referencia.mjs.
 *
 * Estrato natural: as 13 specs da referência 1.1.0 da D copiadas sem mudança, com a MESMA exceção registrada da F2: a
 * âncora da D-14 (`pnip-header .br-avatar .content`) deixa de casar na página semeada, porque a mudança M-02 (F3-02,
 * mantida da F2-02) tira a classe `content` do mesmo elemento; a D-14 passa a `pnip-header .br-avatar > span` (o mesmo
 * elemento), descrição intacta (medida em tela-f3/remedida-d/).
 * Estrato semeado: F3-01…F3-12 de tela-f3/semeadas.mjs (lista da autora, adendo 3 § 3), com os ids das cláusulas na
 * base congelada; sem id, `_meta.semIdMapeado`. Estados: tela-f3/estados.mjs (seis paradas em nove segmentos).
 * Tipo, subtipo, nível, interação, origem e controle da varredura NÃO entram na referência: ficam só em
 * tela-f3/estratos-1.0.0.json.
 * Uso: node tela-f3/montar-referencia.mjs [--forcar] → ground-truth-processos-f3.json
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ALA, PARADAS, SETUP } from "./estados.mjs";
import { ANCORA_D14, SEMEADAS } from "./semeadas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SAIDA = join(RAIZ, "ground-truth-processos-f3.json");
if (existsSync(SAIDA) && !process.argv.includes("--forcar")) { console.error("ground-truth-processos-f3.json já existe (use --forcar antes do congelamento)"); process.exit(1); }
const sha = b => createHash("sha256").update(b).digest("hex");
const ler = p => readFileSync(join(RAIZ, p));
const dBuf = ler("ground-truth-processos-1.1.0.json"), D = JSON.parse(dBuf);
const confBuf = ler("tela-f3/conformes.json"), conformes = JSON.parse(confBuf);
const semBuf = ler("tela-f3/semeadas.mjs"), estBuf = ler("tela-f3/estados.mjs");

// D: o segmento 0 é o setup da D sem mudança
if (JSON.stringify(SETUP.slice(0, 2)) !== JSON.stringify(D._meta.setup)) throw new Error("segmento 0 ≠ setup da D");
const NOTAS = {
  inicial: "carga da rota, sem clicar em nenhuma aba: a lista paginada de processos em tramitação, com \"Meus processos\" ligado — primeiro paint (nota da D reescrita sem nomear a aba marcada, como na F2)",
  "lista-exibir": "lista do seletor \"Exibir\" (itens por página) da paginação aberta — última parada do segmento 0",
  "assinatura-cancelada": "segmento 2 (depois de ida e volta por navegação, a rota recomeça): na lista da carga, com \"Meus processos\" ligado, a caixa da 2ª linha marcada (a 1ª caixa da lista); o botão de ação em lote aparece abaixo da tabela; o diálogo de assinatura aberto por ele e CANCELADO (nunca \"Assinar\"); a linha continua marcada e o botão continua visível",
  "pagina-2": "segmento 4: aba \"Concluídos\" (14 itens) e \"Página seguinte\": página 2, itens 11 a 14",
  "exibir-25": "segmento 6: aba \"Concluídos\" e, no seletor \"Exibir\" da paginação, a opção 25: a tabela mostra as 14 linhas",
  "filtro-removido": "segmento 8 (o último, porque a página guarda o filtro escolhido na sessão): filtro \"Aberto há\" aberto, opção \"Últimos 60 dias\" escolhida (a lista continua com as mesmas 9 linhas) e, depois, um clique no × da tag do filtro escolhido",
};
const states = PARADAS.map(p => {
  const d = D._meta.states.find(s => s.id === p.id);
  if (d && d.afterStep !== p.afterStep) throw new Error(`${p.id}: afterStep ≠ D`);
  return { ...(d ?? { id: p.id, afterStep: p.afterStep }), id: p.id, afterStep: p.afterStep, path: p.path, note: NOTAS[p.id] };
});

const semeadas = SEMEADAS.map(s => {
  const rules = s.clausulas.flatMap(c => c.rules);
  const { id, anchor, scope, expectedCount, participantCount, state, acceptance, categories, description } = s;
  return { id, anchor, scope, expectedCount, ...(participantCount ? { participantCount } : {}), state, ...(acceptance ? { acceptance } : {}), rules, categories, description };
});
const semId = Object.fromEntries(SEMEADAS.filter(s => s.clausulas.every(c => c.rules.length === 0)).map(s => [s.id, { arquivo: s.clausulas[0].arquivo, trecho: s.clausulas[0].trecho }]));

const naturais = D.violations.map(v => JSON.parse(JSON.stringify(v)));
const d14 = naturais.find(v => v.id === "D-14");
const ancoraD14Antes = d14.anchor;
d14.anchor = ANCORA_D14;
const exp = D._meta.exposto.specs;

const ref = {
  _meta: {
    version: "1.0.0",
    status: "RASCUNHO — não congelado. Falta o que está em tela-f3/pendencias-congelamento.md (auditoria cega das semeadas, classes NAT-71 e D-156, conferência final na ala do corpus, sha256 do arquivo de estratos e dos critérios, congelamento).",
    version_note: "1.0.0 (rascunho de 27/11/2026): tela F3 do terceiro estudo de seguimento (adendo-3-tela-f3-protocolo-2026-11-27.md). Estrato semeado F3-01…F3-12 (lista da autora, adendo 3 § 3; tela-f3/semeadas.mjs) + estrato natural = as 13 specs da referência 1.1.0 da D (sha256 " + sha(dBuf) + "), sem mudança fora a âncora da D-14 (ver _meta.estratos.natural.reancoradas).",
    page: "Processos do portal MPA do PNIP — tela F3 (terceiro estudo de seguimento; cópia da rota da tela D na ala pnip-f3, com os defeitos do DS da lista da autora no fonte), aplicação real em modo mock",
    url: ALA + "?mock-perfil=mpa",
    waitFor: D._meta.waitFor,
    suite: "processos-f3",
    ds: D._meta.ds,
    unit_of_evaluation: D._meta.unit_of_evaluation,
    viewport: D._meta.viewport,
    setup: SETUP,
    setup_rationale: "Segmento 0 = as duas paradas da D sem mudança (inicial; lista-exibir). Cada estado novo fica num segmento próprio, depois de ida e volta pela rota de vistorias (navegação por caminho dentro da SPA, sem recarga; segmentos 1, 3, 5 e 7, sem parada), porque cada um mexe na lista (marca uma linha, troca de aba e de página, muda os itens por página, aplica um filtro) e, no mesmo segmento, quebraria a aditividade e as contagens das specs da D — a mesma razão da F2. Ordem (medida nos dois builds, tela-f3/sondas/): a página guarda na sessão o \"Meus processos\" desligado e os filtros escolhidos, mas não a aba, a página, os itens por página nem a linha marcada; nenhum segmento desliga \"Meus processos\", e o do filtro é o último, porque no build semeado o × não tira o filtro e ele ficaria na sessão para os segmentos seguintes. Assim cada segmento começa como uma entrada direta na rota (conferido em tela-f3/conferir-arvores.json). Segmento 2: marcar a caixa da 2ª linha, abrir o diálogo do botão de ação em lote e clicar em Cancelar (nunca em Assinar). Segmento 4: aba \"Concluídos\", \"Página seguinte\". Segmento 6: aba \"Concluídos\", \"Exibir\" → 25. Segmento 8: \"Aberto há\" → \"Últimos 60 dias\" (a opção da F2, que mantém as 9 linhas) e o × da tag do filtro escolhido.",
    states,
    estratos: {
      semeado: { nota: "Defeitos do DS injetados no fonte da rota pela lista da autora (adendo 3 § 3): o primário da F3, por spec. Toda spec aqui é classe ds pela D-156 3.i; nenhuma é exposta. Tipo, subtipo, nível, exigência de interação, origem e marca de controle da varredura de cada uma estão só em tela-f3/estratos-1.0.0.json.", specs: semeadas.map(s => s.id) },
      natural: { nota: "As 13 specs da referência 1.1.0 da D (ids, unidades, rules, descrições e exposição sem mudança), reconferidas nos dois builds da F3 pelo código da D (tela-f3/remedida-d/); uma só muda de âncora, pelo motivo registrado em `reancoradas` (a mesma troca da F2).", specs: naturais.map(v => v.id),
        reancoradas: { "D-14": { antes: ancoraD14Antes, depois: ANCORA_D14, motivo: "a mudança semeada M-02 (F3-02, mantida da F2-02) tira a classe `content` do conteúdo interno do avatar, e a âncora da D deixa de casar; a nova âncora resolve o mesmo elemento (o primeiro filho de .br-avatar, com a letra) nos dois builds", medida: "tela-f3/remedida-d/semeada-d14.log e sem-semente-d14.log: a evidência da D-14 é idêntica nos dois builds" } } },
      exposto: { nota: "O casco, como na D (adendo da D § E): dentro do estrato natural.", specs: [...exp] },
    },
    exposto: { nota: D._meta.exposto.nota, specs: [...exp] },
    semIdMapeado: {
      nota: "Specs semeadas cuja cláusula não tem registro na base que o oráculo congelado serve (govbr-ds-validator congelado-3.7.12; tela-f3/conferencia-ids-base.json): ficam sem id em `rules`, com o trecho literal e o arquivo da documentação (adendo 2 § 4 item 4, \"id na base: registro, não filtro\", mantido pelo adendo 3). A coluna fundamentada só credita por id as que têm id.",
      specs: semId,
    },
    conformes: {
      nota: `Controles conformes (protocolo NAT-78 § 5.2: denominador da taxa de falso alarme). Procedimento da D (tela-d/sortear-conformes.mjs) com as âncoras e os hospedeiros das mudanças das semeadas somados à exclusão de elemento-âncora (como na F e na F2): saem ${conformes.substituicao.saem.join(", ")} da D; ${conformes.elegiveis.length} elegíveis ≤ 12, sem sorteio: ${conformes.itens.length}, não 12. Re-medidos nos dois builds pelo código da D (tela-f3/remedida-d/). Arquivo irmão com sha256.`,
      arquivo: "tela-f3/conformes.json",
      sha256: sha(confBuf),
      total: conformes.itens.length,
      porQue: `${conformes.itens.length}, não 12: só ${conformes.itens.length} elegíveis depois das exclusões (procedimento da D, sem sorteio)`,
      itens: conformes.itens.map(({ id, deD, state, selector, count, rules, medida }) => ({ id, deD, state, selector, count, rules, medida })),
    },
    fundo: D._meta.fundo,
    fora_de_escopo: "Como na D (abaixo), menos o que os estados novos trazem para dentro: a linha marcada, o botão de ação em lote e o diálogo de assinatura aberto e cancelado (parada assinatura-cancelada); a aba \"Concluídos\" clicada, a página 2 dela e o seletor \"Exibir\" com 25 (pagina-2, exibir-25); a tag do filtro escolhido e o clique no × dela (filtro-removido); e o texto do rótulo dos botões de ação (a F3 tem um caso de redação de rótulo, adendo 3 § 3). Fora continuam: a aba \"Aguardando análise\" clicada, \"Meus processos\" desligado, a lista aberta dos filtros, outros filtros e opções, outras páginas e outras quantidades por página, \"Assinar\" do diálogo (nunca clicado), o SweetAlert2 do \"Desassociar\", \"Exportar\", \"Ver processo\", números de processo, o clique nos links do breadcrumb e no \"Voltar\" (navegam ou recarregam), menu do avatar, a rota de vistorias atravessada pela navegação (segmentos 1, 3, 5 e 7, sem parada), outras janelas e zoom, linguagem e microcopy fora dos rótulos de ação, conteúdo das fixtures, regras só da base literal. Texto da D: " + D._meta.fora_de_escopo,
    nunca_agregar_com: "ground-truth-processos.json, ground-truth-processos-1.1.0.json (tela D), ground-truth-processos-f.json (tela F), ground-truth-processos-f2.json (tela F2) e todas as referências listadas na D: " + D._meta.nunca_agregar_com,
    baselines: D._meta.baselines,
    origem: {
      referenciaD: { arquivo: "ground-truth-processos-1.1.0.json", version: D._meta.version, sha256: sha(dBuf) },
      semeadas: { arquivo: "tela-f3/semeadas.mjs", sha256: sha(semBuf) },
      estados: { arquivo: "tela-f3/estados.mjs", sha256: sha(estBuf) },
      estratos: "tela-f3/estratos-1.0.0.json (id da spec semeada → tipo, subtipo, nível, interação, origem, controle da varredura; fora da referência)",
      construcao: "tela-f3/construcao/ (cópia das provas do construtor, .tmp-eval/pnip-f3-construcao: 12/12 M passaram na medida, 7/7 mudanças da F2 que saíram voltaram ao valor sem semente, 0 diferenças sem atribuição; build semeado lista 30b16f0d…; pnip-mock tela-f3 088a086; govbr-corpus tela-f3 9d194d7)",
      remedidaNaturais: "tela-f3/remedida-d/ (código da D na ala pnip-f3, nos dois builds)",
      idsNaBase: "tela-f3/conferencia-ids-base.json",
    },
  },
  violations: [...semeadas, ...naturais],
};
writeFileSync(SAIDA, JSON.stringify(ref, null, 1) + "\n");
const u = ref.violations.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
console.log(`specs ${ref.violations.length} (semeado ${semeadas.length}, natural ${naturais.length}, exposto ${exp.length}); unidades ${u} (semeado ${semeadas.reduce((n, v) => n + v.expectedCount, 0)}); estados ${states.length}; predicados ${semeadas.filter(s => s.acceptance).length}/${semeadas.length}; sem id ${Object.keys(semId).join(", ")}; sha256 ${sha(readFileSync(SAIDA))}`);
