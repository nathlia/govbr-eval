/**
 * lint-protocol — impede que conhecimento de domínio volte para dentro dos protocolos.
 *
 * Requisito A6 (tcc2-requirements.md): o procedimento carrega procedimento apenas; regras, tokens
 * e specs moram no oráculo. Isso não é organização, é validade: um protocolo que diz qual é a
 * fonte primária do DS vira um segundo oráculo, e aí nenhum experimento consegue medir o que o
 * oráculo MCP contribui — a comparação vira "regra por MCP" contra "a mesma regra por texto".
 *
 * A primeira versão de skills/evaluate-all/SKILL.md violou isso desde o commit inicial e ninguém
 * percebeu por cinco semanas, porque nada verificava. Este script é o que verifica.
 *
 * É uma heurística, não uma prova: ela pega as formas conhecidas de vazamento. Um vazamento novo
 * e criativo passa. Se você encontrar um, acrescente o padrão aqui.
 *
 * Escapes: uma linha que contenha `<!-- lint-protocol: ok -->` é ignorada. Use com parcimônia e
 * sempre com a justificativa escrita logo depois do marcador, na mesma linha.
 *
 * Uso:  npm run lint:protocol
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");
const ESCAPE = "<!-- lint-protocol: ok -->";

interface Rule {
  id: string;
  /** O que este padrão detecta, em uma linha — vira a mensagem do erro. */
  why: string;
  test: RegExp;
}

const RULES: Rule[] = [
  {
    id: "fonte-do-ds",
    why: "nomeia a família tipográfica do DS — isso é norma, vem do oráculo",
    test: /\b(rawline|raleway)\b/i,
  },
  {
    id: "classe-do-ds",
    why: "cita uma classe do DS (br-*) — implica conhecer a anatomia dos componentes",
    test: /\bbr-(button|item|list|input|select|card|table|divider|wizard|breadcrumb|tag|avatar|menu|header|footer|modal|loading|message|step)\b/i,
  },
  {
    id: "cor-literal",
    why: "traz um valor de cor — token é conhecimento de domínio",
    test: /#[0-9a-f]{6}\b|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)/i,
  },
  {
    id: "indice-de-tokens",
    why: "referencia o índice reverso de tokens do oráculo",
    test: /\bhexlookup\b/i,
  },
  {
    id: "escala-numerica",
    why: "enumera uma escala de valores permitidos — isso é a norma escrita à mão",
    test: /\{\s*\d+(px|rem)?\s*(,\s*\d+(px|rem)?\s*){2,}/i,
  },
  {
    id: "multiplos-de",
    why: "declara uma escala de espaçamento",
    test: /m[úu]ltiplos de \d|multiples of \d/i,
  },
  {
    id: "tabela-de-veredito",
    why: "tabela que mapeia observação → veredito; é exatamente o catálogo de regras",
    test: /\|\s*(violation signal|sinal de viola[çc][ãa]o)\s*\|/i,
  },
  {
    id: "norma-citada",
    why: "cita uma norma específica como critério (o vocabulário de ids do contrato de saída usa `emag:`/`wcag:` minúsculos com dois-pontos e não casa aqui)",
    test: /\b(e-MAG|eMAG)\s+\d+\.\d+|\bWCAG\s+\d+\.\d+\.\d+/,
  },
  {
    id: "veredito-explicito",
    why: "declara o que é proibido/permitido — julgamento normativo pertence ao oráculo",
    test: /\b(é proibido|s[ãa]o proibidos?|é permitido|s[ãa]o permitidos?|is prohibited|is permitted|PROHIBITED|permitted)\b/,
  },
  {
    id: "ordem-dos-botoes",
    why: "descreve a regra de ordenação de botões do DS",
    test: /prim[áa]rio.{0,30}(antes|depois).{0,30}secund[áa]rio|primary.{0,30}(before|after).{0,30}secondary/i,
  },
];

function collectSkillFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectSkillFiles(full));
    else if (entry.toUpperCase() === "SKILL.MD") out.push(full);
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  rule: Rule;
  text: string;
}

const files = collectSkillFiles(SKILLS_DIR);
if (files.length === 0) {
  console.log("lint-protocol: nenhum SKILL.md encontrado em skills/ — nada a verificar.");
  process.exit(0);
}

const findings: Finding[] = [];
let inFence = false;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  inFence = false;

  lines.forEach((raw, i) => {
    if (/^\s*```/.test(raw)) { inFence = !inFence; return; }

    // Blocos de código são o contrato de saída e trechos de navegação — não são prosa normativa.
    if (inFence) return;
    if (raw.includes(ESCAPE)) return;

    for (const rule of RULES) {
      if (rule.test.test(raw)) {
        findings.push({ file: file.replace(ROOT + "\\", "").replace(ROOT + "/", ""), line: i + 1, rule, text: raw.trim() });
      }
    }
  });
}

console.log(`\nlint-protocol — ${files.length} protocolo(s) verificado(s)\n`);

if (findings.length === 0) {
  console.log("  ok — nenhum conhecimento de domínio detectado nos protocolos.");
  console.log("  (heurística: pega as formas conhecidas de vazamento, não é prova)\n");
  process.exit(0);
}

const byFile = new Map<string, Finding[]>();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file)!.push(f);
}

for (const [file, fs_] of byFile) {
  console.log(`  ${file}`);
  for (const f of fs_) {
    console.log(`    linha ${f.line}  [${f.rule.id}] ${f.rule.why}`);
    console.log(`      ${f.text.slice(0, 110)}${f.text.length > 110 ? "…" : ""}`);
  }
  console.log();
}

console.log(`${findings.length} vazamento(s). O procedimento carrega procedimento apenas (A6):`);
console.log("regras, tokens e specs moram no oráculo. Mova o conteúdo, ou marque a linha com");
console.log(`\`${ESCAPE}\` se for falso positivo — com justificativa na própria linha.\n`);
process.exit(1);
