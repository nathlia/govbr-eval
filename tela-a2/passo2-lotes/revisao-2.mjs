// Revisão Codex 2 (NAT-110, 2026-10-30, sobre af1ff47) — aplicada por montar.mjs depois da revisão 1.
// Tudo ainda em RASCUNHO: nenhuma semente, nenhum sorteio. Evidência de construtibilidade em
// tela-a2/construtibilidade/resultado.json (core 3.7.0, Chromium headless 1280×900, sem oráculo).
//
// Exporta uma função que recebe o mapa `out` (id → entrada do passo 2) e o mapa `origem`, e:
//   1. aplica as decisões manuais por bloqueio (cadeias de duplicata, isolamento, Tag/Step, e-MAG 2.3/2.4,
//      conflitos achados na conferência de construtibilidade);
//   2. aplica os acoplamentos confirmados das declarações de efeitos (tela-a2/efeitos-lotes/lote-*.json,
//      classe "distinto"): a variante sai nos hospedeiros em que força a segunda infração; a regra sem
//      variante restante sai com motivo `acoplada`. Acoplamento "mesmo-observavel" não exclui (é a mesma
//      infração citável por duas frases) e vai para efeitos.json como norma concorrente.
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EF = join(HERE, "..", "efeitos-lotes");
const EVID = "tela-a2/construtibilidade/resultado.json";

const TAG_PRINCIPIO =
  "Princípio Tag/Step (revisão 2, aplicado a todas as unidades do componente tag): o marcador de concluído do Step é 'Componente Tag, do tipo Ícone' (step__designer.md, § Uso de Alertas). " +
  "Herda as cláusulas QUALITATIVAS de desenho da Tag que valem para o tipo Ícone e que o texto do Step não regula de outro modo (superfície obrigatória, altura fixa de uma linha, tipologia do botão terciário, categoria identificável por leitor de tela). " +
  "Não herda: (a) o que pertence só à implementação do br-tag (classe br-tag, BRTag, utilitários de cor); (b) as tabelas de especificação (tokens de alinhamento, cor, arredondamento, densidade, borda, iconografia), porque a tag contida em outro componente 'deve respeitar as orientações desses componentes' (tag__designer.md, § Distribuição) e o Step fixa o seu marcador — no texto (Iconografia do Step: fa-check, --icon-size-base, a2-2737953e2513) e na marcação oficial do core 3.7.0, medida em " + EVID + " (.step-alert 29,04 px, raio 50%, fundo --success, ícone centrado e branco); " +
  "(c) o que o texto do Step regula de outro modo (tooltip só para erro/alerta sem rótulo, step__designer.md, § Indicador e § Uso de Alertas).";

