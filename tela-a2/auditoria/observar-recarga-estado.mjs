/**
 * Medida complementar à observação de 360 s (não substitui a observação sem interação): o que a
 * recarga automática faz com o trabalho da pessoa. Carga limpa → S1 (setup declarado) → liga o
 * switch "Receber avisos por e-mail" e escolhe uma opção do select pela lista (cliques reais) →
 * espera, sem interagir, até 330 s depois da carga, registrando navegações com carimbo → mede de novo
 * a aba ativa, o valor do select e o estado do switch.
 * Uso: node tela-a2/auditoria/observar-recarga-estado.mjs → medidas/observacao-recarga-estado.json
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { abrirNavegador, novaPagina, carregar, executarPassos, SETUP, MEDIDAS } from "./comum.mjs";

const ESTADO = () => ({
  abaAtiva: document.querySelector("[role=tab][aria-selected=true]")?.id ?? null,
  painelAtivo: document.querySelector(".tab-panel.active")?.id ?? null,
  select: document.querySelector("#tipo-documento")?.value ?? null,
  switchEmail: document.querySelector("#aviso-email")?.checked ?? null,
  timeOrigin: performance.timeOrigin,
});
const navegador = await abrirNavegador();
const np = await novaPagina(navegador);
const t0 = Date.now();
await carregar(np.pagina);
await executarPassos(np.pagina, SETUP.slice(0, 2));
await np.pagina.click("label[for=aviso-email]");
await np.pagina.click("#sel-tipo-documento button[aria-label='Exibir lista']");
await np.pagina.waitForTimeout(300);
await np.pagina.click("label[for=tipo-documento-op0]");
await np.pagina.waitForTimeout(300);
const antes = { t_ms: Date.now() - t0, ...(await np.pagina.evaluate(ESTADO)) };
await np.pagina.waitForTimeout(Math.max(0, 330000 - (Date.now() - t0)));
const depois = { t_ms: Date.now() - t0, ...(await np.pagina.evaluate(ESTADO)) };
const saida = { medida: "recarga automática × estado preenchido", janela_ms: 330000, antes, depois,
  navegacoes: np.navegacoes.map(n => ({ t_ms: n.t - t0, url: n.url })), errosDePagina: np.erros };
mkdirSync(MEDIDAS, { recursive: true });
writeFileSync(join(MEDIDAS, "observacao-recarga-estado.json"), JSON.stringify(saida, null, 1) + "\n");
console.log(JSON.stringify(saida));
await navegador.close();
