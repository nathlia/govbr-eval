// Sonda exploratória: a aba escolhida e a linha marcada sobrevivem à ida e volta por navegação dentro da SPA?
import { chromium } from "playwright";
import { openPage, runSetupSteps } from "../../scripts/anchors.ts";
const porta = process.argv[2];
const URL = `http://127.0.0.1:${porta}/pnip-f3/portal-mpa/processos?mock-perfil=mpa`;
const ALA = "/pnip-f3/portal-mpa/processos";
const IDA = { action: "navigate", path: "/pnip-f3/portal-mpa/vistorias", waitFor: "pnip-propesc-vistorias" } as any;
const VOLTA = { action: "navigate", path: ALA, waitFor: "pnip-mpa-processos .br-table tbody tr" } as any;
const ABA = 'pnip-mpa-processos br-tab button[data-panel="HISTORICO"]';
const CB = "pnip-mpa-processos table tbody tr:nth-child(2) input[type=checkbox]";
const st = (p: any) => p.evaluate(() => ({ n: document.querySelectorAll("pnip-mpa-processos table tbody tr").length,
  info: (document.querySelector("govbr-custom-pagination") as HTMLElement)?.innerText.replace(/\s+/g, " "),
  checked: [...document.querySelectorAll("pnip-mpa-processos table tbody input[type=checkbox]")].map((i: any) => i.checked).join(""),
  btn: [...document.querySelectorAll("pnip-mpa-processos br-button[icon=check]")].map(x => x.getAttribute("label")),
  ss: Object.keys(sessionStorage).filter(k => !/vinculo|vistoriador|portal-sel|uuid|perfil/.test(k)).map(k => k + "=" + sessionStorage.getItem(k)),
  ativa: [...document.querySelector("pnip-mpa-processos br-tab")!.shadowRoot!.querySelectorAll("li.tab-item")].map(l => (l.className.includes("active") ? "*" : "") + l.textContent!.trim()).join(","),
}));
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" })).newPage();
await openPage(p, URL, { waitFor: "main .br-table tbody tr" });
console.log("count aba", await p.locator(ABA).count());
const seq: [string, any[]][] = [
  ["marca", [{ action: "click", selector: CB }, { action: "wait", ms: 800 }]],
  ["volta", [IDA, VOLTA, { action: "wait", ms: 1000 }]],
  ["concluidos", [{ action: "click", selector: ABA }, { action: "wait", ms: 1500 }]],
  ["volta", [IDA, VOLTA, { action: "wait", ms: 1000 }]],
];
for (const [n, s] of seq) { await runSetupSteps(p, s); console.log(n, JSON.stringify(await st(p))); }
await b.close();
