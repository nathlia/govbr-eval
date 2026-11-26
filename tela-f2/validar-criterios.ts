// Tela F2 — passa o arquivo de critérios pelo leitor da passada 1.4.8 (criteriosParaOJuiz): um critério por spec, senão para.
import { criteriosParaOJuiz } from "../scripts/reanalise-nat74/e14-campanha";
import { readFileSync } from "fs";
const d = JSON.parse(readFileSync("tela-f2/criterios-de-julgamento.json", "utf8"));
const r = JSON.parse(readFileSync("ground-truth-processos-f2.json", "utf8"));
const c = criteriosParaOJuiz(d, r.violations.map((v: { id: string }) => v.id));
console.log("comuns", c.comuns.length, "porDefeito", Object.keys(c.porDefeito).length, "de", r.violations.length);
// e a regra de desfecho da bancada aceita a referência (estratos, classe ds das semeadas, expostas)
import { regraDaTela } from "../scripts/reanalise-nat74/recalculo-campanha";
const regra = regraDaTela("processos-f2", r);
console.log("regraDaTela:", regra.conjuntos.map((x: { id: string; specs: string[] }) => `${x.id}=${x.specs.length}`).join(" "));
