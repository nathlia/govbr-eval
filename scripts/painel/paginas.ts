/**
 * Painel de resultados (T8a, T8a.2) — HTML das páginas. Gerado no servidor a partir das vistas de
 * `modelo.ts`/`revisao.ts`; nenhum número é calculado aqui. Todo texto passa por `esc`: achados,
 * seletores e motivos vêm do agente ou do arquivo e são dado não confiável.
 *
 * T8a.2: cada execução tem um id curto (o slot, `p01-sem`) que aparece igual em toda lista, aviso e
 * URL; a página inicial é o estado das execuções por campanha e par; cada aviso é uma frase
 * "<id>: o que aconteceu — o que fazer"; a comparação com × sem usa a linguagem visual da página
 * Resultados do painel do TCC (números grandes, barras lado a lado, "provisório" bem visível, n dito).
 * Estilo: só `painel.css` (servida em /estilo.css).
 */
import type { Arm } from "../../contracts/index";
import type { EntradaIndice } from "../arquivo-resultados";
import {
  campanhasDoPlacar, dataLocal, frase, placarDaCampanha, type Fonte, type Placar, type InfoCampanha, type LinhaExecucao, type ResultadoBraco, type ResultadoPar, type Selo, type Valor,
  type VistaExecucao, type VistaExecucoes, type VistaPar, type VistaParResumo,
} from "./modelo";
import { DICA_CRLF, rotuloEtapa, type Diagnostico } from "./preparar";
import type { VistaCartao, VistaFila } from "./revisao";

export const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const u = (s: string): string => encodeURIComponent(s);
const BRACO: Record<Arm, string> = { sem: "sem oráculo", com: "com oráculo" };
const BRACO_T: Record<Arm, string> = { sem: "Sem oráculo", com: "Com oráculo" };

/** O que toda página sabe do painel aberto: o arquivo servido e se é a fixture sintética. */
export interface Contexto { arquivo: string; fixture: boolean }

export function selo(s: Selo): string {
  return `<span class="selo s-${esc(s.estado)}">${esc(s.texto)}</span>`;
}
/** Estado bom vira texto discreto com ✓; estado que pede atenção vira pílula. */
function estado(s: Selo): string {
  return s.estado === "ok" ? `<span class="feito">${esc(s.texto)}</span>` : selo(s);
}
const chip = (a: Arm | null): string => a ? `<span class="braco-chip ${a}">${esc(BRACO[a])}</span>` : `<span class="braco-chip">braço não registrado</span>`;

const pct = (v: number | null | undefined): string => v === null || v === undefined ? "indisponível" : `${(v * 100).toFixed(1).replace(".", ",")}%`;
const pp = (v: number | null): string => v === null ? "indisponível" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1).replace(".", ",")} p.p.`;
const sinal = (v: number | null): string => v === null ? "indisponível" : v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0";
export function duracao(s: number | null): string {
  if (s === null) return "tempo desconhecido";
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m} min${r ? ` ${r} s` : ""}` : `${r} s`;
}
const usd = (v: number | null): string => v === null ? "desconhecido" : `US$ ${v.toFixed(2).replace(".", ",")}`;

export function pagina(o: { titulo: string; ativo?: "execucoes" | "guia" | "ajuda" | null; ctx: Contexto; corpo: string; script?: string }): string {
  const link = (href: string, nome: string, id: string) => `<li><a href="${href}"${o.ativo === id ? ' aria-current="page"' : ""}>${nome}</a></li>`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.titulo)} · Painel de resultados</title><link rel="stylesheet" href="/estilo.css"></head><body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<header class="barra">${o.ctx.fixture ? `<div class="fixture" role="note"><div class="in">FIXTURE SINTÉTICA — estes dados são inventados para testar o painel. Não são resultado científico.</div></div>` : ""}
<div class="barra-dentro"><a class="marca" href="/">Painel de resultados</a>
<nav aria-label="Principal"><ul>${link("/", "Estado das execuções", "execucoes")}${link("/guia", "Guia em diagramas", "guia")}${link("/ajuda", "Como usar", "ajuda")}</ul></nav></div>
<p class="arquivo-aberto">Arquivo aberto: <span class="mono">${esc(o.ctx.arquivo)}</span></p></header>
<main id="conteudo">${o.corpo}</main>
${o.script ? `<script>${o.script}</script>` : ""}
</body></html>`;
}

// ───────────────────────────────────────────────────────────────── linhas de execução (página inicial, par)

function linhaExec(x: LinhaExecucao): string {
  const achados = x.achados.estado === "sem-pacote" ? "" : x.achados.estado === "vazia" ? selo({ estado: "findings-vazio", texto: "0 achados — lista vazia aceita" })
    : x.achados.estado === "lista" ? `<b>${esc(x.achados.total)}</b> achado${x.achados.total === 1 ? "" : "s"}`
    : selo({ estado: "sem-submissao", texto: x.achados.estado === "recusada" ? "relatório recusado (não é 0)" : x.achados.estado === "ilegivel" ? "findings.json ilegível" : "nenhum relatório (não é 0)" });
  const falhou = x.tecnico.estado !== "ok";
  const semPacote = x.achados.estado === "sem-pacote";
  // sem pacote não há isolamento, oráculo, envio nem pontuação a mostrar: uma pílula só, sem repetir "sem pacote"
  const estados = semPacote ? estado(x.tecnico)
    : `${estado(x.tecnico)} ${estado(x.isolamento)} ${estado(x.oraculo)} ${x.envio.estado === "ok" ? "" : estado(x.envio)} ${estado(x.publicacao)} ${estado(x.pontuacao)}`;
  return `<li class="exec">
<a class="id-exec" href="${esc(x.url)}" title="${esc(x.chave)}">${esc(x.id)}</a>
${chip(x.braco)}
<span class="selos">${estados}</span>
<span class="numeros">${achados}${x.achados.estado === "sem-pacote" ? "" : `<br>${esc(duracao(x.duracaoS))}`}</span>
${falhou && x.causaCurta ? `<p class="causa">${esc(x.causaCurta)}</p>` : ""}
</li>`;
}

// ───────────────────────────────────────────────────────────────── avisos: uma frase cada

export interface Aviso { alvo: string; texto: string; ajuda: string | null; nivel: "falha" | "atencao" | "info"; ensaio: boolean }

function semDicaCrlf(m: string): string { return m.replace(DICA_CRLF, "").trim(); }

/** Os avisos do arquivo inteiro, no formato "<id>: o que aconteceu — o que fazer". Nunca log nem stack. */
export function avisosDoArquivo(v: VistaExecucoes, preparo: Record<string, Diagnostico>): Aviso[] {
  const out: Aviso[] = [];
  // "de ensaio" só separa avisos quando há campanha real ao lado; num arquivo só de ensaios (a fixture), todos são os avisos.
  const reais = v.campanhas.some(c => c.natureza !== "ensaio");
  const ensaio = (c: string) => reais && v.campanhas.find(x => x.id === c)?.natureza === "ensaio";
  const parQ = (p: VistaParResumo) => v.pares.some(o => o.par === p.par && o.campanha !== p.campanha) ? `${p.par} (${p.campanha})` : p.par;
  if (v.crlf) {
    out.push({ alvo: "arquivo", nivel: "falha", ensaio: false, ajuda: "/ajuda#finais-de-linha",
      texto: "o Git desta máquina trocou os finais de linha do clone (CRLF) — todo arquivo de texto deixa de ter o sha256 que o workflow registrou e a preparação recusa a análise; corrija o clone uma vez com os três comandos de “Finais de linha” e recarregue." });
  }
  for (const i of v.ilegiveis) out.push({ alvo: i.arquivo, nivel: "falha", ensaio: false, ajuda: null, texto: `entrada do índice ilegível (${frase(i.erro, 100)}) — ela fica fora das listas; confira o arquivo no clone (git status, git pull).` });
  for (const x of v.execucoes) {
    const e = ensaio(x.campanha);
    if (x.publicacao.estado === "falha" && x.tecnico.texto.includes("sem pacote")) {
      out.push({ alvo: x.idQualificado, nivel: "falha", ensaio: e, ajuda: "/ajuda#falhas", texto: `interrompida sem pacote${x.causaCurta ? ` (${x.causaCurta})` : ""} — não há o que recuperar; um novo disparo do slot é uma nova tentativa.` });
      continue;
    }
    if (x.tecnico.estado === "falha") out.push({ alvo: x.idQualificado, nivel: "falha", ensaio: e, ajuda: "/ajuda#falhas", texto: `a execução ${x.tecnico.texto}${x.causaCurta ? ` (${x.causaCurta})` : ""} — abra o resumo técnico; um novo disparo do slot é uma nova tentativa.` });
    else if (x.envio.estado === "falha") out.push({ alvo: x.idQualificado, nivel: "falha", ensaio: e, ajuda: "/ajuda#falhas", texto: `${x.envio.texto} — isso não é “0 achados”; abra o resumo técnico para ver por quê.` });
    if (x.isolamento.estado === "falha") out.push({ alvo: x.idQualificado, nivel: "falha", ensaio: e, ajuda: "/ajuda#falhas", texto: "isolamento violado — a execução não serve para análise; veja no resumo técnico qual parede falhou." });
    if (x.publicacao.estado === "publicacao-indisponivel") out.push({ alvo: x.idQualificado, nivel: "atencao", ensaio: e, ajuda: "/ajuda#publicacao", texto: `${x.publicacao.texto} — no GitHub, abra a execução do workflow e use Re-run failed jobs (só o arquivar roda; o modelo não é chamado).` });
  }
  for (const p of v.pares) {
    const e = ensaio(p.campanha);
    if (p.faltando.length && !p.porDesenho) out.push({ alvo: parQ(p), nivel: "info", ensaio: e, ajuda: "/ajuda#estados", texto: `par incompleto, falta o braço ${p.faltando.map(a => BRACO[a]).join(" e ")} — não há comparação até esse braço chegar ao arquivo (um novo disparo do slot).` });
    for (const a of p.avisos) out.push({ alvo: parQ(p), nivel: "falha", ensaio: e, ajuda: "/ajuda#recalcular", texto: a.replace(new RegExp(`^${p.par.replace(/[.]/g, "\\.")}:\\s*`), "") });
    const d = preparo[`${p.campanha}/${p.par}`];
    if (d?.ultimaFalha && d.pode) {
      out.push({ alvo: parQ(p), nivel: "atencao", ensaio: e, ajuda: "/ajuda#preparar", texto: `a preparação parou na etapa “${rotuloEtapa(d.ultimaFalha.etapa)}” (${frase(semDicaCrlf(d.ultimaFalha.motivo), 160).replace(/[.]$/, "")}) — resolva a causa e clique em Tentar de novo no par.` });
    } else if (d && !d.pode && !d.foraDeAlcance && d.motivo && !/já existe análise/.test(d.motivo)) {
      out.push({ alvo: parQ(p), nivel: "atencao", ensaio: e, ajuda: "/ajuda#preparar", texto: `não dá para preparar a análise (${frase(semDicaCrlf(d.motivo), 160).replace(/[.]$/, "")})${d.motivo.includes(DICA_CRLF) ? " — a causa provável é a dos finais de linha, no primeiro aviso" : " — veja o motivo completo na página do par"}.` });
    }
  }
  return out;
}

function listaAvisos(xs: Aviso[]): string {
  return `<ul class="avisos">${xs.map(a => `<li class="${a.nivel}"><b class="alvo">${esc(a.alvo)}</b>: ${esc(a.texto)}${a.ajuda ? ` <a href="${esc(a.ajuda)}">Como resolver</a>` : ""}</li>`).join("")}</ul>`;
}

// ───────────────────────────────────────────────────────────────── placar (NAT-58): resultados de relance

const SELO_PLACAR: Record<string, Selo["estado"]> = { final: "final", provisorio: "provisoria", indisponivel: "nao-se-aplica", "sem-analise": "sem-analise", "um-braco": "nao-se-aplica" };

function cartaoPlacar(p: Placar, preparoLink: (par: string) => string): string {
  const c = p.info;
  const n = (v: number | null) => v === null ? "—" : String(v);
  const numeros = !p.total ? `<p class="placar-nada">Campanha de um braço só (pelo desenho): não há comparação com × sem.</p>`
    : `<p class="placar-numeros"><span class="n com">com <b>${esc(n(p.somaCom))}</b></span><span class="x" aria-hidden="true">×</span><span class="n sem">sem <b>${esc(n(p.somaSem))}</b></span></p>
