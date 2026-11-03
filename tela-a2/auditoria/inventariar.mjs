/**
 * Monta inventario.json e estados.json a partir das medidas brutas (medidas/<estado>/*.json,
 * observacao-360.json, origem.json). Não abre o navegador: rode antes medir.mjs (e interagir.mjs,
 * observar-360.mjs, origem.mjs). Determinístico dado o conteúdo de medidas/ (sem carimbos novos).
 * Uso: node tela-a2/auditoria/inventariar.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { AQUI, SAIDA, MEDIDAS, ANCORAS, ESTADOS, SETUP } from "./comum.mjs";

const ler = (...p) => JSON.parse(readFileSync(join(MEDIDAS, ...p), "utf8"));
const origem = existsSync(join(MEDIDAS, "origem.json")) ? ler("origem.json") : null;
const provDe = sel => {
  if (!origem) return null;
  // proveniência por caminho exato quando o seletor é um id; senão, nula (o mapa de origem é por caminho)
  const k = sel.startsWith("#") && !sel.includes(" ") ? sel : null;
  const e = k && origem.naoMarcacao[k];
  return e ? { elemento: e.elemento, atributosNaoMarcacao: Object.fromEntries(Object.entries(e.atributos).filter(([, v]) => v !== "marcacao")) } : "marcacao (sem diferença por ablação)";
};

const inventario = { _meta: { tela: ANCORAS._meta.tela, titulo: ANCORAS._meta.titulo, entrada: ANCORAS.entrada, viewport: "1280x900", headless: true,
  fonte: "medidas/<estado>/instancias.json, pagina.json, tab.json, ax.json (medir.mjs)", listaNeutra: "../ancoras-neutras.json (45 instâncias)",
  nota: "visível = caixa ≥ 1×1 px, sem display:none/visibility:hidden/opacity:0/[hidden]/clip em nenhum ancestral e dentro do documento. Os itens e tags do skiplink ficam em y = −900 (fora do documento) até receberem foco: a lista neutra os marca 'visivel', esta medida os marca não visíveis em repouso (ver interacoes.json › skiplink-tab)." }, estados: {} };
const estados = { _meta: { entrada: ANCORAS.entrada, waitFor: ANCORAS.waitFor, setup: SETUP, protocolo: ANCORAS.protocolo }, estados: {} };

for (const est of ESTADOS) {
  const I = ler(est.id, "instancias.json"), P = ler(est.id, "pagina.json"), T = ler(est.id, "tab.json"), AX = ler(est.id, "ax.json");
  const inst = I.dados.map(i => ({ componente: i.componente, seletor: i.seletor, dentroDe: i.dentroDe, declaradoNaLista: i.declarado,
    presente: i.presente, visivel: i.presente ? i.visivel : false, n: i.n, tag: i.tag ?? null, caixa: i.caixa ?? null,
    ax: Array.isArray(i.ax) && i.ax[0] ? { papel: i.ax[0].papel, nome: i.ax[0].nome, ignorado: i.ax[0].ignorado } : null,
    proveniencia: i.presente ? provDe(i.seletor) : null,
    divergeDaLista: i.presente ? ((i.declarado === "visivel") !== i.visivel) : (i.declarado !== "ausente") }));
  const p = P.dados;
  inventario.estados[est.id] = {
    nota: est.note, path: p.path, titulo: p.titulo, lang: p.lang,
    contagem: { presentes: inst.filter(i => i.presente).length, visiveis: inst.filter(i => i.visivel).length, listaNeutra: ANCORAS.contagem[est.id] },
    divergencias: inst.filter(i => i.divergeDaLista).map(i => ({ seletor: i.seletor, lista: i.declaradoNaLista, medido: i.presente ? (i.visivel ? "visivel" : "presente-nao-visivel") : "ausente" })),
    instancias: inst,
    pagina: {
      meta: p.meta, titulos: p.titulos, regioesAx: AX.dados.filter(n => ["banner", "main", "navigation", "contentinfo", "region", "form", "menubar", "complementary", "search"].includes(n.papel)).map(n => ({ papel: n.papel, nome: n.nome })),
      accesskeys: p.accesskeys, idsRepetidos: p.idsRepetidos, imagens: p.imagens, links: p.links.map(l => ({ texto: l.texto, href: l.href, visivel: l.visivel })),
      campos: p.campos.map(c => ({ id: c.id, type: c.type, role: c.role, rotulos: c.rotulos.map(r => r.texto), required: c.required, ariaInvalid: c.ariaInvalid, describedby: c.describedby, visivel: c.visivel })),
      fieldsets: p.fieldsets, regioesVivas: p.regioesVivas, apresentacional: p.apresentacional, tabindexNaoInterativo: p.tabindexNaoInterativo, ariaHiddenFocavel: p.ariaHiddenFocavel,
      familias: p.familiasUsadas, tamanhosDeFonte: p.tamanhosUsados, cores: p.coresUsadas, noscript: p.noscript, rolagem: p.rolagem,
    },
    ordemTab: T.dados.map(t => ({ el: t.el, texto: t.texto || t.ariaLabel || "", indicadorFoco: t.indicadorFoco ?? null, pixels: t.diferencaVisual?.pixelsDiferentes ?? null })),
  };
  estados.estados[est.id] = { id: est.id, afterStep: est.afterStep, passos: SETUP.slice(0, est.afterStep), path: est.path, nota: est.note,
    medido: { path: p.path, focoNaChegada: p.focoNaChegada, ms_desde_carga: I._meta.ms_desde_carga, ms_desde_carga_tab: I._meta.ms_desde_carga_tab, navegacoes: I._meta.navegacoes, externos: I._meta.externos, escritas: I._meta.escritas, errosDePagina: I._meta.errosDePagina, paradasTab: T.dados.filter(t => t.el !== "body").length } };
}
if (existsSync(join(MEDIDAS, "observacao-360.json"))) {
  const o = ler("observacao-360.json");
  estados.observacaoLonga = { janela_s: o.janela_s, inicio: o.inicio, metaHttpEquiv: o.metaHttpEquiv, navegacoes: o.navegacoes, eventos: o.eventos, documentosNovos: o.recargas + 1, recargas: o.recargas, errosDePagina: o.errosDePagina };
}
if (existsSync(join(MEDIDAS, "observacao-recarga-estado.json"))) estados.recargaComEstadoPreenchido = ler("observacao-recarga-estado.json");
writeFileSync(join(SAIDA, "inventario.json"), JSON.stringify(inventario, null, 1) + "\n");
writeFileSync(join(SAIDA, "estados.json"), JSON.stringify(estados, null, 1) + "\n");
for (const [id, e] of Object.entries(inventario.estados)) console.log(`${id}: presentes ${e.contagem.presentes} visíveis ${e.contagem.visiveis} (lista ${e.contagem.listaNeutra.presentes}/${e.contagem.listaNeutra.visiveis}) · divergências ${e.divergencias.length} · Tab ${e.ordemTab.length}`);
