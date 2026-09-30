// Percurso de integração da tela vistorias pela superfície de medida (proxy de saída ligado),
// 1280×900, sem modelo, sem oráculo, sem axe. Gerou as capturas desta pasta em 2026-09-30.
// Uso (de govbr-eval/, com a superfície servindo a entrada da tela e o `vite preview` do corpus):
//   node tela-b/vistorias-integracao/percurso.mjs <dir-da-superfície> tela-b/vistorias-integracao http://localhost:4175 [--headed]
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [surfDir, outDir, previewOrigin] = process.argv.slice(2).filter((a) => a !== "--headed");
// Sem janela por padrão; `--headed` mostra o navegador.
const headless = !process.argv.includes("--headed");
mkdirSync(outDir, { recursive: true });
const surface = JSON.parse(readFileSync(join(surfDir, "surface.json"), "utf8"));
const SITE = surface.origins.site;

const browser = await chromium.launch({ headless, proxy: { server: surface.proxyServer, bypass: "<-loopback>" }, args: ["--proxy-bypass-list=<-loopback>"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
const page = await ctx.newPage();
const externos = [], erros = [], consoleErros = [], naoOk = [];
page.on("request", (r) => { const u = r.url(); if (!u.startsWith(SITE) && !/^(data|blob|about):/.test(u)) externos.push(u); });
page.on("response", (r) => { if (r.status() >= 400) naoOk.push(`${r.status()} ${r.url()}`); });
page.on("pageerror", (e) => erros.push(e.message));
page.on("console", (m) => { if (m.type() === "error") consoleErros.push(m.text()); });
const assentar = (ms = 700) => page.waitForTimeout(ms);
const shot = async (nome, full = false) => page.screenshot({ path: join(outDir, `${nome}.png`), fullPage: full });
const passos = [];
const passo = async (nome, fn) => { try { const d = await fn(); passos.push(`ok   ${nome}${d ? " — " + d : ""}`); } catch (e) { passos.push(`FAIL ${nome} — ${e.message.split("\n")[0]}`); } };

await passo("entrada", async () => {
  await page.goto(surface.entryUrl, { waitUntil: "load" });
  await page.locator("main tbody tr").first().waitFor({ timeout: 15000 });
  await assentar(1000);
  await shot("01-entrada-tramitando");
  const coordenador = await page.evaluate(() => ({
    perfil: sessionStorage.getItem("perfil-unidade"),
    caixas: document.querySelectorAll("main tbody tr br-checkbox, main tbody tr input[type=checkbox]").length,
    acoes: ["bell", "trash", "user-plus", "user-times"].map((i) => `${i}=${document.querySelectorAll(`main tbody br-button[icon="${i}"]`).length}`).join(" "),
  }));
  return `${page.url().replace(SITE, "")} · ${await page.locator("main tbody tr").count()} linhas · perfil-unidade=${coordenador.perfil} · caixas=${coordenador.caixas} · ${coordenador.acoes} · ícone Sair: ${await page.evaluate(() => { const i = [...document.querySelectorAll("img")].find((x) => x.src.includes("exit-icon")); return i ? `${i.naturalWidth}px` : "ausente no DOM"; })}`;
});
await passo("aba Agendar", async () => {
  await page.locator('.tab-nav button:has-text("Agendar")').click(); await assentar();
  await shot("02-aba-agendar");
  return `${await page.locator("main tbody tr").count()} linhas`;
});
await passo("aba Concluídos", async () => {
  await page.locator('.tab-nav button:has-text("Concluídos")').click(); await assentar();
  await shot("03-aba-concluidos");
  return `${await page.locator("main tbody tr").count()} linhas`;
});
await passo("aba Tramitando + paginação (seguinte e página 4)", async () => {
  await page.locator('.tab-nav button:has-text("Tramitando")').click(); await assentar();
  const info = async () => (await page.locator(".pagination-information").first().innerText()).replace(/\s+/g, " ");
  const antes = await info();
  await page.locator('button[aria-label="Página seguinte"]').click(); await assentar();
  const p2 = await info();
  await page.locator('.br-pagination li button:has-text("4"), .br-pagination a:has-text("4")').first().click(); await assentar();
  await shot("04-paginacao-pagina-4", true);
  return `${antes} → ${p2} → ${await info()}`;
});
await passo("recarregar a lista pela superfície (fallback da SPA, sem consulta) e abrir detalhe de preenchida", async () => {
  await page.goto(`${SITE}/pnip/portal-mpa/vistorias`, { waitUntil: "load" }); await assentar(900);
  await page.locator('pnip-filter-panel span.br-tag:has-text("Status")').click(); await assentar(200);
  await page.locator('pnip-filter-panel .br-radio label:has-text("Vistoria preenchida")').first().click(); await assentar();
  await page.locator("main tbody tr").first().locator('br-button[icon="eye"]').click();
  await page.waitForURL(/agendar-vistoria/); await assentar(1200);
  await shot("05-detalhe-vistoria");
  return page.url().replace(SITE, "");
});
await passo("modal trocar embarcação", async () => {
  await page.locator('br-button[label="Trocar embarcação da vistoria"]').click();
  await page.locator(".br-modal").waitFor(); await assentar();
  await shot("06-modal-trocar-embarcacao");
  await page.locator("#busca-embarcacao").fill("Gaivota"); await page.waitForTimeout(900);
  const n = await page.locator(".item-embarcacao").count();
  await shot("07-modal-busca");
  await page.locator('.br-modal br-button[label="Cancelar"]').click(); await assentar(300);
  return `${n} opções para "Gaivota"`;
});
await passo("recarregar a própria sub-rota do detalhe", async () => {
  await page.reload({ waitUntil: "load" }); await assentar(1500);
  await shot("08-detalhe-recarregado");
  return `${page.url().replace(SITE, "")} · botão trocar: ${await page.locator('br-button[label="Trocar embarcação da vistoria"]').count()}`;
});

const mock = await page.evaluate(() => ({ naoMockados: window.__pnipMock?.naoMockados?.().length ?? null }));
await ctx.close();
await browser.close();

// As telas React do corpus continuam servidas (preview do dist/, fora da superfície).
const b2 = await chromium.launch({ headless });
const p2 = await (await b2.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const react = [];
for (const [rota, nome] of [["/fluxo.html", "09-corpus-fluxo"], ["/solicitacao.html", "10-corpus-solicitacao"], ["/", "11-corpus-raiz"]]) {
  const erros2 = []; p2.removeAllListeners("pageerror"); p2.on("pageerror", (e) => erros2.push(e.message));
  const r = await p2.goto(previewOrigin + rota, { waitUntil: "networkidle" });
  await p2.screenshot({ path: join(outDir, `${nome}.png`) });
  react.push(`${rota}: ${r.status()} · "${await p2.title()}" · ${erros2.length} erros`);
}
await b2.close();

const egress = readFileSync(join(surfDir, "egress.ndjson"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
console.log(passos.join("\n"));
console.log(JSON.stringify({
  externosNoNavegador: externos, errosNaoCapturados: erros, consoleErros, respostasNaoOk: naoOk, ...mock,
  egress: { total: egress.length, negados: egress.filter((e) => !e.allowed).map((e) => e.target) },
  react,
}, null, 2));
