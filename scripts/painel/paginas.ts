/**
 * Painel de resultados (T8a) — HTML das páginas. Gerado no servidor a partir das vistas de
 * `modelo.ts`/`revisao.ts`; nenhum número é calculado aqui. Todo texto passa por `esc`: achados,
 * seletores e motivos vêm do agente ou do arquivo e são dado não confiável.
 */
import type { Arm } from "../../contracts/index";
import type { EntradaIndice } from "../arquivo-resultados";
import {
  dataLocal, type Fonte, type LinhaExecucao, type Selo, type Valor, type VistaExecucao, type VistaExecucoes, type VistaPar,
} from "./modelo";
import { rotuloEtapa, type Diagnostico } from "./preparar";
import type { VistaCartao, VistaFila } from "./revisao";

export const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const u = (s: string): string => encodeURIComponent(s);
const BRACO: Record<Arm, string> = { sem: "sem oráculo", com: "com oráculo" };

const CSS = `
:root{--bg:#f5f6f8;--sup:#ffffff;--tx:#16191d;--mut:#4d5864;--lin:#d3d8de;--acc:#1351b4;--acc-tx:#ffffff;
--ok-bg:#e3f2e6;--ok-tx:#14532d;--pend-bg:#fff4d6;--pend-tx:#6b4500;--fal-bg:#fde7e7;--fal-tx:#8a1c1c;
--inf-bg:#e6effb;--inf-tx:#123e7c;--neu-bg:#eceff2;--neu-tx:#3b4550;--fix-bg:#5c2d91;--fix-tx:#ffffff;--foco:#c2410c}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121518;--sup:#1b1f24;--tx:#e8ecf0;--mut:#a7b1bb;--lin:#333a42;
--acc:#7cb0ff;--acc-tx:#0b1a33;--ok-bg:#16351f;--ok-tx:#b6e8c2;--pend-bg:#3a2d0a;--pend-tx:#f7d98a;--fal-bg:#401717;--fal-tx:#f5b8b8;
--inf-bg:#16294a;--inf-tx:#bcd4fb;--neu-bg:#262c33;--neu-tx:#cfd6dd;--fix-bg:#b48ef0;--fix-tx:#1a0b33;--foco:#fdba74}}
:root[data-theme="dark"]{--bg:#121518;--sup:#1b1f24;--tx:#e8ecf0;--mut:#a7b1bb;--lin:#333a42;--acc:#7cb0ff;--acc-tx:#0b1a33}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--acc)}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--foco);outline-offset:2px}
.pular{position:absolute;left:-999px;top:0;background:var(--sup);padding:8px 12px;z-index:10}
.pular:focus{left:8px}
header.topo{background:var(--sup);border-bottom:1px solid var(--lin)}
.topo .in{max-width:1240px;margin:0 auto;padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center}
.marca{font-weight:700;font-size:17px;color:var(--tx);text-decoration:none}
nav ul{list-style:none;margin:0;padding:0;display:flex;gap:4px 16px;flex-wrap:wrap}
nav a{text-decoration:none;padding:4px 0;display:inline-block}
nav a[aria-current="page"]{font-weight:700;border-bottom:2px solid var(--acc)}
main{max-width:1240px;margin:0 auto;padding:20px 16px 48px}
h1{font-size:26px;line-height:1.25;margin:4px 0 6px}
h2{font-size:20px;margin:32px 0 10px}
h3{font-size:17px;margin:20px 0 8px}
.sub{color:var(--mut);margin:0 0 16px}
.migalha{font-size:14px;color:var(--mut);margin:0 0 4px}
.fixture{background:var(--fix-bg);color:var(--fix-tx);padding:10px 16px;font-weight:600}
.fixture .in{max-width:1240px;margin:0 auto}
.aviso{border-left:4px solid var(--pend-tx);background:var(--pend-bg);color:var(--pend-tx);padding:10px 14px;border-radius:6px;margin:12px 0}
.aviso.falha{border-color:var(--fal-tx);background:var(--fal-bg);color:var(--fal-tx)}
.aviso.info{border-color:var(--inf-tx);background:var(--inf-bg);color:var(--inf-tx)}
.aviso p{margin:4px 0}
.selo{display:inline-block;padding:2px 8px;border-radius:6px;font-size:13.5px;font-weight:600;line-height:1.5;white-space:normal}
.s-ok,.s-final{background:var(--ok-bg);color:var(--ok-tx)}
.s-pendente,.s-provisoria{background:var(--pend-bg);color:var(--pend-tx)}
.s-falha,.s-publicacao-indisponivel,.s-bloqueada{background:var(--fal-bg);color:var(--fal-tx)}
.s-par-incompleto,.s-findings-vazio,.s-sem-submissao,.s-aviso{background:var(--inf-bg);color:var(--inf-tx)}
.s-sem-analise,.s-nao-se-aplica{background:var(--neu-bg);color:var(--neu-tx)}
.cartoes{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.cartao{background:var(--sup);border:1px solid var(--lin);border-radius:10px;padding:14px 16px}
.cartao h3{margin:0 0 6px;font-size:16px}
.cartao p{margin:4px 0}
.mut{color:var(--mut)}
.peq{font-size:13.5px}
.mono{font-family:ui-monospace,Consolas,monospace;font-size:13px;overflow-wrap:anywhere}
.rolavel{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--lin);border-radius:8px;background:var(--sup)}
table{border-collapse:collapse;width:100%;font-size:15px}
caption{text-align:left;padding:10px 12px;color:var(--mut);font-size:13.5px;caption-side:top}
th,td{text-align:left;vertical-align:top;padding:8px 10px;border-top:1px solid var(--lin);overflow-wrap:break-word}
td.causa{max-width:22em;font-size:13.5px;overflow-wrap:anywhere}
thead th{background:var(--bg);font-size:13.5px;color:var(--mut);font-weight:600;border-top:0}
td .fonte{display:block;color:var(--mut);font-size:12px;font-family:ui-monospace,Consolas,monospace;overflow-wrap:anywhere;margin-top:2px}
details{background:var(--sup);border:1px solid var(--lin);border-radius:8px;padding:8px 14px;margin:12px 0}
details>summary{cursor:pointer;font-weight:600;padding:4px 0}
.botoes{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.botao,button{font:inherit;display:inline-block;padding:9px 16px;border-radius:8px;border:1px solid var(--acc);background:var(--acc);color:var(--acc-tx);cursor:pointer;text-decoration:none;min-height:44px}
.botao.sec,button.sec{background:var(--sup);color:var(--acc)}
button:disabled{opacity:.6;cursor:progress}
.msg{min-height:1.5em;margin:6px 0}
.msg.erro{color:var(--fal-tx)}
.msg.ok{color:var(--ok-tx)}
.nota-erro{color:var(--fal-tx);margin:4px 0}
@media (max-width:760px){
 table.empilha thead{position:absolute;left:-9999px}
 table.empilha tr{display:block;border-top:1px solid var(--lin);padding:8px 0}
 table.empilha th[scope=row]{display:block;border:0;padding:4px 12px}
 table.empilha td{display:block;position:relative;border:0;padding:4px 12px 4px calc(40% + 12px);min-height:1.6em}
 table.empilha td::before{content:attr(data-rotulo);position:absolute;left:12px;width:calc(40% - 8px);font-weight:600;color:var(--mut);font-size:13.5px}
 td.causa{max-width:none}
 h1{font-size:22px}
}
.card-rev{background:var(--sup);border:1px solid var(--lin);border-radius:10px;padding:16px;margin:16px 0}
.card-rev h3{margin-top:0}
.campo{margin:10px 0}
.campo>.rot{display:block;font-size:13px;font-weight:600;color:var(--mut);text-transform:uppercase;letter-spacing:.03em}
.campo pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:2px 0;font:inherit}
.unidade{border-left:3px solid var(--acc);padding:6px 10px;margin:6px 0;background:var(--bg);border-radius:0 6px 6px 0}
fieldset{border:1px solid var(--lin);border-radius:8px;padding:8px 12px;margin:10px 0}
legend{font-weight:600;padding:0 4px}
.opcao{display:flex;gap:8px;align-items:flex-start;padding:6px 0}
.opcao input{margin-top:5px;width:18px;height:18px;flex:none}
label{cursor:pointer}
input[type=text],textarea,select{font:inherit;width:100%;padding:8px 10px;border:1px solid var(--mut);border-radius:6px;background:var(--sup);color:var(--tx)}
img.cena{max-width:100%;height:auto;border:1px solid var(--lin);border-radius:6px}
.oculto{display:none}
dl.kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0}
dl.kv dt{color:var(--mut);font-weight:600}
dl.kv dd{margin:0;overflow-wrap:anywhere}
@media (max-width:520px){dl.kv{grid-template-columns:1fr}dl.kv dd{margin-bottom:6px}}
`;

