import { chromium } from "playwright";
import { openPage, runSetupSteps } from "../../scripts/anchors.ts";
const porta = process.argv[2];
const URL = `http://127.0.0.1:${porta}/pnip-f3/portal-mpa/processos?mock-perfil=mpa`;
const ALA = "/pnip-f3/portal-mpa/processos";
const IDA = { action: "navigate", path: "/pnip-f3/portal-mpa/vistorias", waitFor: "pnip-propesc-vistorias" } as any;
const VOLTA = { action: "navigate", path: ALA, waitFor: "pnip-mpa-processos .br-table tbody tr" } as any;
const MEUS = "pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction";
const TAG_ABERTO_HA = "pnip-multiple-search-table-utils div.row.align-items-center > div.col-auto.px-1:first-child > span.br-tag";
const ITEM = "pnip-multiple-search-table-utils div.br-select > div.br-list > div.br-item";
const ESC = "pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction";
const SEG = 'govbr-custom-pagination nav.br-pagination button[aria-label="Página seguinte"]';
const EXI = "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total";
const IT25 = "govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip .br-list .br-item:nth-child(2) .br-radio";
const st = (p: any) => p.evaluate(() => ({ n: document.querySelectorAll("pnip-mpa-processos table tbody tr").length,
  info: (document.querySelector("govbr-custom-pagination") as HTMLElement)?.innerText.replace(/\s+/g, " "),
  exibir: (document.querySelector("govbr-custom-pagination br-select-pnip input#total") as HTMLInputElement)?.value,
  meus: document.querySelector("pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction")?.getAttribute("style"),
  cbs: document.querySelectorAll("pnip-mpa-processos table input[type=checkbox]").length,
  tags: [...document.querySelectorAll("pnip-mpa-processos .br-tag.interaction")].map(t => t.textContent!.trim()),
  ss: Object.keys(sessionStorage).map(k => k + "=" + sessionStorage.getItem(k)!.slice(0, 80)),
  ativa: [...document.querySelector("pnip-mpa-processos br-tab")!.shadowRoot!.querySelectorAll("li.tab-item")].map(l => (l.className.includes("active") ? "*" : "") + l.textContent!.trim()).join(","),
}));
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
const p = await c.newPage();
await openPage(p, URL, { waitFor: "main .br-table tbody tr" });
console.log("ini", JSON.stringify(await st(p)));
const seq: [string, any[]][] = [
  ["meus-off+p2", [{ action: "click", selector: MEUS }, { action: "wait", selector: "main .br-table tbody tr:nth-child(10)" }, { action: "click", selector: SEG }, { action: "wait", ms: 1000 }]],
  ["volta", [IDA, VOLTA, { action: "wait", ms: 1000 }]],
  ["exibir25", [{ action: "click", selector: EXI }, { action: "wait", selector: IT25 }, { action: "click", selector: IT25 }, { action: "wait", ms: 1000 }]],
  ["volta", [IDA, VOLTA, { action: "wait", ms: 1000 }]],
  ["filtro+x", [{ action: "click", selector: TAG_ABERTO_HA }, { action: "wait", selector: ITEM }, { action: "click", selector: `${ITEM}:nth-child(3) .br-radio` }, { action: "wait", selector: ESC }, { action: "wait", ms: 1000 }, { action: "click", selector: `${ESC} > button` }, { action: "wait", ms: 1000 }]],
  ["volta", [IDA, VOLTA, { action: "wait", ms: 1000 }]],
];
for (const [n, s] of seq) { await runSetupSteps(p, s); console.log(n, JSON.stringify(await st(p))); }
await b.close();
