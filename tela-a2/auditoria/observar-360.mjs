/**
 * Observação longa (ancoras-neutras.json › protocolo.observacaoLonga): contexto próprio, carga limpa,
 * nenhuma interação, 360 s. Registra com carimbo (ms desde a carga) toda navegação do quadro principal,
 * todo evento load/DOMContentLoaded, mudanças de foco e de texto visível (amostra a cada 10 s), e os
 * avisos de atualização automática que a página mostre (texto visível com "atualiza").
 * Uso: node tela-a2/auditoria/observar-360.mjs  → medidas/observacao-360.json
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { abrirNavegador, novaPagina, carregar, MEDIDAS, ANCORAS } from "./comum.mjs";

const JANELA = (ANCORAS.protocolo.observacaoLonga.janela_s) * 1000;
const navegador = await abrirNavegador();
const np = await novaPagina(navegador);
const eventos = [];
await np.pagina.exposeBinding("__evento", (_s, tipo, extra) => eventos.push({ t: Date.now(), tipo, extra }));
await np.pagina.addInitScript(() => {
  const marca = performance.timeOrigin;
  window.__evento("documento-novo", { timeOrigin: marca });
  document.addEventListener("DOMContentLoaded", () => window.__evento("DOMContentLoaded", null));
  window.addEventListener("load", () => window.__evento("load", null));
  window.addEventListener("beforeunload", () => window.__evento("beforeunload", null));
});
const tCarga = Date.now();
await carregar(np.pagina);
const amostras = [];
const meta = await np.pagina.evaluate(() => [...document.querySelectorAll("meta[http-equiv]")].map(m => ({ httpEquiv: m.getAttribute("http-equiv"), content: m.getAttribute("content") })));
while (Date.now() - tCarga < JANELA) {
  await np.pagina.waitForTimeout(10000);
  try {
    amostras.push({ t: Date.now() - tCarga, ...(await np.pagina.evaluate(() => ({
      url: location.href, timeOrigin: performance.timeOrigin, foco: document.activeElement?.tagName + (document.activeElement?.id ? "#" + document.activeElement.id : ""),
      avisoAtualizacao: [...document.body.querySelectorAll("*")].filter(e => e.children.length === 0 && /atualiz/i.test(e.textContent)).map(e => e.textContent.trim()).slice(0, 5),
      textoLen: document.body.innerText.length,
    }))) });
  } catch (e) { amostras.push({ t: Date.now() - tCarga, erro: String(e.message) }); }
}
const saida = {
  medida: "observação longa sem interação", janela_s: JANELA / 1000, viewport: "1280x900", headless: true,
  inicio: new Date(tCarga).toISOString(), metaHttpEquiv: meta,
  navegacoes: np.navegacoes.map(n => ({ t_ms: n.t - tCarga, url: n.url })),
  eventos: eventos.map(e => ({ t_ms: e.t - tCarga, tipo: e.tipo, extra: e.extra })),
  amostras, errosDePagina: np.erros,
  pedidos: np.pedidos.length,
  recargas: eventos.filter(e => e.tipo === "documento-novo").length - 1,
};
mkdirSync(MEDIDAS, { recursive: true });
writeFileSync(join(MEDIDAS, "observacao-360.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(`navegações ${saida.navegacoes.length} · documentos novos ${saida.recargas + 1} · eventos ${saida.eventos.map(e => e.tipo + "@" + Math.round(e.t_ms / 1000) + "s").join(", ")}`);
await navegador.close();