export function selo(s: Selo): string {
  return `<span class="selo s-${esc(s.estado)}">${esc(s.texto)}</span>`;
}

function fonteCurta(f: Fonte): string {
  return `${f.arquivo} → ${f.campo}`;
}

export function pagina(o: { titulo: string; ativo?: "execucoes" | "ajuda" | null; fixture: boolean; corpo: string; script?: string }): string {
  const link = (href: string, nome: string, id: string) => `<li><a href="${href}"${o.ativo === id ? ' aria-current="page"' : ""}>${nome}</a></li>`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.titulo)} · Painel de resultados</title><style>${CSS}</style></head><body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<header class="topo">${o.fixture ? `<div class="fixture" role="note"><div class="in">FIXTURE SINTÉTICA — estes dados são inventados para testar o painel. Não são resultado científico.</div></div>` : ""}<div class="in"><a class="marca" href="/">Painel de resultados</a>
<nav aria-label="Principal"><ul>${link("/", "Execuções e pares", "execucoes")}${link("/ajuda", "Como usar", "ajuda")}</ul></nav></div></header>
<main id="conteudo">${o.corpo}</main>
${o.script ? `<script>${o.script}</script>` : ""}
</body></html>`;
}

// ───────────────────────────────────────────────────────────────── Execuções

function celulaExecucao(x: LinhaExecucao): string {
  const td = (rot: string, html: string) => `<td data-rotulo="${esc(rot)}">${html}</td>`;
  return `<tr>
${td("Execução", `<a href="/execucao/${u(x.chave)}">${esc(x.dataLocal)}</a><span class="fonte">${esc(x.dataUtc)} UTC</span>`)}
${td("Tela · par", `${esc(x.tela)}${x.natureza === "ensaio" ? ' <span class="selo s-aviso">ensaio</span>' : ""}${x.par ? `<br><a href="/par/${u(x.campanha)}/${u(x.par)}">${esc(x.par)}</a>` : ""}`)}
${td("Modelo · esforço", `${esc(x.modelo ?? "—")} · ${esc(x.esforco ?? "—")}`)}
${td("Braço", x.braco ? esc(BRACO[x.braco]) : "—")}
${td("Status técnico", selo(x.tecnico))}
${td("Achados", x.achados.estado === "vazia" ? selo({ estado: "findings-vazio", texto: "0 — lista vazia" })
    : x.achados.estado === "lista" ? esc(String(x.achados.total))
    : selo({ estado: "sem-submissao", texto: x.achados.estado === "sem-pacote" ? "sem pacote" : x.achados.estado === "recusada" ? "recusada" : "nenhuma submissão" }))}
