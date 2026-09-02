/** Executa os dois workbenches com os mesmos argumentos, sem misturar suas unidades. */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

for (const script of ["adjudicate.ts", "adjudicate-flow.ts"]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", join(here, script), ...args], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