const MANUAL = {
  // ---------- bloqueio 1: cadeias de duplicata ----------
  "a2-1faa8ef238c0": { aceita: false, motivo: "duplicada:a2-35afb7e6ee7c", justificativa: "Revisão 2: 'O Tipo Circular precisa de texto alternativo para o ícone' tem o mesmo predicado (botão só com ícone tem alternativa em texto), a mesma condição (ícone carrega o sentido do botão) e o mesmo observável (nome acessível vazio) de a2-35afb7e6ee7c, que já é aceita com os mesmos hospedeiros (Fechar das mensagens, gatilhos dos tooltips e do select). A equivalência antiga com e-MAG 3.6 caiu: 3.6 trata de alt de imagem." },
  "a2-fee39db9eda4": {
    aceita: true,
    justificativa: "Revisão 2: restaurada como predicado DS próprio. 'title ou aria-label' no botão só com ícone exige um dos dois ATRIBUTOS, além de o botão ter nome. Não multiplica observável: a2-35afb7e6ee7c é o botão sem nome algum; a2-dc561d157556 é o botão sem aria-label mas com title; aqui o botão fica sem os dois atributos e com nome só pelo texto oculto. Medida: atributos title e aria-label ausentes no botão; nome acessível continua não vazio.",
    instancias: ["msg-pendencia", "msg-retorno", "tip-prazo", "tip-protocolo", "sel-tipo-documento"],
    variantes: [{ id: "nome-so-no-texto-oculto", descricao: "O botão só com ícone fica sem title e sem aria-label; o nome acessível continua vindo do texto oculto (span sr-only) dentro do botão (nos gatilhos dos tooltips, também do aria-labelledby).", clausula: "Ao utilizar botões com apenas ícones, certifique-se de usar os atributos title ou aria-label;" }],
    tipo: "estrutura-classe", caminhoDeteccao: ["medicao", "leitura-da-regra"],
  },
  // ---------- bloqueio 2 e conferência: variantes reescritas com evidência ----------
  "a2-dc561d157556": { _patch: true, variantes: [{ id: "nome-so-em-title", descricao: "O botão só com ícone perde o atributo aria-label; o mesmo nome fica no atributo title e no texto oculto (span sr-only), de modo que o nome acessível não muda (medido: 'Fechar', " + EVID + ").", clausula: "Inclua o atributo aria-label no componente" }] },
  "a2-615adba6e634": { _patch: true, justificativa: "Filhos com data-child igual ao data-parent do pai. Medida: data-child do input do switch de SMS contra o data-parent do principal. Revisão 2 (isolamento): a variante vem com implementação independente do vínculo, como a de a2-7c449a946697; a conferência mediu o grupo com a variante e o script próprio em 7 situações (só e-mail, os dois, só SMS, clique no principal intermediário, desmarcar, Espaço no SMS, Espaço no principal) e o comportamento é igual ao da página conforme; sem o script, o principal fica desmarcado com só o SMS ligado (" + EVID + ").", variantes: [{ id: "filho-com-grupo-errado", descricao: "O input do switch de SMS leva data-child com valor diferente do data-parent do principal; um script próprio da página, em arquivo .js, refaz o vínculo do SMS com o principal (estado intermediário, selecionar e desselecionar todos, teclado), de modo que o comportamento do grupo fica igual ao da página conforme.", clausula: "com o mesmo valor passado ao atributo data-parentdo checkbox \"pai\"" }] },
  // ---------- bloqueio 4: Tag/Step ----------
  "a2-7682991ef915": { _patch: true, justificativa: "Superfície obrigatória da Tag, herdada pelo marcador de concluído (princípio Tag/Step). Medida: background-color computado do marcador na 1ª etapa (conforme: --success, " + EVID + "). " + TAG_PRINCIPIO, variantes: [{ id: "tag-sem-superficie", descricao: "A tag de concluído da 1ª etapa fica sem superfície (fundo transparente); o ícone passa para a cor --success para continuar visível (contraste 4,59:1 sobre o branco, medido), sem tocar outro requisito.", clausula: "1 · Superfície · Fundamento Superfície · Obrigatório" }] },
  "a2-3584b59ba47f": { _patch: true, justificativa: "Tag com altura fixa: uma única linha de texto/ícone, herdada pelo marcador de concluído (princípio Tag/Step). Medida: altura do marcador (conforme 29,04 px) e número de ícones (conforme 1); a variante construída mede 58,06 px e 2 ícones (" + EVID + "). " + TAG_PRINCIPIO },
  "a2-86453e6d513e": { _patch: true, justificativa: "Categoria da Tag identificável por leitor de tela, herdada pelo marcador (princípio Tag/Step). Construção: a página conforme acrescenta texto oculto ', etapa concluída' ao botão da 1ª etapa (o core 3.7.0 não expõe o estado). Medida: nome acessível da 1ª etapa contém 'concluída' (conforme: '1 Envio , etapa concluída'; variante: '1 Envio', " + EVID + "). " + TAG_PRINCIPIO },
  "a2-5f5d70c647f1": { aceita: false, motivo: "acoplada", justificativa: "Revisão 2 (princípio Tag/Step): a cláusula é herdada, mas toda violação põe um botão dentro do marcador, que fica dentro do <button> da etapa (marcação oficial do Step no core 3.7.0). Botão dentro de botão não é HTML válido (conteúdo interativo proibido no modelo de conteúdo de button): na marcação, o analisador HTML tira o botão de dentro e o põe ao lado do botão da etapa; inserido por script, o botão fica aninhado e muda o nome e a sequência de foco da etapa (" + EVID + "). Viola junto e-MAG 1.1 (a2-671056d628cb, padrões web) e a interação da etapa: segunda infração. " + TAG_PRINCIPIO },
  "a2-27e932bb9636": { aceita: false, motivo: "conflito", justificativa: "Exige tooltip em tag só de ícone. Pelo princípio Tag/Step, o Step regula quando o seu marcador leva tooltip: só para erro/alerta quando não há rótulo (step__designer.md, § Indicador, atenção sobre Tooltip; § Uso de Alertas). A tela tem rótulos e o estado é Concluído; a página segue o Step, e a regra da Tag cede (tag__designer.md, § Distribuição: a tag contida segue as orientações do componente). " + TAG_PRINCIPIO },
  "a2-81ddb21026ec": { aceita: false, motivo: "conflito", justificativa: "Diz que só tags de status e contagem podem ter borda; a2-ba9a65432baa, no mesmo documento, diz que as de ícone (o tipo do marcador) possuem bordas opcionais: contradição interna da Tag. O Step só pede borda no marcador da etapa ATIVA (step__designer.md, § Uso de Alertas, Atenção); a 1ª etapa não é a ativa, e a página segue o CSS do Step no core 3.7.0 (sem borda). Nenhuma variante de borda é sorteável. " + TAG_PRINCIPIO },
  "a2-8b5cc7cc48fa": { aceita: false, motivo: "nao-se-aplica", justificativa: "Classe br-tag: pertence só à implementação do componente Tag. O marcador é desenhado pela marcação oficial do Step no core 3.7.0 (.step-alert dentro de .step-progress-btn, medido em " + EVID + "). " + TAG_PRINCIPIO },
  "a2-396037bd7d96": { aceita: false, motivo: "duplicada:a2-2737953e2513", justificativa: "Tabela Iconografia da Tag: a linha 'tag de ícone' (--icon-size-base) coincide com a Iconografia do Step para o ícone do estado Concluído (fa-check, --icon-size-base), que já é aceita no marcador: mesmo predicado e observável. As demais linhas são de tipos que a tela não tem. Construção: o core 3.7.0 desenha o ícone em 16,8 px; a página conforme fixa --icon-size-base (16 px), medido em " + EVID + ". " + TAG_PRINCIPIO },
  // ---------- bloqueio 5: e-MAG 2.3 / 2.4 ----------
  "a2-22240b8959ba": {
    aceita: true,
    justificativa: "e-MAG 3.1, Recomendação 2.3. Revisão 2: a manifestação é a atualização automática periódica da PÁGINA, no exemplo literal da cláusula (meta http-equiv=\"refresh\" com período, sem url), e não mutação parcial do DOM. Medida em sessão isolada (plano § 14.5): carga limpa, janela de 360 s, contar eventos load do documento (≥ 2 = recarga periódica) e ler a meta; sem aviso de atualização automática na página. A conferência mostrou o mecanismo com período reduzido: recargas aos 5,2 s e 10,2 s, e o estado S1 perdido depois da recarga (" + EVID + ").",
    instancias: ["pagina"],
    variantes: [{ id: "recarga-periodica", descricao: "O head ganha <meta http-equiv=\"refresh\" content=\"300\">: a página se recarrega sozinha a cada 300 s, sem aviso e sem controle para a pessoa.", clausula: "Não criar páginas com atualização automática periódica" }],
    tipo: "comportamento", caminhoDeteccao: ["medicao", "interacao"],
    notaProtocolo: "Protocolo de isolamento e tempo congelado no plano § 14.5 (período 300 s fixo, medidas dos demais estados em cargas novas e dentro de 120 s, a medida da 2.3 em contexto próprio).",
  },
  "a2-31b4a3f89649": {
    _patch: true,
    justificativa: "e-MAG 3.1, Recomendação 2.4. Revisão 2: a manifestação é redirecionamento automático para OUTRA página por marcação, como diz a cláusula ('redirecionar a uma nova página ... http-equiv com conteúdo refresh'); não é recarga da própria página nem fragmento. Medida em sessão isolada (plano § 14.5): meta refresh com url de outro documento no head e navegação do quadro principal para outro caminho dentro da janela de 660 s. A conferência mostrou o mecanismo com atraso reduzido: navegação para /outra.html aos 4,2 s (" + EVID + ").",
    variantes: [{ id: "redireciona-para-outra-pagina", descricao: "O head ganha <meta http-equiv=\"refresh\" content=\"600;url=meus-requerimentos.html\">: depois de 600 s na página, o navegador é levado sozinho para a página 'Meus requerimentos' (outro documento, o mesmo do link da trilha).", clausula: "Não devem ser utilizadas marcações para redirecionar a uma nova página, como o uso do atributo http-equiv com conteúdo “refresh” do elemento META." }],
    caminhoDeteccao: ["medicao", "interacao"],
    notaProtocolo: "Protocolo de isolamento e tempo congelado no plano § 14.5 (atraso 600 s fixo, destino fixo, medidas dos demais estados em cargas novas e dentro de 120 s, a medida da 2.4 em contexto próprio).",
  },
  // ---------- conferência de construtibilidade: conflito achado ----------
  "a2-235056fad007": { _patch: true, justificativa: "Tabela Ligado/Desligado: ligado = --blue-warm-vivid-40. Na tela: os dois switches. Medida: cor computada da chave do switch ligado (conforme: #5992ed = --blue-warm-vivid-40, " + EVID + "). Conflito registrado na conferência de construtibilidade: a linha Desligado desta tabela (--gray-40) contradiz a tabela Cor do próprio Switch (desligada --gray-20, a2-86176aff4a89); o core 3.7.0 desenha a chave desligada em #ccc = --gray-20 (medido). A página segue a especificação do componente (mais específica) e o core; a linha Desligado é conflito declarado, não defeito, e não tem variante." },
  // ---------- alternativas (Revisão 1 item 10, condição da Revisão 2): alternativa tem de ser conforme com TODAS as regras da página ----------
  "a2-18acbf7b4c9c": { _patch: true, alternativasValidas: [], notaRevisao2: "Alternativa 'sigla-com-abbr' retirada: a sigla só com abbr title na primeira ocorrência é exatamente a infração de a2-b1113ccfbc0a (aceita: na primeira vez, nome completo e a sigla entre parênteses); deixou de ser forma conforme da página." },
  // ---------- isolamento (bloqueio 2, generalizado): variantes de redação reescritas para não tirar outro conteúdo ----------
  "a2-0ea33ff35779": { _patch: true, variantes: [{ id: "erro-culpa-usuario", descricao: "A primeira frase da mensagem de erro passa a culpar a pessoa ('Você esqueceu de anexar o arquivo.'); o resto do texto conforme fica igual (por que ocorreu e o que fazer para enviar de novo), com o mesmo número de frases.", clausula: "Não culpe o usuário." }] },
  "a2-7e05c5c8e09c": { _patch: true, variantes: [{ id: "expressao-regional", descricao: "A mensagem ganha uma expressão regional no lugar de uma palavra neutra da abertura ('Bah, falta …' no lugar de 'Falta …'); todo o conteúdo conforme fica (o que falta, o que fazer e o prazo), sem frase nova.", clausula: "Não utilize palavras, expressões e gírias típicas de regiões do país." }] },
  "a2-909e5f61d661": { _patch: true, variantes: [
    { id: "retorno-zombeteiro", descricao: "A primeira frase da mensagem de erro do envio vira zombeteira ('Esqueceu o arquivo de novo?'), com o mesmo tamanho; por que ocorreu e o que fazer continuam no texto.", instancias: ["msg-retorno"], clausula: "Não zombe de seus usuários." },
    { id: "alerta-zombeteiro", descricao: "A frase de abertura do alerta de pendência vira zombeteira ('Ainda não mandou?'), com o mesmo tamanho; qual documento falta e o prazo continuam no texto.", instancias: ["msg-pendencia"], clausula: "Não zombe de seus usuários." }] },
  "a2-d6b3f0e36943": { _patch: true, variantes: [{ id: "jargao-tecnico", descricao: "A frase que diz por que o envio falhou vira jargão técnico ('Requisição sem a parte file do multipart.'); a frase do que fazer para enviar de novo fica igual à conforme.", clausula: "Os textos devem ser escritos em uma linguagem simples e fácil de serem compreendidas pelos usuários não técnicos." }] },
  "a2-46c418f28680": { _patch: true, variantes: [{ id: "rotulo-de-aba-longo", descricao: "O rótulo da 2ª aba fica 'Consultar e enviar documentos pendentes deste requerimento agora mesmo' (9 palavras, sem artigo).", clausula: "Portanto, esse tipo de microcopy precisa ser bem assertivo, conciso e com as palavras certas para impactar quem lê." }] },
  "a2-e0663017fccc": { _patch: true, variantes: [{ id: "importante-no-fim", descricao: "A mensagem de pendência troca a ordem das frases conformes: começa pela frase de contexto e só no fim diz qual documento falta e o prazo; nenhuma palavra é acrescentada nem retirada.", clausula: "A mensagem deve apresentar imediatamente o que é mais importante para o público-alvo." }] },
};

