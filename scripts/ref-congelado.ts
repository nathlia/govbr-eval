/**
 * Emenda (a), D1 do ensaio sem modelo de 14/11/2026: o ref de um slot é conferido contra a linha de base congelada da
 * campanha NO DISPARO, antes de qualquer gasto (job `preparar`, fase `entradas`), e não só depois da coleta.
 *
 * Regra (a mesma que `conferirCongelamentoNoGit` aplica no `coleta:trio`/`analisar`, agora antes do agente): se o ref tem
 * `campanhas/<id>/linha-de-base.json`, o registro é lido DO PRÓPRIO REF e
 *   - `git diff --name-only <repos.govbr-eval do registro> <ref>` só pode conter o próprio registro (nenhum commit a mais
 *     que mude outro arquivo do govbr-eval entre o disparo da linha de base e o slot);
 *   - o disparo só pode ser `etapas = so-coleta` (a linha de base já está congelada; o slot não mede outra).
 * O commit da linha de base tem de estar no histórico do checkout (o `preparar` busca o histórico inteiro do govbr-eval).
 *
 * Dois chamadores: `pipeline-t4.ts entradas` (ref = HEAD do checkout do disparo) e `agenda-campanha.ts comando`
 * (ref = o `--ref` dado, branch ou tag, o que o `gh workflow run --ref` aceita). Este módulo não importa a agenda nem a
 * análise (sem ciclo de import) e só lê o git: nenhum arquivo daqui entra em imagem, lock ou identidade da campanha.
 */
import { execFileSync } from "node:child_process";
import { validateContract, type LinhaDeBaseCampanha } from "../contracts/index";

export const caminhoDoRegistro = (campanha: string): string => `campanhas/${campanha}/linha-de-base.json`;
export const ETAPAS_COM_CONGELADA = "so-coleta";
const COMMIT = /^[0-9a-f]{40}$/;

/** Leitura do git do govbr-eval (os testes podem trocar). Nunca rede. */
export interface GitDoRef {
  /** sha do commit do ref, ou null se o ref não resolve. */
  resolver(ref: string): string | null;
  /** O commit existe neste repositório (no histórico buscado)? */
  existe(commit: string): boolean;
  /** Bytes do arquivo no ref, ou null se o ref não o tem. */
  blob(ref: string, caminho: string): Buffer | null;
  /** git diff --name-only a b */
  diferenca(a: string, b: string): string[];
}

export function gitDoRef(repo: string): GitDoRef {
  const git = (args: string[]): Buffer => execFileSync("git", ["-C", repo, ...args], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  return {
    resolver(ref) { try { return git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).toString("utf8").trim() || null; } catch { return null; } },
    existe(commit) { try { git(["cat-file", "-e", `${commit}^{commit}`]); return true; } catch { return false; } },
    blob(ref, caminho) { try { return git(["show", `${ref}:${caminho}`]); } catch { return null; } },
    diferenca(a, b) { return git(["diff", "--name-only", a, b]).toString("utf8").split("\n").map(s => s.trim()).filter(Boolean); },
  };
}

export interface RefConferido {
  /** O ref tem o registro da linha de base congelada? */
  congelada: boolean;
  /** sha do ref (null se não resolveu). */
  commit: string | null;
  /** repos.govbr-eval do registro (o commit do disparo so-linha-de-base). */
  commitDaLinhaDeBase: string | null;
  /** Arquivos que diferem entre o commit da linha de base e o ref (só com congelada). */
  diferencas: string[];
  problemas: string[];
}

/**
 * Confere um ref contra a linha de base congelada da campanha. `etapas` ausente = não confere as etapas (o `comando` da
 * agenda imprime sempre so-coleta). Sem registro no ref: `congelada: false` e nenhum problema (o caminho de sempre).
 */
export function conferirRefCongelado(o: { campanha: string; ref: string; etapas?: string; git: GitDoRef }): RefConferido {
  const caminho = caminhoDoRegistro(o.campanha);
  const commit = o.git.resolver(o.ref);
  const r: RefConferido = { congelada: false, commit, commitDaLinhaDeBase: null, diferencas: [], problemas: [] };
  if (!commit) { r.problemas.push(`o ref ${o.ref} não resolve para um commit do govbr-eval`); return r; }
  const bytes = o.git.blob(commit, caminho);
  if (!bytes) return r;
  r.congelada = true;
  let doc: unknown;
  try { doc = JSON.parse(bytes.toString("utf8")); } catch { r.problemas.push(`${caminho} no commit ${commit.slice(0, 12)} não é JSON`); return r; }
  const v = validateContract(doc);
  if (v.contract !== "linha-de-base-campanha.v1" || !v.valid) {
    r.problemas.push(`${caminho} no commit ${commit.slice(0, 12)} fora do contrato linha-de-base-campanha.v1: ${v.errors.map(e => `${e.path || "/"} ${e.message}`).join("; ")}`);
    return r;
  }
  const d = doc as LinhaDeBaseCampanha;
  if (d.campaignId !== o.campanha) r.problemas.push(`${caminho} no commit ${commit.slice(0, 12)} é da campanha ${d.campaignId}, não de ${o.campanha}`);
  if (o.etapas !== undefined && o.etapas !== ETAPAS_COM_CONGELADA) {
    r.problemas.push(`a campanha ${o.campanha} tem a linha de base congelada (${caminho}): o slot dispara só com etapas = ${ETAPAS_COM_CONGELADA}, não ${o.etapas || "(vazio)"}; a linha de base não se mede de novo`);
  }
  const lb = d.repos["govbr-eval"];
  r.commitDaLinhaDeBase = lb;
  if (!COMMIT.test(lb)) { r.problemas.push(`${caminho}: repos.govbr-eval não é um commit (40 hex): ${lb}`); return r; }
  if (!o.git.existe(lb)) {
    r.problemas.push(`o commit da linha de base ${lb.slice(0, 12)} (repos.govbr-eval de ${caminho}) não está no histórico deste checkout do govbr-eval: sem ele não há como conferir o ref (o checkout do preparar busca o histórico inteiro)`);
    return r;
  }
  r.diferencas = o.git.diferenca(lb, commit);
  const fora = r.diferencas.filter(f => f !== caminho);
  if (fora.length) {
    r.problemas.push(`o ref ${o.ref} (commit ${commit.slice(0, 12)}) difere do commit da linha de base congelada (${lb.slice(0, 12)}) fora de ${caminho}: ` +
      `${fora.slice(0, 10).join(", ")}${fora.length > 10 ? ` (+${fora.length - 10})` : ""}. Um slot desse ref seria recusado pelo coleta:trio depois de pago; ` +
      "dispare do ref que só acrescenta o registro ao commit da linha de base (emenda (a); nenhum commit no govbr-eval até o último trio)");
  }
  return r;
}