${td("Pontuação", selo(x.pontuacao))}
${td("Publicação", selo(x.publicacao))}
<td class="causa" data-rotulo="Causa da falha">${x.causaFalha ? esc(x.causaFalha) : "—"}</td>
</tr>`;
}

export function paginaExecucoes(v: VistaExecucoes, preparo: Record<string, Diagnostico> = {}): string {
  const pares = v.pares.length ? `<div class="cartoes">${v.pares.map(p => {
    const d = preparo[`${p.campanha}/${p.par}`];
    return `<article class="cartao">
<h3><a href="/par/${u(p.campanha)}/${u(p.par)}">Par ${esc(p.par)}</a></h3>
<p>${selo(d ? d.selo : p.selo)}</p>${d?.pode ? `<p class="peq"><a href="/par/${u(p.campanha)}/${u(p.par)}#preparar">Preparar análise</a></p>` : ""}
<p class="peq">${esc(p.tela)} · ${esc(p.modelo ?? "—")}</p>
<p class="peq mut">${esc(dataLocal(p.dataUtc))} · braços no arquivo: ${p.bracos.length ? p.bracos.map(b => esc(b)).join(" e ") : "nenhum"}</p>
</article>`;
  }).join("")}</div>` : `<p class="mut">Nenhum par no arquivo ainda.</p>`;
  const linhas = v.execucoes.length ? `<div class="rolavel"><table class="empilha">