/** Acoplamentos "distinto" que a revisão 2 resolve de outro modo ou restringe a hospedeiros. */
const COUPLING_OVERRIDES = {
  "a2-615adba6e634|filho-com-grupo-errado": { resolvido: "variante reescrita com implementação independente do vínculo (bloqueio 2); comportamento medido igual ao conforme" },
  "a2-f4237d13520b|rotulo-desassociado": { hospedeiros: ["swt-aviso-email", "swt-aviso-sms", "chk-avisos-todos"] },
  // variantes de redação reescritas para manter todo o outro conteúdo (o acoplamento apontado era o conteúdo que a redação antiga tirava)
  "a2-0ea33ff35779|erro-culpa-usuario": { resolvido: "variante reescrita: mantém por que ocorreu e o que fazer" },
  "a2-7e05c5c8e09c|expressao-regional": { resolvido: "variante reescrita: mantém o que falta, o que fazer e o prazo" },
  "a2-909e5f61d661|retorno-zombeteiro": { resolvido: "variante reescrita: mantém por que e o que fazer" },
  "a2-909e5f61d661|alerta-zombeteiro": { resolvido: "variante reescrita: mantém o documento e o prazo" },
  "a2-d6b3f0e36943|jargao-tecnico": { resolvido: "variante reescrita: mantém o que fazer" },
  "a2-46c418f28680|rotulo-de-aba-longo": { resolvido: "variante reescrita: rótulo longo sem artigo" },
  "a2-e0663017fccc|importante-no-fim": { resolvido: "variante reescrita: só troca a ordem, sem acrescentar palavras" },
};