<p class="pequeno">unidades da referência confirmadas · <strong>pares finais: ${p.finais} de ${p.total}</strong>${p.finais ? ` · soma só dos finais (n = ${p.finais})${p.somaTotal !== null ? `, de ${p.somaTotal}` : ""}` : " · nenhum par final ainda, sem soma"}</p>`;
  const comNumeros = p.linhas.filter(l => l.resultado && (l.selo === "final" || l.selo === "provisorio"));
  const barras = comNumeros.length ? `<div class="placar-pares">${comNumeros.map(l => `<a class="placar-par" href="/par/${u(c.id)}/${u(l.par)}">${barrasPar(l.resultado!, { titulo: `${l.par} · ${l.selo === "final" ? "FINAL" : "PROVISÓRIO"}` })}</a>`).join("")}</div>` : "";
  const faltas = p.linhas.filter(l => l.falta);
  return `<article class="placar" aria-labelledby="pl-${esc(c.id)}">
<h3 id="pl-${esc(c.id)}"><span class="mono">${esc(c.id)}</span> ${selo({ estado: c.natureza === "formal" ? "ok" : c.natureza === "calibracao" ? "aviso" : "nao-se-aplica", texto: c.natureza === "calibracao" ? "calibração — não é resultado (D-67)" : c.rotulo })}</h3>
${numeros}${barras}
${p.linhas.length ? `<ul class="placar-selos">${p.linhas.map(l => `<li><a href="/par/${u(c.id)}/${u(l.par)}">${esc(l.par)}</a> ${selo({ estado: SELO_PLACAR[l.selo], texto: l.seloTexto })}</li>`).join("")}</ul>` : ""}
${faltas.length ? `<div class="placar-falta"><h4>O que falta</h4><ul>${faltas.map(l => `<li><a href="${l.falta === "pronto para preparar" ? preparoLink(l.par) : `/par/${u(c.id)}/${u(l.par)}`}">${esc(l.par)}</a>: ${esc(l.falta)}</li>`).join("")}</ul></div>` : ""}
</article>`;
}

/** O placar do topo da página inicial: uma ficha por campanha que não é ensaio, e o botão do RESULTADOS.md. */
function placares(v: VistaExecucoes, preparo: Record<string, Diagnostico>): string {
  if (!v.execucoes.length) return "";
  const { mostradas } = campanhasDoPlacar(v);
  return `<section class="placares" aria-labelledby="t-placar"><h2 id="t-placar">Resultados de relance</h2>
<p class="pequeno suave">Unidades da referência confirmadas na revisão cega, por campanha. Só os pares FINAIS entram na soma; o n está dito. Números de summary.json da revisão atual de cada par.</p>
<div class="placar-grade">${mostradas.map(c => cartaoPlacar(placarDaCampanha(c, v.pares, preparo), par => `/par/${u(c.id)}/${u(par)}#preparar`)).join("")}</div>
<div class="botoes"><button type="button" class="sec" data-resumo>Atualizar RESULTADOS.md</button></div>
<p class="msg" id="msg-resumo" role="status" aria-live="polite"></p></section>`;
}

const SCRIPT_RESUMO = `
document.querySelectorAll("[data-resumo]").forEach(function(b){b.addEventListener("click",async function(){
  var msg=document.getElementById("msg-resumo"); b.disabled=true; msg.className="msg"; msg.textContent="Gravando RESULTADOS.md…";
  try{ var r=await fetch("/api/resumo",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}); var j=await r.json();
    if(j.ok){ msg.className="msg ok"; msg.textContent="RESULTADOS.md gravado na raiz do clone ("+j.campanhas+" campanha"+(j.campanhas===1?"":"s")+"). O commit fica com você."; }
    else { msg.className="msg erro"; msg.textContent="Não gravado: "+String(j.erro).split("\\n")[0]; }
  }catch(e){ msg.className="msg erro"; msg.textContent="Sem resposta do painel: "+e; }
  b.disabled=false;
});});`;

// ───────────────────────────────────────────────────────────────── página inicial: estado das execuções

/** Os quadros do topo. Com campanhas reais no arquivo, ensaios ficam fora (eles têm a seção dobrada deles). */
function tiles(v: VistaExecucoes, preparo: Record<string, Diagnostico>): string {
  const reais = v.campanhas.some(c => c.natureza !== "ensaio");
  const conta = (c: string) => !reais || v.campanhas.find(x => x.id === c)?.natureza !== "ensaio";
  const execs = v.execucoes.filter(x => conta(x.campanha)), pares = v.pares.filter(p => conta(p.campanha));
  const varias = new Set([...execs.map(x => x.campanha), ...pares.map(p => p.campanha)]).size > 1;
  const linkPar = (p: VistaParResumo) => `<a href="/par/${u(p.campanha)}/${u(p.par)}">${esc(varias ? `${p.campanha} · ${p.par}` : p.par)}</a>`;
  const linkExec = (x: LinhaExecucao) => `<a href="${esc(x.url)}">${esc(x.idQualificado)}</a>`;
  const falharam = execs.filter(x => x.tecnico.estado !== "ok" || x.envio.estado === "falha");
  const vazios = execs.filter(x => x.achados.estado === "vazia");
  const incompletos = pares.filter(p => p.faltando.length && !p.porDesenho);
  const revisar = pares.filter(p => p.selo.estado === "pendente");
  const preparar = pares.filter(p => preparo[`${p.campanha}/${p.par}`]?.pode);
  const finais = pares.filter(p => p.selo.estado === "final");
  const tile = (rot: string, xs: string[], classe: string, vazio: string) => `<div class="tile ${xs.length ? classe : ""}"><div class="rot">${esc(rot)}</div>
<div class="valor">${xs.length}</div><div class="ids">${xs.length ? xs.join("") : `<span class="suave">${esc(vazio)}</span>`}</div></div>`;
  return `<div class="tiles">
${tile("Falharam", falharam.map(linkExec), "falha", "nenhuma execução")}
${tile("0 achados (lista vazia)", vazios.map(linkExec), "atencao", "nenhuma execução")}
${tile("Pares incompletos", incompletos.map(linkPar), "atencao", "nenhum par")}
${tile("Prontos para preparar", preparar.map(linkPar), "", "nenhum par")}
${tile("Aguardando revisão", revisar.map(linkPar), "", "nenhum par")}
${tile("Comparação final", finais.map(linkPar), "", "nenhum par")}
</div>${reais && v.campanhas.some(c => c.natureza === "ensaio") ? `<p class="pequeno suave">Os quadros não contam ensaios; eles estão no fim da página.</p>` : ""}`;
}

function blocoPar(p: VistaParResumo, xs: LinhaExecucao[], d: Diagnostico | undefined): string {
  const href = `/par/${u(p.campanha)}/${u(p.par)}`;
  const acao = d?.pode ? `<a class="acao" href="${href}#preparar">${d.ultimaFalha ? "Tentar preparar de novo" : "Preparar análise"} →</a>`
    : p.selo.estado === "pendente" && p.analise ? `<a class="acao" href="/revisao/${u(p.campanha)}/${u(p.par)}">Abrir fila de revisão →</a>`
    : p.analise ? `<a class="acao" href="${href}">Ver comparação →</a>` : `<a class="acao" href="${href}">Abrir par →</a>`;
  const linhas = (["sem", "com"] as Arm[]).map(a => {
    const doBraco = xs.filter(x => x.braco === a);
    if (doBraco.length) return doBraco.map(linhaExec).join("");
    return p.porDesenho ? "" : `<li class="exec vazio"><span class="id-exec">—</span>${chip(a)}<span class="selos">${selo({ estado: "par-incompleto", texto: "falta este braço" })}</span><span class="numeros"></span></li>`;
  }).join("");
  return `<article class="par-bloco" aria-labelledby="par-${esc(p.campanha)}-${esc(p.par)}">
