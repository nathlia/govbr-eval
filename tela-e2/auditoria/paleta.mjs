// Paleta do DS (fundamentos-visuais/cores.md): pares `#hex` | `--token`.
import { readFileSync } from "fs";
import { CORPUS } from "./comum.mjs";
export function paleta() {
  const t = readFileSync(CORPUS + "/fundamentos-visuais/cores.md", "utf8");
  const m = {}; for (const x of t.matchAll(/`(#[0-9A-Fa-f]{6})`\s*\|\s*`(--[a-z0-9-]+)`/g)) m[x[1].toLowerCase()] = x[2];
  return m;
}