<caption>Fonte: <span class="mono">indice/entradas/*.json</span> (T4) e, quando há análise, <span class="mono">analysis-binding.&lt;braço&gt;.json</span> da revisão atual (T6). Mais recente primeiro.</caption>
<thead><tr><th scope="col">Execução (abre o resumo técnico)</th><th scope="col">Tela · par</th><th scope="col">Modelo · esforço</th><th scope="col">Braço</th><th scope="col">Status técnico</th><th scope="col">Achados</th><th scope="col">Pontuação</th><th scope="col">Publicação</th><th scope="col">Causa da falha</th></tr></thead>
<tbody>${v.execucoes.map(celulaExecucao).join("")}</tbody></table></div>`
    : `<p class="mut">O índice do arquivo não tem execuções. Depois de um disparo do workflow, atualize o clone (<span class="mono">git pull</span>) e recarregue.</p>`;
  const lbs = v.linhasDeBase.length ? `<details><summary>Linhas de base (${v.linhasDeBase.length})</summary>
<div class="rolavel"><table class="empilha"><thead><tr><th scope="col">Data</th><th scope="col">Id</th><th scope="col">Tela</th><th scope="col">Status</th><th scope="col">Utilizável pela análise</th><th scope="col">Motivo</th></tr></thead><tbody>
${v.linhasDeBase.map((e: EntradaIndice) => `<tr><td data-rotulo="Data">${esc(dataLocal(e.dataUtc))}</td><td data-rotulo="Id" class="mono">${esc(e.chave)}</td><td data-rotulo="Tela">${esc(e.tela)}</td>
<td data-rotulo="Status">${esc(e.estado.tecnico ?? "—")}</td><td data-rotulo="Utilizável">${e.estado.linhaDeBase === "utilizavel" ? selo({ estado: "ok", texto: "sim" }) : selo({ estado: "falha", texto: "não" })}</td><td data-rotulo="Motivo" class="peq">${esc(e.motivo ?? "—")}</td></tr>`).join("")}
</tbody></table></div></details>` : "";
  const ruins = v.ilegiveis.length ? `<div class="aviso falha" role="alert"><p><strong>Entradas do índice que não puderam ser lidas (${v.ilegiveis.length}).</strong> Elas não aparecem na tabela; o resto continua valendo.</p>
${v.ilegiveis.map(i => `<p class="mono">${esc(i.arquivo)}: ${esc(i.erro)}</p>`).join("")}</div>` : "";
  return pagina({ titulo: "Execuções e pares", ativo: "execucoes", fixture: v.fixture, corpo: `
<h1>Execuções e pares</h1>
<p class="sub">O que está no arquivo de resultados, do mais recente para o mais antigo. Cada linha diz se a execução rodou, se já tem pontuação e se a publicação deu certo.</p>
${ruins}
<h2>Pares sem/com</h2>
${pares}
<h2>Execuções</h2>
${linhas}
${lbs}
<details><summary>O que quer dizer cada estado</summary>
<ul>
<li>${selo({ estado: "pendente", texto: "aguardando revisão" })} — a execução rodou; os cartões ainda não foram decididos. Recall e precisão ficam “indisponível” (nunca 0).</li>
<li>${selo({ estado: "provisoria", texto: "provisória" })} — parte dos cartões foi decidida.</li>
<li>${selo({ estado: "final", texto: "final" })} — todos os cartões decididos; o número não muda mais sem uma revisão nova.</li>
<li>${selo({ estado: "falha", texto: "falhou" })} — a execução não terminou; a causa aparece na última coluna.</li>
<li>${selo({ estado: "findings-vazio", texto: "0 — lista vazia" })} — o agente terminou e não alegou nada. É um resultado, diferente de “nenhuma submissão”.</li>
<li>${selo({ estado: "par-incompleto", texto: "par incompleto" })} — só um dos braços está no arquivo; não há comparação.</li>
<li>${selo({ estado: "publicacao-indisponivel", texto: "publicação indisponível" })} — o pacote está no arquivo, mas o anexo de evidências não foi confirmado. Veja “Como usar”.</li>
<li>${selo({ estado: "sem-analise", texto: "sem análise: pronta para preparar" })} — o par chegou do workflow e ainda não foi analisado. Abra o par e clique em <strong>Preparar análise</strong>.</li>
<li>${selo({ estado: "falha", texto: "preparação falhou" })} — a última tentativa de preparar parou numa etapa; o motivo está na página do par, e nada parcial foi mostrado como resultado.</li>
<li>${selo({ estado: "nao-se-aplica", texto: "fora do alcance da análise" })} — tela cuja referência navega (tela B): a análise ainda não a aceita.</li>
</ul></details>` });
}

// ───────────────────────────────────────────────────────────────── Preparar análise (T8a.1)

function blocoPreparo(d: Diagnostico, api: string, oQue: string): string {
  if (d.foraDeAlcance) {
    return `<div class="aviso info" role="status" id="preparar"><p><strong>Fora do alcance da análise.</strong> ${esc(d.motivo)}</p>
<p class="peq">As execuções e o resumo técnico continuam disponíveis; a pontuação dessa tela espera a decisão registrada no NAT-51.</p></div>`;
  }
  if (!d.pode) return `<div class="aviso info" role="status" id="preparar"><p><strong>Não dá para preparar a análise ${esc(oQue)}.</strong> ${esc(d.motivo)}</p></div>`;
  const f = d.ultimaFalha;
  return `<section aria-labelledby="t-preparar" id="preparar"><h2 id="t-preparar">Preparar a análise ${esc(oQue)}</h2>
${f ? `<div class="aviso falha" role="alert"><p><strong>A última tentativa, em ${esc(dataLocal(f.em))}, parou na etapa “${esc(rotuloEtapa(f.etapa))}”.</strong> ${esc(f.motivo)}</p>
<p class="peq">Nada foi gravado como análise. Registro: <span class="mono">${esc(f.rel)}</span>. Depois de resolver a causa, tente de novo.</p></div>` : ""}
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
    else { msg.className="msg erro"; msg.textContent="Não preparada (etapa "+j.etapa+"): "+j.erro+" Nada foi mostrado como resultado."; b.disabled=false; }
  }catch(e){ msg.className="msg erro"; msg.textContent="Sem resposta do painel: "+e; b.disabled=false; }
});});`;

// ───────────────────────────────────────────────────────────────── Par

function tabelaMetricas(v: VistaPar): string {
  const an = v.analise!, rv = an.atual!;
  const bracos = (["sem", "com"] as Arm[]).filter(a => rv.resumo.execucoes.some(e => e.braco === a));
  const runDe = (a: Arm) => rv.resumo.execucoes.find(e => e.braco === a)!.runId;
  return `<div class="rolavel"><table class="empilha">
<caption>Fonte: <span class="mono">${esc(rv.rel)}/summary.json</span> · formato ${esc(rv.resumo.formato)} · scorer ${esc(rv.resumo.versoes?.scorer.version ?? "?")} · atualizado ${esc(dataLocal(rv.resumo.geradoEm))} · pacotes ${bracos.map(a => `${esc(a)} = <span class="mono">${esc(runDe(a))}</span>`).join(", ")}</caption>
<thead><tr><th scope="col">Medida</th>${bracos.map(a => `<th scope="col">${esc(BRACO[a])}</th>`).join("")}</tr></thead>
<tbody>${v.metricas!.map(l => `<tr><th scope="row">${esc(l.rotulo)}</th>${bracos.map(a => {
    const val = l.valores[a];
    return `<td data-rotulo="${esc(BRACO[a])}">${val ? `${esc(val.texto)}<span class="fonte">${esc(val.fonte.campo)}</span>` : "—"}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function valorComFonte(rotulo: string, v: Valor): string {
  return `<tr><th scope="row">${esc(rotulo)}</th><td>${esc(v.texto)}<span class="fonte">${esc(fonteCurta(v.fonte))}</span></td></tr>`;
}

export function paginaPar(v: VistaPar, preparo: Diagnostico | null = null): string {
  const an = v.analise;
  const rv = an?.atual ?? null;
  const partes: string[] = [];
  partes.push(`<p class="migalha"><a href="/">Execuções e pares</a> › Par ${esc(v.par)}</p>
<h1>Par ${esc(v.par)}</h1>
<p class="sub">Campanha <span class="mono">${esc(v.campanha)}</span>. Mesma tela, mesmo modelo e mesma configuração; só muda a disponibilidade do oráculo.</p>`);
  for (const a of an?.avisos ?? []) partes.push(`<div class="aviso falha" role="alert"><p>${esc(a)}</p></div>`);
  if (v.faltando.length) {
    partes.push(`<div class="aviso info" role="status"><p><strong>Par incompleto: falta o braço ${v.faltando.map(f => esc(BRACO[f])).join(" e ")}.</strong></p>
<p>Nenhuma execução desse braço está no arquivo. A comparação com − sem só existe quando os dois braços estão lá; nada foi estimado no lugar.</p></div>`);
  }

  // 1. comparação (o resultado mais recente primeiro)
  partes.push(`<h2>Comparação com − sem</h2>`);
  if (!an) {
    partes.push(`<p class="mut">Ainda não há análise deste par no arquivo. ${v.faltando.length ? "A análise de par espera os dois braços." : preparo?.pode ? "Prepare a análise abaixo: ela cria a primeira versão." : ""}</p>`);
    if (preparo) partes.push(blocoPreparo(preparo, `/api/preparar/par/${u(v.campanha)}/${u(v.par)}`, "do par"));
  } else if (!rv) {
    partes.push(`<p class="mut">A análise ainda não tem versão íntegra.</p>
<div class="botoes"><button type="button" data-recalcular="${esc(`${an.campanha}/${an.alvo}`)}">Tentar calcular de novo</button></div>
<p class="msg" id="msg-recalc" role="status" aria-live="polite"></p>`);
  }
  else if (rv.resumo.analise.estado === "bloqueada") partes.push(`<div class="aviso falha"><p><strong>Análise bloqueada:</strong> ${esc(rv.resumo.analise.motivo)}</p><p>O resumo técnico continua valendo; as métricas ficam indisponíveis.</p></div>`);
  else if (v.comparacao) {
    const c = v.comparacao;
    partes.push(`<p><strong>${esc(c.nota)}</strong></p>`);
    if (!c.disponivel) partes.push(`<div class="aviso info"><p><strong>Comparação indisponível.</strong> ${esc(c.motivo)}</p></div>`);
    else {
      partes.push(`<p>${selo(c.estado === "final" ? { estado: "final", texto: "final: as duas revisões fechadas" } : { estado: "provisoria", texto: "provisória: há cartões pendentes" })}</p>
<div class="rolavel"><table><caption>Fonte: <span class="mono">${esc(c.fonte.arquivo)}</span> · ${esc(c.fonte.versao)} · atualizado ${esc(dataLocal(c.fonte.atualizadoEm))} · pacotes <span class="mono">${esc(c.fonte.pacote)}</span></caption>
<tbody>${valorComFonte("Diferença de defeitos confirmados (com − sem)", c.diferencaUnidades)}${valorComFonte("Diferença de recall (com − sem)", c.diferencaRecall)}</tbody></table></div>`);
      const lista = (t: string, xs: { specId: string; elemento: string }[]) => `<li><strong>${esc(t)}:</strong> ${xs.length ? xs.map(x => `${esc(x.specId)} (${esc(x.elemento)})`).join("; ") : "nenhum"}</li>`;
      if (c.unidades) partes.push(`<h3>Por defeito da referência</h3><ul>${lista("Só o com detectou", c.unidades.soCom)}${lista("Só o sem detectou", c.unidades.soSem)}${lista("Os dois detectaram", c.unidades.ambos)}${lista("Nenhum detectou", c.unidades.nenhum)}</ul>`);
    }
  } else partes.push(`<p class="mut">Esta análise é de uma execução só; não há comparação.</p>`);

  // 2. resultado por braço
  if (rv && v.metricas) partes.push(`<h2>Resultado por braço</h2>${tabelaMetricas(v)}
<p class="peq mut">Recall e precisão só aparecem com a revisão fechada; enquanto houver cartão pendente ficam “indisponível” (nunca 0).</p>`);

  // 3. revisão e ações
  if (an && rv) {
    const pend = rv.resumo.revisaoSemantica?.pendentes ?? 0;
    partes.push(`<h2>Revisão</h2>
<p>Versão atual: <strong>${esc(rv.nome)}</strong> (revisão nº ${esc(rv.resumo.revisao.numero)}), calculada em ${esc(dataLocal(rv.resumo.geradoEm))}. Cartões pendentes na fila desta versão: <strong>${esc(pend)}</strong>.</p>
<div class="botoes">${rv.resumo.revisaoSemantica ? `<a class="botao" href="/revisao/${u(an.campanha)}/${u(an.alvo)}">Abrir fila de revisão</a>` : ""}
<button type="button" class="sec" data-recalcular="${esc(`${an.campanha}/${an.alvo}`)}">Recalcular</button>
<a class="botao sec" href="/baixar/analise/${u(an.campanha)}/${u(an.alvo)}/${u(rv.nome)}.tar.gz" download>Baixar esta versão (.tar.gz)</a></div>
<p class="msg" id="msg-recalc" role="status" aria-live="polite"></p>`);
  }

  // 4. execuções do par
  partes.push(`<h2>Execuções do par</h2><div class="rolavel"><table class="empilha"><thead><tr><th scope="col">Braço</th><th scope="col">Execução</th><th scope="col">Data</th><th scope="col">Status técnico</th><th scope="col">Achados</th><th scope="col">Publicação</th></tr></thead><tbody>
${(["sem", "com"] as Arm[]).map(a => (v.bracos[a] ?? []).map(x => `<tr><td data-rotulo="Braço">${esc(BRACO[a])}</td><td data-rotulo="Execução"><a class="mono" href="/execucao/${u(x.chave)}">${esc(x.chave)}</a></td>
<td data-rotulo="Data">${esc(x.dataLocal)}</td><td data-rotulo="Status técnico">${selo(x.tecnico)}</td><td data-rotulo="Achados">${esc(x.achados.texto)}</td><td data-rotulo="Publicação">${selo(x.publicacao)}</td></tr>`).join("")
    || `<tr><td data-rotulo="Braço">${esc(BRACO[a])}</td><td colspan="5" data-rotulo="Execução">${selo({ estado: "par-incompleto", texto: "falta este braço" })}</td></tr>`).join("")}
</tbody></table></div>`);

  // 5. dobrados: achados (quebra a cegueira) e histórico
  if (rv) {
    const ach = (["sem", "com"] as Arm[]).map(a => {
      const x = v.achadosPorBraco[a];
      if (x === undefined) return "";
      return `<h3>${esc(BRACO[a])}</h3>${x === null ? `<p>Nenhuma submissão aceita (não é zero achados).</p>` : x.total === 0 ? `<p>0 achados: lista vazia aceita pelo coletor.</p>`
        : `<div class="rolavel"><table class="empilha"><thead><tr><th scope="col">Seletor</th><th scope="col">Regra</th><th scope="col">Observado (texto do agente)</th></tr></thead><tbody>${x.itens.map(i => `<tr><td data-rotulo="Seletor" class="mono">${esc(i.seletor)}</td><td data-rotulo="Regra">${esc(i.regra ?? "incerta")}</td><td data-rotulo="Observado">${esc(i.observado)}</td></tr>`).join("")}</tbody></table></div>`}`;
    }).join("");
    partes.push(`<details><summary>Achados enviados por braço${v.revisaoAberta ? " — abrir antes de revisar quebra a cegueira" : ""}</summary>
${v.revisaoAberta ? `<div class="aviso"><p>A revisão deste par ainda está aberta. Ver os achados de cada braço antes de decidir os cartões revela de que braço cada alegação veio.</p></div>` : ""}
<p class="peq mut">Fonte: <span class="mono">${esc(rv.rel)}/summary.json → execucoes[].achados</span>. Texto vindo do agente: dado não confiável, mostrado escapado.</p>${ach}</details>`);
    partes.push(`<details><summary>Histórico de versões (${an!.revisoes.length} íntegra(s), ${an!.falhas.length} falha(s))</summary>
<ul>${an!.revisoes.map(r => `<li><strong>${esc(r.nome)}</strong> — ${esc(dataLocal(r.resumo.geradoEm))} · análise ${esc(r.resumo.analise.estado)} · hash científico <span class="mono">${esc(r.resumo.hashes.conteudoCientificoSha256.slice(0, 12))}</span>${r === rv ? " · <em>atual</em>" : ""} · <a href="/baixar/analise/${u(an!.campanha)}/${u(an!.alvo)}/${u(r.nome)}.tar.gz" download>baixar</a></li>`).join("")}
${an!.falhas.map(f => `<li>${selo({ estado: "falha", texto: "falhou" })} ${esc(dataLocal(f.em))} — ${esc(f.motivo)} <span class="mono peq">${esc(f.rel)}</span></li>`).join("")}</ul></details>`);
  }
  return pagina({ titulo: `Par ${v.par}`, fixture: v.fixture, corpo: partes.join("\n"), script: SCRIPT_RECALCULAR + SCRIPT_PREPARAR });
}

// ───────────────────────────────────────────────────────────────── Execução

function tabelaTecnica(titulo: string, linhas: VistaExecucao["tecnico"]): string {
  if (!linhas.length) return "";
  const f0 = linhas[0].valor.fonte;
  return `<h2>${esc(titulo)}</h2><div class="rolavel"><table>
<caption>Fonte: <span class="mono">${esc(f0.arquivo)}</span> · ${esc(f0.versao ?? "versão não registrada")} · atualizado ${esc(dataLocal(f0.atualizadoEm))} · pacote <span class="mono">${esc(f0.pacote ?? "—")}</span></caption>
<tbody>${linhas.map(l => `<tr><th scope="row">${esc(l.rotulo)}</th><td>${esc(l.valor.texto)}<span class="fonte">${esc(l.valor.fonte.campo)}</span></td></tr>`).join("")}</tbody></table></div>`;
}

export function paginaExecucao(v: VistaExecucao, preparo: Diagnostico | null = null): string {
  const x = v.linha, e = v.entrada;
  const ev = e.evidencias;
  return pagina({ titulo: `Execução ${x.chave}`, fixture: v.fixture, script: SCRIPT_PREPARAR, corpo: `
<p class="migalha"><a href="/">Execuções e pares</a>${x.par ? ` › <a href="/par/${u(x.campanha)}/${u(x.par)}">Par ${esc(x.par)}</a>` : ""} › Execução</p>
<h1>Resumo técnico</h1>
<p class="sub mono">${esc(x.chave)}</p>
<p>${selo(x.tecnico)} ${selo(x.pontuacao)} ${selo(x.publicacao)}</p>
${v.origem === "pacote" ? `<div class="aviso info"><p>Esta execução ainda não tem análise. O resumo abaixo vem direto do <span class="mono">run.json</span> arquivado: estado, falha e consumo, sem pontuação.${x.par && !preparo ? ` A análise é feita no <a href="/par/${u(x.campanha)}/${u(x.par)}#preparar">par ${esc(x.par)}</a>.` : ""}</p></div>` : ""}
${preparo ? blocoPreparo(preparo, `/api/preparar/execucao/${u(x.chave)}`, "desta execução (individual)") : ""}
${v.origem === "sem-pacote" ? `<div class="aviso falha"><p><strong>Execução interrompida sem pacote.</strong> ${esc(v.despacho?.motivo ?? x.causaFalha ?? "")}</p><p class="peq">Fonte: <span class="mono">${esc(v.despacho?.fonte ?? "")}</span>. Nenhum resultado foi inventado; o slot fica visível.</p></div>` : ""}
<h2>Identidade</h2>
<dl class="kv"><dt>Tela</dt><dd>${esc(x.tela)}</dd><dt>Braço</dt><dd>${x.braco ? esc(BRACO[x.braco]) : "—"}</dd><dt>Modelo</dt><dd>${esc(x.modelo ?? "—")}</dd>
<dt>Esforço</dt><dd>${esc(x.esforco ?? "—")}</dd><dt>Data</dt><dd>${esc(x.dataLocal)} · ${esc(x.dataUtc)} UTC</dd><dt>Campanha · slot · par</dt><dd class="mono">${esc(x.campanha)} · ${esc(x.slot ?? "—")} · ${esc(x.par ?? "—")}</dd>
<dt>Natureza</dt><dd>${x.natureza === "ensaio" ? "ensaio (dublê, roteiro ou fixture — nunca dado científico)" : "execução formal"}</dd>
<dt>Pasta no arquivo</dt><dd class="mono">${esc(x.caminho)}</dd><dt>Fonte</dt><dd class="mono">${esc(x.arquivoEntrada)}</dd></dl>
${tabelaTecnica("Estado", v.tecnico)}
${tabelaTecnica("MCP e isolamento", v.isolamento)}
${tabelaTecnica("Custo e tempo", v.custo)}
${v.custo.length ? `<p class="peq mut">“Desconhecido” é o que o cliente ou o runner não mediu — nunca vira 0. Estimativa a preço de referência não é fatura.</p>` : ""}
<h2>Publicação</h2>
<p>${selo(x.publicacao)}</p>
${ev ? `<dl class="kv"><dt>Anexo</dt><dd class="mono">${esc(ev.anexo ?? "—")}</dd><dt>Release</dt><dd class="mono">${esc(ev.release ?? "—")}</dd>
<dt>sha256</dt><dd class="mono">${esc(ev.sha256 ?? "—")}</dd><dt>Entrega</dt><dd>${esc(ev.estado)}</dd>${ev.url ? `<dt>Endereço</dt><dd class="mono">${esc(ev.url)}</dd>` : ""}</dl>` : ""}
${x.publicacao.estado === "publicacao-indisponivel" ? `<div class="aviso"><p><strong>Como recuperar:</strong> no GitHub, abra a execução do workflow e use <em>Re-run failed jobs</em>. Só o job <span class="mono">arquivar</span> roda de novo; o modelo não é chamado e o mesmo pacote é reenviado. Passo a passo em “Como usar”.</p></div>` : ""}
${v.origem !== "sem-pacote" ? `<div class="botoes"><a class="botao sec" href="/baixar/execucao/${u(x.chave)}.tar.gz" download>Baixar o pacote arquivado (.tar.gz)</a></div>
<p class="peq mut">O download traz os JSONs do pacote, o despacho e o resumo da coleta, como estão no arquivo. As evidências completas (capturas) ficam no anexo da Release.</p>` : ""}
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

function cartaoRevisao(c: VistaCartao, n: number, total: number, f: VistaFila, todos: VistaCartao[]): string {
  const id = c.id.slice(2, 14);
  const decididos = todos.filter(o => c.duplicataDe.includes(o.id) && o.decisao.status === "decidido");
  const campo = (rot: string, html: string) => `<div class="campo"><span class="rot">${esc(rot)}</span>${html}</div>`;
  const nome = (s: string) => `${s}-${id}`;
  return `<article class="card-rev" id="c-${esc(c.id)}" aria-labelledby="t-${id}">
<h3 id="t-${id}">Cartão ${n} de ${total} · ${c.decisao.status === "decidido" ? selo({ estado: "final", texto: `decidido: ${c.decisao.decisao ?? "?"}` }) : selo({ estado: "pendente", texto: "pendente" })}</h3>
<p class="peq mut">${esc(c.origem)} · cena ${esc(c.cena)} · <span class="mono">${esc(c.id.slice(0, 18))}…</span></p>
${c.sinais.length ? `<p>${c.sinais.map(s => `<span class="selo s-aviso">${esc(s)}</span>`).join(" ")}</p>` : ""}
${campo("Observado", `<pre>${esc(c.observado ?? "(retido ou ausente)")}</pre>`)}
${campo("Esperado", `<pre>${esc(c.esperado ?? "(retido ou ausente)")}</pre>`)}
${campo("Regra declarada", `<pre>${esc(c.regra ?? "nenhuma (atribuição incerta)")}</pre>`)}
${campo("Janela e interações", `<pre>${esc(c.janela)}</pre>`)}
${campo("Elementos alegados", c.sujeitos.map(s => `<pre class="mono">${esc(s.rotulo)}${s.oculto ? ` · OCULTO: ${esc(s.oculto)}` : ""}</pre>`).join(""))}
${campo("Unidades candidatas (sugestão, não crédito)", c.candidatas.length ? c.candidatas.map(un => `<div class="unidade"><strong>${esc(un.specId)}</strong> · ${esc(un.estado)}<br>${esc(un.descricao)}<br><span class="peq mut">${esc(un.predicado)}</span></div>`).join("") : `<p class="mut">Nenhuma. Um defeito novo correto continua possível.</p>`)}
${campo("Evidência da execução", c.evidencias.length ? `<ul>${c.evidencias.map(ev => `<li>${ev.url ? `<a href="${esc(ev.url)}" target="_blank" rel="noopener">Evidência ${ev.n}</a>` : `Evidência ${ev.n}`} · ${esc(ev.status)}${ev.sha256 ? ` · sha256 <span class="mono">${esc(ev.sha256)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="mut">Nenhuma referência declarada.</p>`)}
${c.imagemCena ? `<details><summary>Reconstrução da cena (não é evidência da execução)</summary><img class="cena" loading="lazy" src="${esc(c.imagemCena)}" alt="Captura da página congelada na cena ${esc(c.cena)}, refeita no momento da análise"></details>` : ""}
${campo("Retido na cegueira", `<p class="peq mut">${esc(c.retido)}</p>`)}
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

export function paginaFila(f: VistaFila, fixture: boolean, revisoraPadrao: string): string {
  const an = f.analise, rv = f.revisao;
  const pend = f.cartoes.filter(c => c.decisao.status === "pendente");
  const feitos = f.cartoes.filter(c => c.decisao.status === "decidido");
  const hist = an.decisoes;
  return pagina({ titulo: `Revisão ${an.alvo}`, fixture, corpo: `
<p class="migalha"><a href="/">Execuções e pares</a> › <a href="/par/${u(an.campanha)}/${u(an.alvo)}">${esc(an.alvo)}</a> › Fila de revisão</p>
<h1>Fila de revisão — ${esc(an.alvo)}</h1>
<p class="sub">${f.cartoes.length} cartões · ${pend.length} pendente(s) · ${feitos.length} decidido(s). Revisão cega: o braço, o id da execução e o nome dos arquivos de evidência não aparecem aqui.</p>
${an.avisos.map(a => `<div class="aviso falha" role="alert"><p>${esc(a)}</p></div>`).join("")}
${f.naoIncorporadas ? `<div class="aviso" role="status"><p><strong>${f.naoIncorporadas} decisão(ões) salva(s) depois do último cálculo (${esc(rv.nome)}).</strong> A pontuação só muda quando você clicar em Recalcular.</p></div>` : ""}
<div class="campo"><label class="rot" for="revisora">Seu nome (assina cada decisão)</label><input type="text" id="revisora" autocomplete="name" value="${esc(revisoraPadrao)}"></div>
<div class="botoes"><button type="button" data-recalcular="${esc(`${an.campanha}/${an.alvo}`)}">Recalcular a pontuação</button>
<a class="botao sec" href="/par/${u(an.campanha)}/${u(an.alvo)}">Ver o resultado do par</a></div>
<p class="msg" id="msg-recalc" role="status" aria-live="polite"></p>
<p class="peq mut">Decisões em vigor: <span class="mono">${esc(f.origemDecisoes)}</span> (versão ${f.versaoDecisoes}). Pacote: <span class="mono">${esc(rv.rel)}/revisao</span>, calculado em ${esc(dataLocal(rv.resumo.geradoEm))}.</p>
<h2>Pendentes (${pend.length})</h2>
${pend.length ? pend.map(c => cartaoRevisao(c, f.cartoes.indexOf(c) + 1, f.cartoes.length, f, f.cartoes)).join("") : `<div class="aviso info"><p><strong>Nenhum cartão pendente.</strong> Clique em Recalcular para gravar a pontuação final${f.naoIncorporadas ? "" : " (se ainda não o fez)"}.</p></div>`}
<details><summary>Já decididos (${feitos.length})</summary>${feitos.map(c => cartaoRevisao(c, f.cartoes.indexOf(c) + 1, f.cartoes.length, f, f.cartoes)).join("") || "<p>Nenhum ainda.</p>"}</details>
<details><summary>Histórico das gravações (${hist.length})</summary>
${hist.length ? `<div class="rolavel"><table class="empilha"><thead><tr><th scope="col">Versão</th><th scope="col">Salva em</th><th scope="col">Revisora</th><th scope="col">Cartão</th><th scope="col">Decisão</th><th scope="col">Justificativa</th></tr></thead><tbody>
${hist.map(h => `<tr><td data-rotulo="Versão" class="mono">${esc(h.nome)}</td><td data-rotulo="Salva em">${esc(dataLocal(h.meta?.salvoEm))}</td><td data-rotulo="Revisora">${esc(h.meta?.revisora ?? "—")}</td>
<td data-rotulo="Cartão" class="mono">${esc((h.meta?.cartao ?? "").slice(0, 14))}…</td><td data-rotulo="Decisão">${esc(h.meta?.decisao ?? "—")}</td><td data-rotulo="Justificativa">${esc(h.meta?.justificativa ?? "—")}</td></tr>`).join("")}
</tbody></table></div><p class="peq mut">Cada gravação é um arquivo novo em <span class="mono">${esc(an.rel)}/decisoes/</span>; nenhum é sobrescrito.</p>` : "<p>Nenhuma gravação ainda.</p>"}</details>
`, script: SCRIPT_RECALCULAR + scriptFila(an.campanha, an.alvo, f.versaoDecisoes) });
}

const SCRIPT_RECALCULAR = `
document.querySelectorAll("[data-recalcular]").forEach(function(b){b.addEventListener("click",async function(){
  var msg=document.getElementById("msg-recalc"); var alvo=b.getAttribute("data-recalcular");
  b.disabled=true; msg.className="msg"; msg.textContent="Recalculando… isto leva alguns segundos (o navegador headless reconstrói a página congelada).";
  try{ var r=await fetch("/api/recalcular/"+alvo,{method:"POST",headers:{"content-type":"application/json"},body:"{}"}); var j=await r.json();
    if(j.ok){ msg.className="msg ok"; msg.textContent="Pronto: nova versão "+j.revisao.split("/").pop()+" ("+j.estado+"). Recarregando…"; setTimeout(function(){location.reload()},900); }
    else { msg.className="msg retorno erro"; msg.textContent="O recálculo falhou e a versão anterior continua valendo: "+j.erro+(j.falha?" Registro completo: "+j.falha+"/erro.json.":""); b.disabled=false; }
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

export function paginaAjuda(fixture: boolean, arquivoRotulo: string): string {
  return pagina({ titulo: "Como usar", ativo: "ajuda", fixture, corpo: `
<h1>Como usar o painel</h1>
<p class="sub">Arquivo aberto: <span class="mono">${esc(arquivoRotulo)}</span>. O guia completo, com o disparo do workflow, está em <span class="mono">govbr-eval/docs/painel-resultados.md</span>.</p>
<h2>Ler um resultado</h2>
<ol><li>Em <a href="/">Execuções e pares</a>, o mais recente vem primeiro. Cada linha diz se a execução rodou, quantos achados enviou, se já tem pontuação e se a publicação deu certo.</li>
<li>Abra o par. A comparação com − sem aparece no topo, com a nota “n = 1 par, sem inferência”. Embaixo de cada número está o arquivo e o campo de onde ele veio.</li>
<li>“indisponível” quer dizer que o número ainda não existe (revisão aberta, análise bloqueada). Nunca é zero.</li></ol>
<h2>Preparar a primeira análise</h2>
<ol><li>Depois de um disparo, atualize o clone do arquivo (<span class="mono">git pull</span>) e recarregue. O par novo aparece como “sem análise: pronta para preparar”.</li>
<li>Abra o par e clique em <strong>Preparar análise</strong>. O painel confere tudo pelo sha256 que o workflow registrou, restaura o pacote de cada braço do anexo de evidências (baixando-o da Release com o <span class="mono">gh</span>, se ainda não estiver em <span class="mono">anexos/</span>) e abre a fila de revisão.</li>
<li>Se algo faltar (anexo ausente, hash divergente, linha de base ausente), a página diz em que etapa parou e por quê. Nada parcial vira análise; resolva e clique em <strong>Tentar de novo</strong>.</li>
<li>Tela com referência que navega (tela B) aparece como “fora do alcance da análise”: a análise ainda não a aceita (NAT-51).</li></ol>
<h2>Revisar e recalcular</h2>
<ol><li>No par, clique em <strong>Abrir fila de revisão</strong>. Revise antes de abrir os achados por braço, para não quebrar a cegueira.</li>
<li>Em cada cartão escolha uma das cinco decisões, escreva a justificativa e clique em <strong>Salvar decisão</strong>. Cada gravação vira um arquivo novo; nada é sobrescrito.</li>
<li>Quando terminar (ou quando quiser ver números parciais), clique em <strong>Recalcular</strong>. Sai uma versão nova; a anterior fica no histórico.</li>
<li>Se o recálculo falhar, a versão anterior continua na tela e um aviso diz o motivo.</li></ol>
<h2>Publicação indisponível</h2>
<p>O pacote está no arquivo, mas o anexo de evidências não foi confirmado na Release. No GitHub: Actions → a execução do workflow <span class="mono">execucao-isolada</span> → <em>Re-run failed jobs</em>. Só o job <span class="mono">arquivar</span> roda; o modelo não é chamado. Depois, atualize o clone do arquivo (<span class="mono">git pull</span>) e recarregue esta página.</p>
<h2>O que o painel não faz</h2>
<p>Não chama modelo e não mostra o gabarito. Ele só lê o arquivo aberto e grava dentro dele as análises, as decisões e os pacotes restaurados. A única saída para a rede é o <span class="mono">gh release download</span> de um anexo de evidências que falte, com a sua sessão do <span class="mono">gh</span>; abra o painel com <span class="mono">--sem-download</span> para desligar.</p>` });
}

export function paginaErro(codigo: number, texto: string, fixture: boolean): string {
  return pagina({ titulo: codigo === 404 ? "Não encontrado" : "Erro", fixture, corpo: `<h1>${codigo === 404 ? "Não encontrado" : "Algo deu errado"}</h1><p>${esc(texto)}</p><p><a href="/">Voltar para Execuções e pares</a></p>` });
}