<div class="par-topo"><h3 id="par-${esc(p.campanha)}-${esc(p.par)}"><a href="${href}">${esc(p.par)}</a></h3>${selo(d ? d.selo : p.selo)}
<span class="pequeno suave">${esc(p.tela)} · ${esc(p.modelo ?? "modelo não registrado")} · ${esc(dataLocal(p.dataUtc))}</span>${acao}</div>
<ul class="execs">${linhas}</ul></article>`;
}

/** Barras lado a lado de um par (defeitos confirmados de N), só com números de summary.json. */
function barrasPar(r: ResultadoPar, o: { titulo?: string } = {}): string {
  const total = r.bracos.sem?.total ?? r.bracos.com?.total ?? null;
  const linha = (a: Arm) => {
    const b = r.bracos[a];
    if (!b) return "";
    const v = b.confirmadas, w = v !== null && total ? (v / total) * 60 : 0;
    return `<div class="linha-barra ${a}"><span>${esc(BRACO_T[a])}</span><div class="pista${v ? "" : " vazia"}"><i style="width:${w.toFixed(1)}%"></i><b style="left:${w.toFixed(1)}%">${v === null ? "indisponível" : `${v} de ${total ?? "?"}`}</b></div></div>`;
  };
  return `<figure class="figura"><figcaption>${esc(o.titulo ?? "Defeitos da referência confirmados")}</figcaption><div class="barras">${linha("com")}${linha("sem")}</div></figure>`;
}

function blocoCampanha(c: InfoCampanha, v: VistaExecucoes, preparo: Record<string, Diagnostico>): string {
  const pares = v.pares.filter(p => p.campanha === c.id);
  const execs = v.execucoes.filter(x => x.campanha === c.id);
  const avulsas = execs.filter(x => !x.par);
  return `<section class="campanha" aria-labelledby="camp-${esc(c.id)}">
<h2 id="camp-${esc(c.id)}"><span class="mono">${esc(c.id)}</span> ${selo({ estado: c.natureza === "formal" ? "ok" : c.natureza === "calibracao" ? "aviso" : "nao-se-aplica", texto: c.rotulo })}</h2>
${c.titulo ? `<p class="titulo-campanha">${esc(c.titulo)}</p>` : ""}<p class="pequeno suave">${esc(c.explicacao)}</p>
${pares.map(p => blocoPar(p, execs.filter(x => x.par === p.par), preparo[`${p.campanha}/${p.par}`])).join("")}
${avulsas.length ? `<article class="par-bloco"><div class="par-topo"><h3>Execuções sem par</h3></div><ul class="execs">${avulsas.map(linhaExec).join("")}</ul></article>` : ""}
${!pares.length && !avulsas.length ? `<p class="suave">Só linhas de base desta campanha no arquivo.</p>` : ""}
</section>`;
}

export function paginaExecucoes(v: VistaExecucoes, preparo: Record<string, Diagnostico>, ctx: Contexto): string {
  const avisos = avisosDoArquivo(v, preparo);
  const principais = avisos.filter(a => !a.ensaio), deEnsaio = avisos.filter(a => a.ensaio);
  const reais = v.campanhas.filter(c => c.natureza !== "ensaio");
  const ensaios = v.campanhas.filter(c => c.natureza === "ensaio");
  const dobrarEnsaios = reais.length > 0 && ensaios.length > 0;
  const lbs = v.linhasDeBase.length ? `<details><summary>Linhas de base no arquivo (${v.linhasDeBase.length})</summary>
<div class="rolavel"><table class="empilha"><thead><tr><th scope="col">Data</th><th scope="col">Campanha</th><th scope="col">Id</th><th scope="col">Tela</th><th scope="col">Utilizável pela análise</th><th scope="col">Motivo</th></tr></thead><tbody>
${v.linhasDeBase.map((e: EntradaIndice) => `<tr><td data-rotulo="Data">${esc(dataLocal(e.dataUtc))}</td><td data-rotulo="Campanha" class="mono">${esc(e.campanha)}</td><td data-rotulo="Id" class="mono">${esc(e.chave)}</td><td data-rotulo="Tela">${esc(e.tela)}</td>
<td data-rotulo="Utilizável">${e.estado.linhaDeBase === "utilizavel" ? selo({ estado: "ok", texto: "sim" }) : selo({ estado: "falha", texto: "não" })}</td><td data-rotulo="Motivo" class="pequeno">${esc(e.motivo ? frase(e.motivo, 200) : "—")}</td></tr>`).join("")}
</tbody></table></div></details>` : "";
  const corpoCampanhas = !v.execucoes.length
    ? `<p class="suave">O índice do arquivo não tem execuções. Depois de um disparo do workflow, atualize o clone (<span class="mono">git pull</span>) e recarregue.</p>`
    : `${(dobrarEnsaios ? reais : v.campanhas).map(c => blocoCampanha(c, v, preparo)).join("")}
${dobrarEnsaios ? `<details class="ensaios"><summary>Ensaios — dublê, roteiro ou fixture, nunca dado científico (${ensaios.length} campanha${ensaios.length === 1 ? "" : "s"})</summary>${ensaios.map(c => blocoCampanha(c, v, preparo)).join("")}</details>` : ""}`;
  return pagina({ titulo: "Estado das execuções", ativo: "execucoes", ctx, corpo: `
<header class="capa"><h1>Estado das execuções</h1>
<p>O que está no arquivo de resultados, por campanha e por par, do mais recente para o mais antigo. Cada execução tem um id curto (o slot da campanha, como <span class="mono">p01-sem</span>), o mesmo em todo lugar do painel.</p></header>
${placares(v, preparo)}
${tiles(v, preparo)}
${principais.length ? `<section aria-labelledby="t-avisos"><h2 id="t-avisos">Avisos (${principais.length})</h2>${listaAvisos(principais)}</section>` : ""}
${deEnsaio.length ? `<details><summary>Avisos de ensaios (${deEnsaio.length}) — não afetam resultado</summary>${listaAvisos(deEnsaio)}</details>` : ""}
${corpoCampanhas}
${lbs}
<details><summary>O que quer dizer cada estado</summary>
<ul>
<li><span class="feito">rodou até o fim</span> — estado bom aparece assim, discreto. Só o que pede atenção vira pílula colorida.</li>
<li>${selo({ estado: "pendente", texto: "aguardando revisão" })} — a execução rodou; os cartões ainda não foram decididos. Recall e precisão ficam “indisponível” (nunca 0).</li>
<li>${selo({ estado: "provisoria", texto: "provisória" })} — parte dos cartões foi decidida.</li>
<li>${selo({ estado: "final", texto: "final" })} — todos os cartões decididos; o número não muda mais sem uma revisão nova.</li>
<li>${selo({ estado: "falha", texto: "falhou" })} — a execução não terminou; a causa aparece logo abaixo dela e nos avisos.</li>
<li>${selo({ estado: "findings-vazio", texto: "0 achados — lista vazia aceita" })} — o agente terminou e não alegou nada. É um resultado, diferente de “nenhum relatório”.</li>
<li>${selo({ estado: "par-incompleto", texto: "par incompleto" })} — só um dos braços está no arquivo; não há comparação.</li>
<li>${selo({ estado: "nao-se-aplica", texto: "um braço só, pelo desenho da campanha" })} — a campanha planejou só um braço (ex.: uma prova do cliente); não é falta.</li>
<li>${selo({ estado: "publicacao-indisponivel", texto: "anexo de evidências não publicado" })} — o pacote está no arquivo, mas o anexo da Release não foi confirmado. Veja “Como usar”.</li>
<li>${selo({ estado: "sem-analise", texto: "sem análise: pronta para preparar" })} — o par chegou do workflow e ainda não foi analisado. Abra o par e clique em <strong>Preparar análise</strong>.</li>
<li>${selo({ estado: "aviso", texto: "calibração (D-67) — não é resultado" })} — piloto com o modelo real para calibrar o instrumento; os números dele não entram na tese como resultado.</li>
</ul></details>`, script: SCRIPT_RESUMO });
}

// ───────────────────────────────────────────────────────────────── Preparar análise (T8a.1)

function blocoPreparo(d: Diagnostico, api: string, oQue: string): string {
  if (d.foraDeAlcance) {
    return `<div class="aviso info" role="status" id="preparar"><p><strong>Fora do alcance da análise.</strong> ${esc(d.motivo)}</p>
<p class="pequeno">As execuções e o resumo técnico continuam disponíveis; a pontuação dessa tela espera a decisão registrada no NAT-51.</p></div>`;
  }
  if (!d.pode) return `<div class="aviso info" role="status" id="preparar"><p><strong>Não dá para preparar a análise ${esc(oQue)}.</strong> ${esc(d.motivo)}</p>${d.motivo?.includes(DICA_CRLF) ? `<p class="pequeno"><a href="/ajuda#finais-de-linha">Como corrigir os finais de linha do clone</a></p>` : ""}</div>`;
  const f = d.ultimaFalha;
  return `<section aria-labelledby="t-preparar" id="preparar"><h2 id="t-preparar">Preparar a análise ${esc(oQue)}</h2>
