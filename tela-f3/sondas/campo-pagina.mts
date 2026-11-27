// Sonda: na página 2 (aba Concluídos, "Página seguinte"), o que o campo do seletor "Página" mostra? Nos dois builds.
import { chromium } from "playwright";
import { openPage, runSetupSteps } from "../../scripts/anchors.ts";
import { SETUP } from "../estados.mjs";
const b = await chromium.launch();
for (const base of process.argv.slice(2)) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" })).newPage();
  await openPage(p, `${base}/pnip-f3/portal-mpa/processos?mock-perfil=mpa`, { waitFor: "main .br-table tbody tr" });
  await runSetupSteps(p, SETUP.slice(12, 16) as any);
  console.log(base, await p.evaluate(() => ({ info: (document.querySelector("govbr-custom-pagination") as HTMLElement).innerText.replace(/\s+/g, " "), pagina: (document.querySelector('govbr-custom-pagination br-select-pnip[label="Página"] input#page') as HTMLInputElement).value, selecionado: [...document.querySelectorAll('govbr-custom-pagination br-select-pnip[label="Página"] .br-item')].map(i => i.textContent!.trim() + (i.classList.contains("selected") ? "*" : "")).join(",") })));
}
await b.close();