export function couplings() {
  const out = [];
  for (const f of readdirSync(EF).filter(x => /^lote-\d+\.json$/.test(x)).sort()) {
    const d = JSON.parse(readFileSync(join(EF, f), "utf8"));
    for (const [id, r] of Object.entries(d)) for (const s of r.acoplamentoSuspeito ?? []) out.push({ lote: f, regra: id, variante: s.variante, viola: s.viola.startsWith("a2-") ? s.viola : `a2-${s.viola}`, classe: s.classe, razao: s.razao, porque: s.porque });
  }
  return out;
}

export default function revisao2(out, origem) {
  const log = { manuais: [], acoplamentos: [] };
  for (const [id, e] of Object.entries(MANUAL)) {
    if (!out[id]) throw new Error(`revisão 2 fora do passo 2: ${id}`);
    if (e._patch) { const { _patch, ...rest } = e; if (!out[id].aceita) throw new Error(`patch em não aceita: ${id}`); out[id] = { ...out[id], ...rest }; }
    else out[id] = e;
    origem[id] = "revisao-2";
    log.manuais.push(id);
  }
  // princípio Tag/Step aplicado uniformemente às tabelas de especificação da Tag (antes: "não é br-tag")
  for (const [id, e] of Object.entries(out)) {
    if (!e.aceita && e.motivo === "nao-se-aplica" && /^A 'Tag de concluído' do Step é o marcador .step-alert/.test(e.justificativa ?? "")) {
      out[id] = { ...e, justificativa: "Tabela de especificação da Tag: não se aplica ao marcador do Step pelo princípio Tag/Step (b); tabelas de tipos que a tela não tem (interação, texto, status, contagem, entrada) também não têm hospedeiro. " + TAG_PRINCIPIO };
      origem[id] = "revisao-2";
      log.manuais.push(id);
    }
  }
  // acoplamentos confirmados (classe "distinto")
  const byVar = new Map();
  for (const c of couplings().filter(c => c.classe === "distinto")) {
    const k = `${c.regra}|${c.variante}`;
    if (COUPLING_OVERRIDES[k]?.resolvido) continue;
    byVar.set(k, [...(byVar.get(k) ?? []), c]);
  }
  for (const [k, cs] of byVar) {
    const [id, vid] = k.split("|");
    const e = out[id];
    if (!e?.aceita) continue;
    const v = e.variantes.find(x => x.id === vid);
    if (!v) throw new Error(`acoplamento cita variante inexistente: ${k}`);
    const hostsOfV = v.instancias ?? e.instancias;
    const drop = COUPLING_OVERRIDES[k]?.hospedeiros ?? hostsOfV;
    const keep = hostsOfV.filter(h => !drop.includes(h));
    const motivo = cs.map(c => `${c.viola} (${c.razao})`).join("; ");
    let variantes = e.variantes.map(x => (x.id === vid ? (keep.length ? { ...x, instancias: keep } : null) : x)).filter(Boolean);
    const instancias = e.instancias.filter(h => variantes.some(x => !x.instancias || x.instancias.includes(h)));
    const acopladas = [...(e.variantesAcopladas ?? []), { id: vid, hospedeiros: drop, viola: cs.map(c => c.viola), porque: motivo }];
    if (!variantes.length) {
      out[id] = { aceita: false, motivo: "acoplada", justificativa: `Revisão 2 (isolamento): toda variante força segunda infração distinta — ${acopladas.map(a => `${a.id} → ${a.porque}`).join(" | ")}. (Antes: ${e.justificativa})` };
    } else {
      out[id] = { ...e, instancias, variantes, variantesAcopladas: acopladas };
    }
    origem[id] = "revisao-2";
    log.acoplamentos.push({ regra: id, variante: vid, hospedeirosRetirados: drop, regraSaiu: !variantes.length });
  }
  return log;
}