${f ? `<div class="aviso falha" role="alert"><p><strong>A última tentativa, em ${esc(dataLocal(f.em))}, parou na etapa “${esc(rotuloEtapa(f.etapa))}”.</strong> ${esc(frase(semDicaCrlf(f.motivo), 400))}</p>
${f.motivo.includes(DICA_CRLF) ? `<p>${esc(DICA_CRLF)} <a href="/ajuda#finais-de-linha">Ver os comandos</a></p>` : ""}
<p class="pequeno">Nada foi gravado como análise. Registro completo: <span class="mono">${esc(f.rel)}/erro.json</span>. Depois de resolver a causa, tente de novo.</p></div>` : ""}
<p>O painel monta a análise só com o que está no arquivo, conferindo cada peça pelo sha256 que o workflow registrou: a campanha, os snapshots, a referência congelada (nunca exibida), o site congelado, a linha de base dos mesmos disparos e o pacote completo de cada braço, restaurado do anexo de evidências. Depois calcula a primeira versão e abre a fila de revisão.</p>
<div class="botoes"><button type="button" data-preparar="${esc(api)}">${f ? "Tentar de novo" : "Preparar análise"}</button></div>
<p class="msg" id="msg-preparar" role="status" aria-live="polite"></p></section>`;
}

const SCRIPT_PREPARAR = `
document.querySelectorAll("[data-preparar]").forEach(function(b){b.addEventListener("click",async function(){
  var msg=document.getElementById("msg-preparar"); var api=b.getAttribute("data-preparar");
  b.disabled=true; msg.className="msg"; msg.textContent="Preparando… restaurando os pacotes e calculando a primeira versão (pode levar alguns segundos).";
  try{ var r=await fetch(api,{method:"POST",headers:{"content-type":"application/json"},body:"{}"}); var j=await r.json();
    if(j.ok){ msg.className="msg ok"; msg.textContent="Pronto: "+j.revisao.split("/").pop()+" ("+j.estado+"). Abrindo…";
      var alvo=j.analise.split("/").map(encodeURIComponent).join("/");
      setTimeout(function(){ location.href = j.estado==="pronta" ? "/revisao/"+alvo : "/par/"+alvo; },700); }
    else { msg.className="msg erro"; msg.textContent="Não preparada (etapa "+j.etapa+"): "+String(j.erro).split("\\n")[0]+" Nada foi mostrado como resultado."; b.disabled=false; }
  }catch(e){ msg.className="msg erro"; msg.textContent="Sem resposta do painel: "+e; b.disabled=false; }
});});`;

// ───────────────────────────────────────────────────────────────── Par

function faixaCampanha(c: InfoCampanha): string {
  if (c.natureza === "formal") return "";
  return `<div class="faixa ${c.natureza === "ensaio" ? "ensaio" : "calibracao"}" role="note">${esc(c.natureza === "ensaio" ? "Ensaio — não é dado científico." : c.natureza === "calibracao" ? "Calibração (D-67) — não é resultado." : c.rotulo)}<small>${esc(c.explicacao)}</small></div>`;
}

function cartaoBraco(a: Arm, b: ResultadoBraco | undefined, x: LinhaExecucao | undefined, final: boolean): string {
  if (!b) return `<div class="braco ${a}"><div class="rotulo">${esc(BRACO_T[a])}</div><p class="sub">Sem números deste braço nesta análise.</p></div>`;
  const id = x ? `<a class="id-exec" href="${esc(x.url)}">${esc(x.id)}</a>` : b.id ? `<span class="mono">${esc(b.id)}</span>` : "";
  return `<div class="braco ${a}">
<div class="rotulo">${esc(BRACO_T[a])} ${id}</div>
<div class="grande">${b.confirmadas === null ? "—" : esc(b.confirmadas)} <small>de ${esc(b.total ?? "?")} defeitos da referência confirmados${final ? "" : " até agora"}</small></div>
<p class="sub">Recall ${b.recall === null ? "indisponível enquanto a revisão está aberta (não é 0)" : esc(pct(b.recall))}</p>
<dl>
<dt>Achados enviados</dt><dd>${b.achados === null ? "nenhum relatório aceito" : b.achados === 0 ? "0 (lista vazia aceita)" : esc(b.achados)}</dd>
<dt>Cartões pendentes</dt><dd>${esc(b.pendentes ?? "indisponível")}</dd>
<dt>Precisão</dt><dd>${esc(pct(b.precisao))}</dd>
<dt>Afirmações incorretas</dt><dd>${esc(b.incorretas ?? "indisponível")}</dd>
<dt>Defeitos novos corretos</dt><dd>${esc(b.novas ?? "indisponível")}</dd>
<dt>Tempo</dt><dd>${esc(duracao(b.segundos))}</dd>
<dt>Custo estimado</dt><dd>${esc(usd(b.custoUsd))}</dd>
</dl></div>`;
}

function barrasComparativas(r: ResultadoPar): string {
  const bloco = (titulo: string, valor: (b: ResultadoBraco) => number | null, fmt: (v: number) => string, escala?: number | null) => {
    const vs = (["com", "sem"] as Arm[]).map(a => r.bracos[a] ? valor(r.bracos[a]!) : null);
    const max = escala ?? Math.max(0, ...vs.filter((v): v is number => v !== null));
    return `<figure class="figura"><figcaption>${esc(titulo)}</figcaption><div class="barras">${(["com", "sem"] as Arm[]).filter(a => r.bracos[a]).map(a => {
      const v = valor(r.bracos[a]!), w = v !== null && max ? (v / max) * 58 : 0;
      return `<div class="linha-barra ${a}"><span>${esc(BRACO_T[a])}</span><div class="pista${v ? "" : " vazia"}"><i style="width:${w.toFixed(1)}%"></i><b style="left:${w.toFixed(1)}%">${v === null ? "desconhecido" : esc(fmt(v))}</b></div></div>`;
    }).join("")}</div></figure>`;
  };
  const total = r.bracos.sem?.total ?? r.bracos.com?.total ?? null;
  return `<div class="dupla">
${bloco(`Defeitos confirmados (de ${total ?? "?"})`, b => b.confirmadas, v => `${v} de ${total ?? "?"}`, total)}
${bloco("Achados enviados", b => b.achados, v => String(v))}
${bloco("Tempo de relógio", b => b.segundos, v => duracao(v))}
${bloco("Custo estimado", b => b.custoUsd, v => usd(v))}
</div>`;
}

function tabelaMetricas(v: VistaPar): string {
  const an = v.analise!, rv = an.atual!;
  const bracos = (["sem", "com"] as Arm[]).filter(a => rv.resumo.execucoes.some(e => e.braco === a));
  const idDe = (a: Arm) => { const run = rv.resumo.execucoes.find(e => e.braco === a)!.runId; return (v.bracos[a] ?? []).find(x => x.chave === run)?.id ?? run; };
  return `<div class="rolavel"><table class="empilha">
