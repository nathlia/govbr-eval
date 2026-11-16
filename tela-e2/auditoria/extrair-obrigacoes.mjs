// Extrai do corpus normativo (normalizacao/rules.jsonl) as cláusulas que obrigam/proíbem dos componentes da página + globais.
import { readFileSync, writeFileSync } from "fs";
const CORPUS = "F:/Dev Nath/TCC/ds-rules/govbr-ds-3.7.0-corpus";
const comps = new Set(["button","input","select","radio","switch","list","item","message","header","signin","avatar","footer","skiplink","breadcrumb","divider"]);
const linhas = readFileSync(CORPUS + "/normalizacao/rules.jsonl", "utf8").trim().split("\n").map(JSON.parse);
const sel = linhas.filter(r => ["required","prohibited"].includes(r.force) && (r.component === null || comps.has(r.component)));
const out = sel.map(r => ({ id: r.id.replace("govbr-3.7.0-",""), c: r.component, f: r.force, cat: r.category, loc: r.source.locator, sec: r.source.sectionPath, t: r.originalText }));
writeFileSync("obrigacoes-candidatas.json", JSON.stringify(out, null, 1));
const por = {}; for (const r of out) { const k = (r.c ?? "global") + " | " + r.loc.split("/").slice(0,2).join("/"); por[k] = (por[k]||0)+1; }
console.log(out.length); console.log(Object.entries(por).sort().map(x=>x.join(": ")).join("\n"));