<caption>Fonte: <span class="mono">${esc(rv.rel)}/summary.json</span> · formato ${esc(rv.resumo.formato)} · scorer ${esc(rv.resumo.versoes?.scorer.version ?? "?")} · atualizado ${esc(dataLocal(rv.resumo.geradoEm))}</caption>
<thead><tr><th scope="col">Medida</th>${bracos.map(a => `<th scope="col">${esc(BRACO_T[a])} · <span class="mono">${esc(idDe(a))}</span></th>`).join("")}</tr></thead>
<tbody>${v.metricas!.map(l => `<tr><th scope="row">${esc(l.rotulo)}</th>${bracos.map(a => {
    const val = l.valores[a];
    return `<td data-rotulo="${esc(BRACO_T[a])}">${val ? `${esc(val.texto)}<span class="fonte">${esc(val.fonte.campo)}</span>` : "—"}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function valorComFonte(rotulo: string, v: Valor): string {
  return `<tr><th scope="row">${esc(rotulo)}</th><td>${esc(v.texto)}<span class="fonte">${esc(`${v.fonte.arquivo} → ${v.fonte.campo}`)}</span></td></tr>`;
}

export function paginaPar(v: VistaPar, preparo: Diagnostico | null, ctx: Contexto): string {
  const an = v.analise;
  const rv = an?.atual ?? null;
  const r = v.resultado;
  const xs = [...(v.bracos.sem ?? []), ...(v.bracos.com ?? [])];
  const partes: string[] = [];
  partes.push(`<p class="migalha"><a href="/">Estado das execuções</a> › <span class="mono">${esc(v.campanha)}</span> › par <span class="mono">${esc(v.par)}</span></p>
<header class="capa"><h1><span class="id">${esc(v.par)}</span></h1>
<p>Campanha <span class="mono">${esc(v.campanha)}</span>. Mesma tela, mesmo modelo e mesma configuração; só muda a disponibilidade do oráculo. Execuções: ${xs.length ? xs.map(x => `<a class="id-exec" href="${esc(x.url)}">${esc(x.id)}</a> (${esc(x.braco ? BRACO[x.braco] : "?")})`).join(", ") : "nenhuma no arquivo"}.</p></header>`);
  partes.push(faixaCampanha(v.campanhaInfo));
  if (v.avisosArquivo.crlf) partes.push(`<div class="aviso falha" role="alert"><p><strong>arquivo:</strong> o Git desta máquina trocou os finais de linha do clone (CRLF) — a preparação recusa os arquivos por hash. <a href="/ajuda#finais-de-linha">Corrigir uma vez</a></p></div>`);
  if (an?.avisos.length) partes.push(listaAvisos(an.avisos.map(a => ({ alvo: v.par, texto: a.replace(new RegExp(`^${v.par.replace(/[.]/g, "\\.")}:\\s*`), ""), ajuda: "/ajuda#recalcular", nivel: "falha", ensaio: false }))));
  if (v.faltando.length && !v.porDesenho) {
    partes.push(`<div class="aviso info" role="status"><p><strong>Par incompleto: falta o braço ${v.faltando.map(f => esc(BRACO[f])).join(" e ")}.</strong></p>
<p>Nenhuma execução desse braço está no arquivo. A comparação com − sem só existe quando os dois braços estão lá; nada foi estimado no lugar.</p></div>`);
  } else if (v.porDesenho) {
    partes.push(`<div class="aviso info" role="status"><p><strong>Um braço só, pelo desenho da campanha.</strong> A campanha não planejou o braço ${v.faltando.map(f => esc(BRACO[f])).join(" e ")}; não há comparação, e isso não é falta.</p></div>`);
  }

  // 1. comparação (o resultado mais recente primeiro)
  partes.push(`<h2>Comparação com × sem</h2>`);
  if (!an) {
    partes.push(`<p class="suave">Ainda não há análise deste par no arquivo. ${v.faltando.length ? "A análise de par espera os dois braços." : preparo?.pode ? "Prepare a análise abaixo: ela cria a primeira versão." : ""}</p>`);
    if (preparo) partes.push(blocoPreparo(preparo, `/api/preparar/par/${u(v.campanha)}/${u(v.par)}`, "do par"));
  } else if (!rv) {
    partes.push(`<p class="suave">A análise ainda não tem versão íntegra.</p>
<div class="botoes"><button type="button" data-recalcular="${esc(`${an.campanha}/${an.alvo}`)}">Tentar calcular de novo</button></div>
<p class="msg" id="msg-recalc" role="status" aria-live="polite"></p>`);
  } else if (rv.resumo.analise.estado === "bloqueada") {
    partes.push(`<div class="aviso falha"><p><strong>Análise bloqueada:</strong> ${esc(frase(rv.resumo.analise.motivo, 400))}</p><p>O resumo técnico continua valendo; as métricas ficam indisponíveis.</p></div>`);
  } else if (v.comparacao && r) {
    const c = v.comparacao;
    const final = c.estado === "final";
    if (!c.disponivel) partes.push(`<div class="aviso info"><p><strong>Comparação indisponível.</strong> ${esc(frase(c.motivo, 300))}</p></div>`);
    partes.push(final
      ? `<div class="faixa final">FINAL — revisão fechada (${esc(rv.nome)}).<small>${esc(c.nota)}</small></div>`
      : `<div class="faixa provisoria">PROVISÓRIO — sem revisão fechada: ${esc(r.pendentes)} cartão(ões) pendente(s) na fila (agente e linha de base). Os números ainda mudam.<small>${esc(c.nota)} Enquanto houver cartão pendente, recall e precisão ficam “indisponível” (nunca 0).</small></div>`);
    const x = (a: Arm) => (v.bracos[a] ?? []).find(l => l.chave === r.bracos[a]?.runId);
    partes.push(`<div class="bracos">${cartaoBraco("com", r.bracos.com, x("com"), final)}${cartaoBraco("sem", r.bracos.sem, x("sem"), final)}</div>`);
    partes.push(barrasComparativas(r));
    if (c.disponivel) {
      partes.push(`<p class="diferenca">Diferença com − sem: <strong>${esc(c.diferencaUnidades.texto)}</strong> defeito(s) confirmado(s) · recall <strong>${esc(c.diferencaRecall.valor === null ? "indisponível" : c.diferencaRecall.texto)}</strong>. <span class="pequeno suave">n = 1 par, sem inferência.</span></p>
<details><summary>De onde vêm estes números</summary><div class="rolavel"><table><caption>Fonte: <span class="mono">${esc(c.fonte.arquivo)}</span> · ${esc(c.fonte.versao)} · atualizado ${esc(dataLocal(c.fonte.atualizadoEm))} · pacotes <span class="mono">${esc(c.fonte.pacote)}</span></caption>
<tbody>${valorComFonte("Diferença de defeitos confirmados (com − sem)", c.diferencaUnidades)}${valorComFonte("Diferença de recall (com − sem)", c.diferencaRecall)}</tbody></table></div></details>`);
      const lista = (t: string, ys: { specId: string; elemento: string }[]) => `<li><strong>${esc(t)} (${ys.length}):</strong> ${ys.length ? ys.map(y => `${esc(y.specId)} (${esc(y.elemento)})`).join("; ") : "nenhum"}</li>`;
      if (c.unidades) partes.push(`<details><summary>Por defeito da referência${final ? "" : " (até agora)"}</summary><ul>${lista("Só o com detectou", c.unidades.soCom)}${lista("Só o sem detectou", c.unidades.soSem)}${lista("Os dois detectaram", c.unidades.ambos)}${lista("Nenhum detectou", c.unidades.nenhum)}</ul></details>`);
    }
  } else partes.push(`<p class="suave">Esta análise é de uma execução só; não há comparação.</p>`);

  // 2. revisão e ações
  if (an && rv) {
    const pend = rv.resumo.revisaoSemantica?.pendentes ?? 0;
    partes.push(`<h2>Revisão</h2>
<p>Versão atual: <strong>${esc(rv.nome)}</strong>, calculada em ${esc(dataLocal(rv.resumo.geradoEm))}. Cartões pendentes na fila desta versão: <strong>${esc(pend)}</strong>.</p>
<div class="botoes">${rv.resumo.revisaoSemantica ? `<a class="botao" href="/revisao/${u(an.campanha)}/${u(an.alvo)}">Abrir fila de revisão</a>` : ""}
<button type="button" class="sec" data-recalcular="${esc(`${an.campanha}/${an.alvo}`)}">Recalcular</button>
<a class="botao sec" href="/baixar/analise/${u(an.campanha)}/${u(an.alvo)}/${u(rv.nome)}.tar.gz" download>Baixar esta versão (.tar.gz)</a></div>
<p class="msg" id="msg-recalc" role="status" aria-live="polite"></p>`);
  }

  // 3. execuções do par
  partes.push(`<h2>Execuções do par</h2><article class="par-bloco"><ul class="execs">${(["sem", "com"] as Arm[]).map(a => (v.bracos[a] ?? []).map(linhaExec).join("")
    || (v.porDesenho ? "" : `<li class="exec vazio"><span class="id-exec">—</span>${chip(a)}<span class="selos">${selo({ estado: "par-incompleto", texto: "falta este braço" })}</span><span class="numeros"></span></li>`)).join("")}</ul></article>`);

  // 4. dobrados: tabela completa, achados (quebra a cegueira) e histórico
  if (rv && v.metricas) partes.push(`<details><summary>Resultado por braço — tabela completa, com a fonte de cada número</summary>${tabelaMetricas(v)}</details>`);
  if (rv) {
    const ach = (["sem", "com"] as Arm[]).map(a => {
      const y = v.achadosPorBraco[a];
      if (y === undefined) return "";
      return `<h3>${esc(BRACO_T[a])}</h3>${y === null ? `<p>Nenhuma submissão aceita (não é zero achados).</p>` : y.total === 0 ? `<p>0 achados: lista vazia aceita pelo coletor.</p>`
        : `<div class="rolavel"><table class="empilha"><thead><tr><th scope="col">Seletor</th><th scope="col">Regra</th><th scope="col">Observado (texto do agente)</th></tr></thead><tbody>${y.itens.map(i => `<tr><td data-rotulo="Seletor" class="mono">${esc(i.seletor)}</td><td data-rotulo="Regra">${esc(i.regra ?? "incerta")}</td><td data-rotulo="Observado">${esc(i.observado)}</td></tr>`).join("")}</tbody></table></div>`}`;
    }).join("");
    partes.push(`<details><summary>Achados enviados por braço${v.revisaoAberta ? " — abrir antes de revisar quebra a cegueira" : ""}</summary>
${v.revisaoAberta ? `<div class="aviso"><p>A revisão deste par ainda está aberta. Ver os achados de cada braço antes de decidir os cartões revela de que braço cada alegação veio.</p></div>` : ""}
<p class="pequeno suave">Fonte: <span class="mono">${esc(rv.rel)}/summary.json → execucoes[].achados</span>. Texto vindo do agente: dado não confiável, mostrado escapado.</p>${ach}</details>`);
    partes.push(`<details><summary>Histórico de versões (${an!.revisoes.length} íntegra(s), ${an!.falhas.length} falha(s))</summary>
<ul>${an!.revisoes.map(x => `<li><strong>${esc(x.nome)}</strong> — ${esc(dataLocal(x.resumo.geradoEm))} · análise ${esc(x.resumo.analise.estado)} · hash científico <span class="mono">${esc(x.resumo.hashes.conteudoCientificoSha256.slice(0, 12))}</span>${x === rv ? " · <em>atual</em>" : ""} · <a href="/baixar/analise/${u(an!.campanha)}/${u(an!.alvo)}/${u(x.nome)}.tar.gz" download>baixar</a></li>`).join("")}
${an!.falhas.map(f => `<li>${selo({ estado: "falha", texto: "falhou" })} ${esc(dataLocal(f.em))} — ${esc(frase(f.motivo))} <span class="mono pequeno">${esc(f.rel)}/erro.json</span></li>`).join("")}</ul></details>`);
  }
  return pagina({ titulo: `Par ${v.par} (${v.campanha})`, ctx, corpo: partes.join("\n"), script: SCRIPT_RECALCULAR + SCRIPT_PREPARAR });
}

// ───────────────────────────────────────────────────────────────── Execução

function tabelaTecnica(titulo: string, linhas: VistaExecucao["tecnico"]): string {
  if (!linhas.length) return "";
  const f0 = linhas[0].valor.fonte;
  return `<h2>${esc(titulo)}</h2><div class="rolavel"><table>
<caption>Fonte: <span class="mono">${esc(f0.arquivo)}</span> · ${esc(f0.versao ?? "versão não registrada")} · atualizado ${esc(dataLocal(f0.atualizadoEm))}</caption>
<tbody>${linhas.map(l => `<tr><th scope="row">${esc(l.rotulo)}</th><td>${esc(l.valor.texto)}<span class="fonte">${esc(l.valor.fonte.campo)}</span></td></tr>`).join("")}</tbody></table></div>`;
}

export function paginaExecucao(v: VistaExecucao, preparo: Diagnostico | null, ctx: Contexto): string {
  const x = v.linha, e = v.entrada;
  const ev = e.evidencias;
  return pagina({ titulo: `${x.id} (${x.campanha})`, ctx, script: SCRIPT_PREPARAR, corpo: `
<p class="migalha"><a href="/">Estado das execuções</a> › <span class="mono">${esc(x.campanha)}</span>${x.par ? ` › <a href="/par/${u(x.campanha)}/${u(x.par)}">par ${esc(x.par)}</a>` : ""} › execução</p>
<header class="capa"><h1><span class="id">${esc(x.id)}</span></h1>
<p>${chip(x.braco)} · ${x.par ? `par <span class="mono">${esc(x.par)}</span> · ` : ""}campanha <span class="mono">${esc(x.campanha)}</span> · ${esc(x.tela)} · ${esc(x.modelo ?? "modelo não registrado")} ${esc(x.esforco ?? "")} · ${esc(x.dataLocal)}</p></header>
${faixaCampanha(v.campanhaInfo)}
<div class="selos">${selo(x.tecnico)} ${selo(x.isolamento)} ${selo(x.oraculo)} ${selo(x.envio)} ${selo(x.publicacao)} ${selo(x.pontuacao)}</div>
<p>${x.achados.estado === "lista" ? `<strong>${esc(x.achados.total)}</strong> achado(s) enviado(s)` : esc(x.achados.texto)} · ${esc(duracao(x.duracaoS))} · custo estimado ${esc(usd(x.custoUsd))}</p>
${x.tecnico.estado !== "ok" && x.causaFalha && v.origem !== "sem-pacote" ? `<div class="aviso falha" role="alert"><p><strong>${esc(x.id)}:</strong> ${esc(frase(x.causaFalha, 400))}</p></div>` : ""}
${v.origem === "pacote" ? `<div class="aviso info"><p>Esta execução ainda não tem análise. O resumo abaixo vem direto do <span class="mono">run.json</span> arquivado: estado, falha e consumo, sem pontuação.${x.par && !preparo ? ` A análise é feita no <a href="/par/${u(x.campanha)}/${u(x.par)}#preparar">par ${esc(x.par)}</a>.` : ""}</p></div>` : ""}
${preparo ? blocoPreparo(preparo, `/api/preparar/execucao/${u(x.chave)}`, "desta execução (individual)") : ""}
${v.origem === "sem-pacote" ? `<div class="aviso falha"><p><strong>${esc(x.id)}: interrompida sem pacote.</strong> ${esc(frase(v.despacho?.motivo ?? x.causaFalha ?? "", 400))}</p><p class="pequeno">Fonte: <span class="mono">${esc(v.despacho?.fonte ?? "")}</span>. Nenhum resultado foi inventado; o slot fica visível.</p></div>` : ""}
${tabelaTecnica("Estado", v.tecnico)}
${tabelaTecnica("MCP e isolamento", v.isolamento)}
${tabelaTecnica("Custo e tempo", v.custo)}
${v.custo.length ? `<p class="pequeno suave">“Desconhecido” é o que o cliente ou o runner não mediu — nunca vira 0. Estimativa a preço de referência não é fatura.</p>` : ""}
<h2>Publicação</h2>
<p>${selo(x.publicacao)}</p>
${x.publicacao.estado === "publicacao-indisponivel" ? `<div class="aviso"><p><strong>${esc(x.id)}:</strong> no GitHub, abra a execução do workflow e use <em>Re-run failed jobs</em>. Só o job <span class="mono">arquivar</span> roda de novo; o modelo não é chamado e o mesmo pacote é reenviado. <a href="/ajuda#publicacao">Passo a passo</a></p></div>` : ""}
${v.origem !== "sem-pacote" ? `<div class="botoes"><a class="botao sec" href="/baixar/execucao/${u(x.chave)}.tar.gz" download>Baixar o pacote arquivado (.tar.gz)</a></div>
<p class="pequeno suave">O download traz os JSONs do pacote, o despacho e o resumo da coleta, como estão no arquivo. As evidências completas (capturas) ficam no anexo da Release.</p>` : ""}
<details><summary>Identificadores completos e hashes</summary>
<dl class="kv"><dt>Id curto</dt><dd class="mono">${esc(x.id)}</dd><dt>runId</dt><dd class="mono">${esc(x.chave)}</dd>
<dt>Campanha · slot · par</dt><dd class="mono">${esc(x.campanha)} · ${esc(x.slot ?? "—")} · ${esc(x.par ?? "—")}</dd>
<dt>Tentativa · repetição</dt><dd>${esc(x.tentativa ?? "—")} · ${esc(x.repeticao ?? "—")}</dd>
<dt>Natureza</dt><dd>${x.natureza === "ensaio" ? "ensaio (dublê, roteiro ou fixture — nunca dado científico)" : "execução com o modelo real"}</dd>
<dt>Data</dt><dd>${esc(x.dataLocal)} · ${esc(x.dataUtc)} UTC</dd>
<dt>Pasta no arquivo</dt><dd class="mono">${esc(x.caminho)}</dd><dt>Entrada do índice</dt><dd class="mono">${esc(x.arquivoEntrada)}</dd>
${e.pacote ? `<dt>artifact-manifest sha256</dt><dd class="mono">${esc(e.pacote.artifactManifestSha256)}</dd>` : ""}
${e.manifestoColeta ? `<dt>Manifesto de coleta</dt><dd class="mono">${esc(e.manifestoColeta.caminho)} · ${esc(e.manifestoColeta.sha256)}</dd>` : ""}
${ev ? `<dt>Anexo de evidências</dt><dd class="mono">${esc(ev.anexo ?? "—")}</dd><dt>Release</dt><dd class="mono">${esc(ev.release ?? "—")}</dd>
<dt>sha256 do anexo</dt><dd class="mono">${esc(ev.sha256 ?? "—")}</dd><dt>Entrega</dt><dd>${esc(ev.estado)}</dd>${ev.url ? `<dt>Endereço</dt><dd class="mono">${esc(ev.url)}</dd>` : ""}` : ""}
${e.github ? `<dt>Workflow</dt><dd class="mono">${esc(e.github.url)}</dd>` : ""}
${x.causaFalha ? `<dt>Causa registrada (texto inteiro)</dt><dd class="mono">${esc(x.causaFalha)}</dd>` : ""}
</dl></details>
` });
}

// ───────────────────────────────────────────────────────────────── Fila de revisão

const OPCOES: [string, string, string][] = [
  ["defeito-do-gabarito", "Defeito do gabarito", "a alegação acertou um defeito que a referência cataloga (escolha a unidade)"],
  ["defeito-novo-correto", "Defeito novo correto", "está certa, mas o defeito não está na referência"],
  ["incorreta", "Incorreta", "a alegação está errada"],
  ["duplicada", "Duplicada", "é a mesma afirmação de outro cartão já decidido da mesma execução"],
  ["evidencia-insuficiente", "Evidência insuficiente", "não dá para decidir com o que está aqui"],
];

function cartaoRevisao(c: VistaCartao, n: number, total: number, todos: VistaCartao[]): string {
  const id = c.id.slice(2, 14);
  const decididos = todos.filter(o => c.duplicataDe.includes(o.id) && o.decisao.status === "decidido");
  const campo = (rot: string, html: string) => `<div class="campo"><span class="rot">${esc(rot)}</span>${html}</div>`;
  const nome = (s: string) => `${s}-${id}`;
  return `<article class="card-rev" id="c-${esc(c.id)}" aria-labelledby="t-${id}">
<h3 id="t-${id}">Cartão ${n} de ${total} · ${c.decisao.status === "decidido" ? selo({ estado: "final", texto: `decidido: ${c.decisao.decisao ?? "?"}` }) : selo({ estado: "pendente", texto: "pendente" })}</h3>
<p class="pequeno suave">${esc(c.origem)} · cena ${esc(c.cena)} · <span class="mono">${esc(c.id.slice(0, 18))}…</span></p>
${c.sinais.length ? `<p>${c.sinais.map(s => `<span class="selo s-aviso">${esc(s)}</span>`).join(" ")}</p>` : ""}
${campo("Observado", `<pre>${esc(c.observado ?? "(retido ou ausente)")}</pre>`)}
${campo("Esperado", `<pre>${esc(c.esperado ?? "(retido ou ausente)")}</pre>`)}
${campo("Regra declarada", `<pre>${esc(c.regra ?? "nenhuma (atribuição incerta)")}</pre>`)}
${campo("Janela e interações", `<pre>${esc(c.janela)}</pre>`)}
${campo("Elementos alegados", c.sujeitos.map(s => `<pre class="mono">${esc(s.rotulo)}${s.oculto ? ` · OCULTO: ${esc(s.oculto)}` : ""}</pre>`).join(""))}
${campo("Unidades candidatas (sugestão, não crédito)", c.candidatas.length ? c.candidatas.map(un => `<div class="unidade"><strong>${esc(un.specId)}</strong> · ${esc(un.estado)}<br>${esc(un.descricao)}<br><span class="pequeno suave">${esc(un.predicado)}</span></div>`).join("") : `<p class="suave">Nenhuma. Um defeito novo correto continua possível.</p>`)}
${campo("Evidência da execução", c.evidencias.length ? `<ul>${c.evidencias.map(ev => `<li>${ev.url ? `<a href="${esc(ev.url)}" target="_blank" rel="noopener">Evidência ${ev.n}</a>` : `Evidência ${ev.n}`} · ${esc(ev.status)}${ev.sha256 ? ` · sha256 <span class="mono">${esc(ev.sha256)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="suave">Nenhuma referência declarada.</p>`)}
${c.imagemCena ? `<details><summary>Reconstrução da cena (não é evidência da execução)</summary><img class="cena" loading="lazy" src="${esc(c.imagemCena)}" alt="Captura da página congelada na cena ${esc(c.cena)}, refeita no momento da análise"></details>` : ""}
${campo("Retido na cegueira", `<p class="pequeno suave">${esc(c.retido)}</p>`)}
${c.decisao.status === "decidido" ? `<div class="aviso info"><p>Decidido por ${esc(c.decisao.revisora ?? "?")}: <strong>${esc(c.decisao.decisao)}</strong> — “${esc(c.decisao.justificativa)}”. Para mudar, decida de novo abaixo: a nova decisão vira uma versão nova, a anterior fica no histórico.</p></div>` : ""}
<form class="decidir" data-card="${esc(c.id)}" novalidate>
<fieldset><legend>Decisão</legend>
${OPCOES.map(([v, rot, exp]) => `<div class="opcao"><input type="radio" name="${nome("d")}" id="${nome(v)}" value="${v}"${c.decisao.decisao === v ? " checked" : ""}><label for="${nome(v)}"><strong>${esc(rot)}</strong> — ${esc(exp)}</label></div>`).join("")}
</fieldset>
<fieldset class="so-gabarito oculto"><legend>Qual unidade a alegação acertou</legend>
${c.candidatas.length ? c.candidatas.map(un => `<div class="opcao"><input type="checkbox" name="${nome("u")}" id="${nome("u")}-${esc(un.id.slice(2, 12))}" value="${esc(un.id)}"${c.decisao.unidades.includes(un.id) ? " checked" : ""}><label for="${nome("u")}-${esc(un.id.slice(2, 12))}">${esc(un.specId)} · ${esc(un.estado)}</label></div>`).join("") : `<p class="nota-erro">Este cartão não tem unidade candidata: o scorer recusará “defeito do gabarito”.</p>`}
</fieldset>
<div class="campo so-duplicada oculto"><label class="rot" for="${nome("dup")}">Duplicata de qual cartão</label>
${decididos.length ? `<select id="${nome("dup")}" name="dup">${decididos.map(o => `<option value="${esc(o.id)}">${esc(o.id.slice(0, 14))}… — ${esc((o.observado ?? "").slice(0, 60))}</option>`).join("")}</select>`
    : `<p class="nota-erro">Nenhum cartão elegível já decidido (duplicata só vale dentro da mesma execução, com os mesmos elementos e estado).</p>`}</div>
<div class="campo"><label class="rot" for="${nome("cit")}">A regra citada sustenta a alegação?</label>
<select id="${nome("cit")}" name="cit"><option value="uncertain">incerto</option><option value="supported">sim, a citação sustenta</option><option value="unsupported">não, citação errada</option></select></div>
<div class="campo"><label class="rot" for="${nome("j")}">Justificativa (obrigatória)</label><textarea id="${nome("j")}" name="j" rows="2" required aria-required="true"></textarea></div>
<div class="campo"><label class="rot" for="${nome("ev")}">O que você consultou</label><input type="text" id="${nome("ev")}" name="ev" value="cartão; reconstrução da cena"></div>
<div class="botoes"><button type="submit">Salvar decisão</button></div>
<p class="msg retorno" role="status" aria-live="polite"></p>
</form></article>`;
}

/** A fila é CEGA: nenhum id de execução (o slot pode nomear o braço, ex.: `p01-sem`), só o do par. */
export function paginaFila(f: VistaFila, ctx: Contexto, revisoraPadrao: string): string {
  const an = f.analise, rv = f.revisao;
  const pend = f.cartoes.filter(c => c.decisao.status === "pendente");
  const feitos = f.cartoes.filter(c => c.decisao.status === "decidido");
  const hist = an.decisoes;
  return pagina({ titulo: `Revisão ${an.alvo} (${an.campanha})`, ctx, corpo: `
<p class="migalha"><a href="/">Estado das execuções</a> › <span class="mono">${esc(an.campanha)}</span> › <a href="/par/${u(an.campanha)}/${u(an.alvo)}">par ${esc(an.alvo)}</a> › fila de revisão</p>
<header class="capa"><h1>Fila de revisão — <span class="id">${esc(an.alvo)}</span></h1>
<p>${f.cartoes.length} cartões · ${pend.length} pendente(s) · ${feitos.length} decidido(s). Revisão cega: o braço, o id da execução e o nome dos arquivos de evidência não aparecem aqui.</p></header>
${an.avisos.length ? listaAvisos(an.avisos.map(a => ({ alvo: an.alvo, texto: a.replace(new RegExp(`^${an.alvo.replace(/[.]/g, "\\.")}:\\s*`), ""), ajuda: "/ajuda#recalcular", nivel: "falha", ensaio: false }))) : ""}
${f.naoIncorporadas ? `<div class="aviso" role="status"><p><strong>${f.naoIncorporadas} decisão(ões) salva(s) depois do último cálculo (${esc(rv.nome)}).</strong> A pontuação só muda quando você clicar em Recalcular.</p></div>` : ""}
<div class="campo"><label class="rot" for="revisora">Seu nome (assina cada decisão)</label><input type="text" id="revisora" autocomplete="name" value="${esc(revisoraPadrao)}"></div>
<div class="botoes"><button type="button" data-recalcular="${esc(`${an.campanha}/${an.alvo}`)}">Recalcular a pontuação</button>
<a class="botao sec" href="/par/${u(an.campanha)}/${u(an.alvo)}">Ver o resultado do par</a></div>
<p class="msg" id="msg-recalc" role="status" aria-live="polite"></p>
<p class="pequeno suave">Decisões em vigor: <span class="mono">${esc(f.origemDecisoes)}</span> (versão ${f.versaoDecisoes}). Pacote: <span class="mono">${esc(rv.rel)}/revisao</span>, calculado em ${esc(dataLocal(rv.resumo.geradoEm))}.</p>
<h2>Pendentes (${pend.length})</h2>
${pend.length ? pend.map(c => cartaoRevisao(c, f.cartoes.indexOf(c) + 1, f.cartoes.length, f.cartoes)).join("") : `<div class="aviso info"><p><strong>Nenhum cartão pendente.</strong> Clique em Recalcular para gravar a pontuação final${f.naoIncorporadas ? "" : " (se ainda não o fez)"}.</p></div>`}
<details><summary>Já decididos (${feitos.length})</summary>${feitos.map(c => cartaoRevisao(c, f.cartoes.indexOf(c) + 1, f.cartoes.length, f.cartoes)).join("") || "<p>Nenhum ainda.</p>"}</details>
<details><summary>Histórico das gravações (${hist.length})</summary>
${hist.length ? `<div class="rolavel"><table class="empilha"><thead><tr><th scope="col">Versão</th><th scope="col">Salva em</th><th scope="col">Revisora</th><th scope="col">Cartão</th><th scope="col">Decisão</th><th scope="col">Justificativa</th></tr></thead><tbody>
${hist.map(h => `<tr><td data-rotulo="Versão" class="mono">${esc(h.nome)}</td><td data-rotulo="Salva em">${esc(dataLocal(h.meta?.salvoEm))}</td><td data-rotulo="Revisora">${esc(h.meta?.revisora ?? "—")}</td>
<td data-rotulo="Cartão" class="mono">${esc((h.meta?.cartao ?? "").slice(0, 14))}…</td><td data-rotulo="Decisão">${esc(h.meta?.decisao ?? "—")}</td><td data-rotulo="Justificativa">${esc(h.meta?.justificativa ?? "—")}</td></tr>`).join("")}
</tbody></table></div><p class="pequeno suave">Cada gravação é um arquivo novo em <span class="mono">${esc(an.rel)}/decisoes/</span>; nenhum é sobrescrito.</p>` : "<p>Nenhuma gravação ainda.</p>"}</details>
`, script: SCRIPT_RECALCULAR + scriptFila(an.campanha, an.alvo, f.versaoDecisoes) });
}

const SCRIPT_RECALCULAR = `
document.querySelectorAll("[data-recalcular]").forEach(function(b){b.addEventListener("click",async function(){
  var msg=document.getElementById("msg-recalc"); var alvo=b.getAttribute("data-recalcular");
  b.disabled=true; msg.className="msg"; msg.textContent="Recalculando… isto leva alguns segundos (o navegador headless reconstrói a página congelada).";
  try{ var r=await fetch("/api/recalcular/"+alvo,{method:"POST",headers:{"content-type":"application/json"},body:"{}"}); var j=await r.json();
    if(j.ok){ msg.className="msg ok"; msg.textContent="Pronto: nova versão "+j.revisao.split("/").pop()+" ("+j.estado+"). Recarregando…"; setTimeout(function(){location.reload()},900); }
    else { msg.className="msg retorno erro"; msg.textContent="O recálculo falhou e a versão anterior continua valendo: "+String(j.erro).split("\\n")[0]+(j.falha?" Registro completo: "+j.falha+"/erro.json.":""); b.disabled=false; }
  }catch(e){ msg.className="msg retorno erro"; msg.textContent="Sem resposta do painel: "+e; b.disabled=false; }
});});`;

function scriptFila(campanha: string, alvo: string, base: number): string {
  return `
var BASE=${JSON.stringify(base)}, ALVO=${JSON.stringify(`${u(campanha)}/${u(alvo)}`)};
var rv=document.getElementById("revisora");
try{ if(!rv.value){ rv.value=localStorage.getItem("painel-revisora")||""; } }catch(e){}
rv.addEventListener("change",function(){ try{ localStorage.setItem("painel-revisora",rv.value.trim()); }catch(e){} });
document.querySelectorAll("form.decidir").forEach(function(f){
  function mostra(){ var d=(f.querySelector("input[type=radio]:checked")||{}).value;
    f.querySelector(".so-gabarito").classList.toggle("oculto", d!=="defeito-do-gabarito");
    f.querySelector(".so-duplicada").classList.toggle("oculto", d!=="duplicada");
    var cx=f.querySelectorAll(".so-gabarito input[type=checkbox]");
    if(d==="defeito-do-gabarito" && cx.length===1 && !cx[0].checked) cx[0].checked=true; }
  f.addEventListener("change",mostra); mostra();
  f.addEventListener("submit",async function(ev){ ev.preventDefault();
    var msg=f.querySelector(".retorno"); msg.className="msg retorno erro";
    var d=(f.querySelector("input[type=radio]:checked")||{}).value;
    var j=f.querySelector("textarea").value.trim();
    var nome=rv.value.trim();
    if(!nome){ msg.textContent="Escreva seu nome no campo do topo da página."; rv.focus(); return; }
    if(!d){ msg.textContent="Escolha uma das cinco decisões."; return; }
    if(!j){ msg.textContent="A justificativa é obrigatória."; f.querySelector("textarea").focus(); return; }
    var unid=[].slice.call(f.querySelectorAll(".so-gabarito input:checked")).map(function(i){return i.value});
    var dup=f.querySelector(".so-duplicada select");
    var corpo={cardId:f.getAttribute("data-card"),decisao:d,unitIds:unid,duplicadaDe:dup?dup.value:null,
      citacao:f.querySelector("select[name=cit]").value,justificativa:j,
      consultado:f.querySelector("input[name=ev]").value.split(";").map(function(s){return s.trim()}).filter(Boolean),revisora:nome,base:BASE};
    var botao=f.querySelector("button[type=submit]"); botao.disabled=true; msg.className="msg retorno"; msg.textContent="Salvando…";
    try{ var r=await fetch("/api/decisao/"+ALVO,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(corpo)}); var res=await r.json();
      if(res.ok){ msg.className="msg retorno ok"; msg.textContent="Salvo como versão "+res.versao+". Atualizando a fila…";
        try{ localStorage.setItem("painel-revisora",nome); }catch(e){}
        setTimeout(function(){ location.reload(); },500); }
      else { msg.className="msg retorno erro"; msg.textContent=res.erro; botao.disabled=false; }
    }catch(e){ msg.className="msg retorno erro"; msg.textContent="Sem resposta do painel: "+e; botao.disabled=false; }
  });
});`;
}

// ───────────────────────────────────────────────────────────────── ajuda e erros

export function paginaAjuda(ctx: Contexto): string {
  return pagina({ titulo: "Como usar", ativo: "ajuda", ctx, corpo: `
<header class="capa"><h1>Como usar o painel</h1>
<p>O guia completo, com o disparo do workflow, está em <span class="mono">govbr-eval/docs/painel-resultados.md</span>. Para ver o caminho inteiro em figuras, abra o <a href="/guia">Guia em diagramas</a>.</p></header>
<h2 id="ler">Ler o estado</h2>
<ol><li>Em <a href="/">Estado das execuções</a>, cada execução tem um <strong>id curto</strong> — o slot da campanha, como <span class="mono">p01-sem</span> (par 1, braço sem). É o mesmo id nos avisos, nas listas, no endereço da página e no resumo técnico. O identificador longo (runId) fica em “Identificadores completos”, na página da execução.</li>
<li>Os quadros do topo respondem às perguntas de sempre: quais falharam, quais terminaram com 0 achados, quais pares estão incompletos, quais aguardam revisão.</li>
<li>Estado bom aparece discreto, com ✓. Só o que pede atenção vira pílula colorida, e cada aviso é uma frase: <em>id: o que aconteceu — o que fazer</em>.</li>
<li>“indisponível” quer dizer que o número ainda não existe (revisão aberta, análise bloqueada). Nunca é zero.</li></ol>
<h2 id="estados">Pares e campanhas</h2>
<ul><li><strong>Par incompleto</strong>: só um braço está no arquivo; não há comparação até o outro chegar (um novo disparo do slot).</li>
<li><strong>Um braço só, pelo desenho da campanha</strong>: a campanha planejou só um braço (uma prova do cliente, por exemplo). Não é falta.</li>
<li><strong>Calibração (D-67) — não é resultado</strong>: piloto com o modelo real, para medir tempo, uso e saúde técnica. A comparação aparece, mas não entra na tese como resultado.</li>
<li><strong>Ensaio</strong>: dublê, roteiro ou fixture. Prova o caminho, nunca o modelo. Fica dobrado no fim da página quando há campanhas reais.</li></ul>
<h2 id="preparar">Preparar a primeira análise</h2>
<ol><li>Depois de um disparo, atualize o clone do arquivo (<span class="mono">git pull</span>) e recarregue. O par novo aparece como “sem análise: pronta para preparar”.</li>
<li>Abra o par e clique em <strong>Preparar análise</strong>. O painel confere tudo pelo sha256 que o workflow registrou, restaura o pacote de cada braço do anexo de evidências (baixando-o da Release com o <span class="mono">gh</span>, se ainda não estiver em <span class="mono">anexos/</span>) e abre a fila de revisão.</li>
<li>Se algo faltar (anexo ausente, hash divergente, linha de base ausente), a página diz em que etapa parou e por quê. Nada parcial vira análise; resolva e clique em <strong>Tentar de novo</strong>.</li>
<li>Tela com referência que navega (tela B) aparece como “fora do alcance da análise”: a análise ainda não a aceita (NAT-51).</li></ol>
<h2 id="finais-de-linha">Finais de linha (hash divergente em tudo)</h2>
<p>No Windows, o Git costuma vir com <span class="mono">core.autocrlf=true</span>. Ele troca os finais de linha dos arquivos de texto do clone (LF → CRLF) e, com isso, nenhum arquivo tem mais o sha256 que o workflow registrou: a preparação recusa a análise com “hash divergente”. O conteúdo é o mesmo, mas o painel confere byte a byte e não aceita nada diferente. Corrija o clone uma vez, no terminal, dentro da pasta do <span class="mono">govbr-resultados</span>:</p>
<pre class="mono">git config core.autocrlf false
git rm --cached -r -q .
git reset --hard</pre>
<p>Os dois últimos comandos regravam os arquivos do Git com os bytes originais. Pastas que o painel criou (<span class="mono">analises/</span>, <span class="mono">restauracoes/</span>, <span class="mono">anexos/</span>) não são do Git e ficam como estão. Depois, recarregue o painel.</p>
<h2 id="revisar">Revisar</h2>
<ol><li>No par, clique em <strong>Abrir fila de revisão</strong>. Revise antes de abrir os achados por braço, para não quebrar a cegueira. A fila não mostra o id das execuções (o slot pode dizer o braço).</li>
<li>Em cada cartão escolha uma das cinco decisões, escreva a justificativa e clique em <strong>Salvar decisão</strong>. Cada gravação vira um arquivo novo; nada é sobrescrito.</li></ol>
<h2 id="recalcular">Recalcular</h2>
<p>Quando terminar (ou quando quiser ver números parciais), clique em <strong>Recalcular</strong>. Sai uma versão nova; a anterior fica no histórico. Se o recálculo falhar, a versão anterior continua na tela e um aviso de uma frase diz o motivo; o registro completo fica em <span class="mono">revisoes/falhas/&lt;data&gt;/erro.json</span>. Se o motivo for o navegador headless que não abre, feche programas pesados e tente de novo; se repetir, rode <span class="mono">npx playwright install chromium</span> dentro do govbr-eval.</p>
<h2 id="falhas">Execução que falhou</h2>
<p>A causa curta aparece logo abaixo da execução e nos avisos; o texto inteiro está em “Identificadores completos”, na página dela. Execução <strong>sem pacote</strong> (interrompida, VM perdida) não tem o que recuperar: o slot continua visível como falha, e uma nova tentativa é um novo disparo.</p>
<h2 id="publicacao">Publicação indisponível</h2>
<p>O pacote está no arquivo, mas o anexo de evidências não foi confirmado na Release. No GitHub: Actions → a execução do workflow <span class="mono">execucao-isolada</span> → <em>Re-run failed jobs</em>. Só o job <span class="mono">arquivar</span> roda; o modelo não é chamado. Depois, atualize o clone do arquivo (<span class="mono">git pull</span>) e recarregue esta página.</p>
<h2 id="porta">Porta ocupada</h2>
<p>O painel abre em <span class="mono">http://127.0.0.1:4610/</span>. Se já houver outro painel nessa porta, o novo <strong>não sobe</strong> e o terminal diz qual arquivo o outro está servindo: feche o outro (Ctrl+C no terminal dele) ou abra este numa porta escolhida, com <span class="mono">--porta 4611</span>. Se a porta estiver ocupada por outro programa, o terminal mostra em destaque o endereço certo. O caminho do arquivo aberto aparece sempre no topo de cada página.</p>
<h2 id="limites">O que o painel não faz</h2>
<p>Não chama modelo e não mostra o gabarito. Ele só lê o arquivo aberto e grava dentro dele as análises, as decisões e os pacotes restaurados. A única saída para a rede é o <span class="mono">gh release download</span> de um anexo de evidências que falte, com a sua sessão do <span class="mono">gh</span>; abra o painel com <span class="mono">--sem-download</span> para desligar.</p>` });
}

export function paginaErro(codigo: number, texto: string, ctx: Contexto): string {
  return pagina({ titulo: codigo === 404 ? "Não encontrado" : "Erro", ctx, corpo: `<h1>${codigo === 404 ? "Não encontrado" : "Algo deu errado"}</h1><p>${esc(texto)}</p><p><a href="/">Voltar para o estado das execuções</a></p>` });
}

// ───────────────────────────────────────────────────────────────── Guia em diagramas (/guia, reveal.js)

export interface Diagrama { id: string; titulo: string; svg: string; texto: string[] }

export function paginaGuia(ctx: Contexto, diagramas: Diagrama[]): string {
  const slides = [
    `<section><h2>Guia em diagramas</h2><p>Três figuras, para quem chega agora: como um disparo anda até o painel, quais são as paredes de uma execução, e como um achado vira número.</p>
<p>Use as setas do teclado (ou toque nas laterais) para passar. <a href="/">Voltar ao painel</a>.</p></section>`,
    ...diagramas.map(d => `<section aria-labelledby="g-${esc(d.id)}"><h2 id="g-${esc(d.id)}">${esc(d.titulo)}</h2>${d.svg}${d.texto.map(t => `<p>${esc(t)}</p>`).join("")}</section>`),
  ];
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guia em diagramas · Painel de resultados</title>
<link rel="stylesheet" href="/guia/reveal/reset.css"><link rel="stylesheet" href="/guia/reveal/reveal.css"><link rel="stylesheet" href="/estilo.css"></head>
<body class="guia-corpo">
${ctx.fixture ? `<div class="fixture" role="note"><div class="in">FIXTURE SINTÉTICA — o arquivo aberto é inventado; o guia vale para qualquer arquivo.</div></div>` : ""}
<header class="guia-topo"><a class="marca" href="/">Painel de resultados</a><a href="/">Estado das execuções</a><a href="/ajuda">Como usar</a></header>
<main id="conteudo"><div class="reveal"><div class="slides">${slides.join("\n")}</div></div></main>
<script src="/guia/reveal/reveal.js"></script>
<script>
// Tela estreita (celular): sem slides escalados, que ficariam ilegíveis — as três figuras viram uma página que rola.
var deck = document.querySelector(".reveal");
if (window.innerWidth < 760) { deck.classList.remove("reveal"); deck.classList.add("guia-lista"); document.body.classList.add("guia-estreita"); }
else Reveal.initialize({ hash: true, embedded: true, controls: true, progress: true, center: false, width: 1100, height: 780, margin: 0.04, scrollActivationWidth: null });
</script>
</body></html>`;
}
