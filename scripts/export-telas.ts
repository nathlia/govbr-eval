/**
 * Exportador das telas (T1 do plano do benchmark isolado) — lado confiável da preparação.
 *
 * Monta um projeto mínimo e clonável com as duas telas de avaliação, por LISTA EXPLÍCITA de arquivos:
 *
 *   tela `solicitacao`  build de produção do corpus (Vite) num diretório temporário; entra só o
 *                       fechamento de arquivos citados a partir de `solicitacao.html` — o mesmo
 *                       `assetClosure` da superfície de medida —, e o fechamento tem de caber no
 *                       padrão da tela (a página e `assets/`), senão a exportação para.
 *   tela `vistorias`    os bytes congelados de `govbr-corpus/public/pnip/`, arquivo a arquivo pela
 *                       lista do manifesto do congelamento (`manifesto.json`), conferidos por sha256.
 *                       Árvore com arquivo a mais ou a menos que o manifesto: para. O manifesto do
 *                       congelamento fica de fora (telas.json `isolamento.site.excluir`).
 *   raiz                `server.mjs`, `README.md` (modelos em scripts/export-telas/), `package.json`,
 *                       `.node-version`, `.gitattributes` e `site-manifest.json` (gerados aqui).
 *
 * Nada de `.git`, fontes do corpus, pastas de pesquisa, referência, resultados ou texto da tese. Source
 * maps não são gerados (o build do corpus não os emite) e a auditoria (`auditPackage`) falha se um
 * `*.map` ou uma diretiva `sourceMappingURL` chegar ao pacote.
 *
 * Uso:
 *   npm run export:telas -- --out <dir> [--corpus ../govbr-corpus] [--allow-dirty]
 *
 * `<dir>` tem de ser novo, vazio, ou conter só `.git` e uma exportação anterior (cujos arquivos são
 * substituídos). Com o corpus sujo a exportação para, salvo `--allow-dirty` (gravado no manifesto).
 * Método: docs/exportacao-telas.md.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { homedir, tmpdir, userInfo } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./adjudication";
import { gitState } from "./collection-manifest";
import { assetClosure } from "./measurement-surface";
import { telaOf, type TelaSite } from "./telas";

export const EXPORTER_VERSION = "export-telas-1.0.0";
/** Nome provisório do projeto exportado (pendente NAT-45). */
export const PACKAGE_NAME = "govbr-telas";
export const PACKAGE_VERSION = "1.0.0";
/**
 * Node do projeto exportado. É o Node que construiu a tela `solicitacao` no lado da preparação (o pino
 * do workspace) e está dentro do intervalo do Vite do corpus (`^20.19.0 || >=22.12.0`); o servidor
 * usa só módulos nativos. Ver docs/exportacao-telas.md § Node.
 */
export const PACKAGE_NODE_VERSION = "25.2.1";
export const DEFAULT_CORPUS = resolve(ROOT, "..", "govbr-corpus");
const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), "export-telas");

export const SCREEN_A = "solicitacao";
export const SCREEN_B = "vistorias";

/** Arquivos da raiz do pacote — a lista completa. Qualquer outro arquivo na raiz é recusado. */
export const ROOT_FILES = [".gitattributes", ".node-version", "README.md", "package.json", "server.mjs", "site-manifest.json"] as const;
/** Os dois arquivos ocultos permitidos, ambos da raiz. */
export const HIDDEN_ALLOWED = new Set([".gitattributes", ".node-version"]);
/**
 * Sem conversão de fim de linha em nenhum arquivo: com `core.autocrlf=true` (padrão do Git no
 * Windows) um clone reescreveria LF → CRLF, o sha256 deixaria de bater e o servidor não subiria.
 */
export const GITATTRIBUTES = "* -text\n";
export const SITE_DIR = "site";

/** Extensões que podem existir em `site/`. */
export const SITE_EXTENSIONS = new Set([
  ".html", ".js", ".css", ".json", ".txt", ".svg", ".png", ".ico", ".jpg", ".jpeg", ".gif", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".docx", ".pdf",
]);
/** Extensões lidas como texto pela auditoria (varreduras de caminho, source map e vocabulário). */
export const TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".svg", ".md", ""]);

/** Padrão de arquivo da tela `solicitacao` dentro de `site/`: a página e os assets do build. */
const SCREEN_A_FILE = /^(solicitacao\.html|assets\/[A-Za-z0-9_.-]+\.(js|css|woff2?|ttf|eot|svg|png))$/;
/** Nomes do build que pertencem a OUTRAS entradas do corpus e nunca podem entrar. */
const FOREIGN_BUILD = /(^|\/)(index\.html|fluxo\.html|main-[^/]+\.js|fluxo-[^/]+\.(js|css)|real\/|static\/|pnip\/)/;

/** Diretiva de source map de verdade: no início de linha, como os bundlers a escrevem. */
export const SOURCE_MAP_DIRECTIVE = /^[ \t]*(\/\/|\/\*)[#@][ \t]*sourceMappingURL[ \t]*=/m;

export const sha256 = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");

export interface ManifestFile { path: string; sha256: string; bytes: number }

export interface SiteManifestDoc {
  contract: "site-manifest.v1";
  /**
   * Subconjunto documentado de snapshot-manifest.v1: `item` tem a forma exata de um item `kind: "site"`
   * daquele contrato. Referência, plano de estados e instrumento — os outros itens obrigatórios —
   * não pertencem ao site e nunca entram neste pacote.
   */
  subsetOf: "snapshot-manifest.v1";
  fixture: false;
  createdAt: string;
  exporter: { version: string };
  package: { name: string; version: string; node: string };
  item: {
    id: string; kind: "site"; description: string; sha256: string; bytes: number;
    location: { kind: "package-path"; path: string; note?: string };
    immutable: true; exposedToAgent: false; version: string;
  };
  screens: { id: string; title: string; entry: string }[];
  routing: { spa: { prefix: string; index: string }; aliases: Record<string, string> };
  origin: {
    corpus: { commit: string | null; dirty: boolean | null; dirtyAllowed: boolean };
    [SCREEN_A]: { build: { command: string; tool: string; node: string }; selection: string };
    [SCREEN_B]: {
      freezeManifestSha256: string; selection: string;
      upstream: { app: string; commit: string; fork: string; forkCommit: string; buildCommand: string; node: string; framework: string };
    };
  };
  /** Arquivos servidos, relativos a `site/` — ordenados. */
  files: ManifestFile[];
  /** Arquivos da raiz do pacote (exceto este manifesto). */
  runtime: ManifestFile[];
  total: { files: number; bytes: number };
}

/** Hash do conjunto: sha256 da listagem `sha256  caminho\n` ordenada (formato do sha256sum). */
export function listingSha256(files: ManifestFile[]): string {
  return sha256(files.map((f) => `${f.sha256}  ${f.path}\n`).join(""));
}

function listFiles(root: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else out.push(rel);
  }
  return out.sort();
}

/** Todos os arquivos e diretórios sob `root`, incluindo ocultos (para a auditoria). */
export function listTree(root: string, prefix = ""): { files: string[]; dirs: string[] } {
  const files: string[] = [];
  const dirs: string[] = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      dirs.push(rel);
      const sub = listTree(root, rel);
      files.push(...sub.files);
      dirs.push(...sub.dirs);
    } else files.push(rel);
  }
  return { files: files.sort(), dirs: dirs.sort() };
}

function viteVersion(corpus: string): string {
  return (JSON.parse(readFileSync(join(corpus, "node_modules", "vite", "package.json"), "utf8")) as { version: string }).version;
}

export const BUILD_COMMAND = "node node_modules/vite/bin/vite.js build --outDir <temporário> --emptyOutDir --logLevel warn";

/**
 * Build de produção do corpus num diretório temporário. O corpus não é alterado (o dist/ dele fica
 * intacto). O que o Vite copia de `public/` (as alas congeladas: pnip/, real/, static/) é retirado do
 * build antes do fechamento: o fechamento casa por NOME de arquivo, e o bundle da tela cita nomes
 * genéricos (`collapse.js` do DS) que também existem nessas alas. A tela B vem do congelamento, não
 * do build.
 */
export function buildCorpus(corpus: string): string {
  const outDir = mkdtempSync(join(tmpdir(), "export-telas-build-"));
  execFileSync(process.execPath, [join("node_modules", "vite", "bin", "vite.js"), "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "warn"], {
    cwd: corpus, stdio: ["ignore", "inherit", "inherit"],
  });
  const publicDir = join(corpus, "public");
  if (existsSync(publicDir)) for (const entry of readdirSync(publicDir)) rmSync(join(outDir, entry), { recursive: true, force: true });
  return outDir;
}

interface FreezeManifest {
  origem: { app: string; commit: string; fork: string; forkCommit: string };
  build: { comando: string; node: string; angular: string; sourceMaps?: boolean };
  arquivos: Record<string, string>;
}

/** Arquivos da tela B: exatamente a lista do manifesto do congelamento, conferida contra a árvore. */
export function screenBFiles(corpus: string, site: TelaSite): { files: { rel: string; abs: string }[]; freezeSha256: string; freeze: FreezeManifest } {
  const tree = site.arvore.replace(/\/+$/, "");
  const treeDir = join(corpus, "public", tree);
  const excluded = new Set((site.excluir ?? []).map((p) => p.replace(new RegExp(`^${tree}/`), "")));
  const freezeName = [...excluded].find((p) => p.endsWith("manifesto.json"));
  if (!freezeName) throw new Error(`telas.json não declara o manifesto do congelamento em isolamento.site.excluir`);
  const freezeText = readFileSync(join(treeDir, freezeName));
  const freeze = JSON.parse(freezeText.toString("utf8")) as FreezeManifest;
  const listed = Object.keys(freeze.arquivos).sort();
  const onDisk = listFiles(treeDir).filter((rel) => !excluded.has(rel));
  const extra = onDisk.filter((rel) => !freeze.arquivos[rel]);
  const missing = listed.filter((rel) => !onDisk.includes(rel));
  if (extra.length || missing.length) {
    throw new Error(`public/${tree}/ difere do manifesto do congelamento: a mais ${JSON.stringify(extra)}, faltando ${JSON.stringify(missing)}`);
  }
  const files = listed.map((rel) => {
    const abs = join(treeDir, rel);
    if (sha256(readFileSync(abs)) !== freeze.arquivos[rel]) throw new Error(`public/${tree}/${rel} difere do sha256 do manifesto do congelamento`);
    return { rel: `${tree}/${rel}`, abs };
  });
  return { files, freezeSha256: sha256(freezeText), freeze };
}

/** Prepara o diretório de saída: novo, vazio, ou só `.git` + uma exportação anterior (que é removida). */
function prepareOut(out: string): void {
  if (!existsSync(out)) {
    mkdirSync(out, { recursive: true });
    return;
  }
  if (!statSync(out).isDirectory()) throw new Error(`${out} não é diretório`);
  const entries = readdirSync(out);
  const owned = new Set<string>([...ROOT_FILES, SITE_DIR]);
  const foreign = entries.filter((e) => e !== ".git" && !owned.has(e));
  if (foreign.length) throw new Error(`${out} contém arquivos que não são de uma exportação: ${foreign.join(", ")}`);
  if (entries.some((e) => owned.has(e)) && !entries.includes("site-manifest.json")) {
    throw new Error(`${out} tem arquivos de exportação sem site-manifest.json; recuso substituir`);
  }
  for (const entry of entries) if (owned.has(entry)) rmSync(join(out, entry), { recursive: true, force: true });
}

function packageJson(): string {
  return JSON.stringify({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    private: true,
    description: "Duas telas web estáticas e um servidor mínimo (somente módulos nativos do Node.js).",
    type: "module",
    scripts: { start: "node server.mjs" },
    engines: { node: ">=20.19.0" },
  }, null, 2) + "\n";
}

export interface ExportOptions { out: string; corpus?: string; allowDirty?: boolean; createdAt?: string; log?: (line: string) => void }
export interface ExportResult { out: string; manifest: SiteManifestDoc; files: number; bytes: number }

export function exportTelas(options: ExportOptions): ExportResult {
  const log = options.log ?? ((line: string) => console.log(line));
  const corpus = resolve(options.corpus ?? DEFAULT_CORPUS);
  const out = resolve(options.out);
  if (out === corpus || out.startsWith(corpus + "\\") || out.startsWith(corpus + "/") || out === ROOT || out.startsWith(ROOT + "\\") || out.startsWith(ROOT + "/")) {
    throw new Error(`A saída não pode ficar dentro do corpus nem do govbr-eval: ${out}`);
  }
  const git = gitState(corpus);
  if (git.commit === null) throw new Error(`Não li o estado git do corpus em ${corpus}: ${git.error ?? "?"}`);
  if (git.dirty && !options.allowDirty) throw new Error(`Corpus com alterações locais: o commit ${git.commit} não descreveria o build. Use --allow-dirty para exportar assim mesmo (fica gravado).`);

  const telaA = telaOf(SCREEN_A);
  const telaB = telaOf(SCREEN_B);
  const siteB = telaB.isolamento.site;
  if (!siteB) throw new Error(`A tela ${SCREEN_B} não declara isolamento.site em telas.json`);

  const plan = new Map<string, string>(); // caminho em site/ → arquivo de origem
  log(`build de produção do corpus (${corpus}) em diretório temporário…`);
  const buildDir = buildCorpus(corpus);
  try {
    for (const rel of assetClosure(buildDir, telaA.entry)) {
      if (!SCREEN_A_FILE.test(rel) || FOREIGN_BUILD.test(rel)) throw new Error(`Fechamento de ${telaA.entry} trouxe ${rel}, fora do padrão da tela`);
      plan.set(rel, join(buildDir, rel));
    }
    const b = screenBFiles(corpus, siteB);
    for (const { rel, abs } of b.files) {
      if (plan.has(rel)) throw new Error(`Colisão de caminho entre as telas: ${rel}`);
      plan.set(rel, abs);
    }
    for (const [from, to] of Object.entries(siteB.aliases ?? {})) {
      if (!plan.has(to)) throw new Error(`Alias ${from} aponta para ${to}, fora do pacote`);
      if (plan.has(from.slice(1))) throw new Error(`Alias ${from} colide com um arquivo servido`);
    }

    prepareOut(out);
    const files: ManifestFile[] = [];
    for (const rel of [...plan.keys()].sort()) {
      if (!SITE_EXTENSIONS.has(extname(rel).toLowerCase())) throw new Error(`Extensão fora da lista: ${rel}`);
      const body = readFileSync(plan.get(rel)!);
      const target = join(out, SITE_DIR, rel);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body, { flag: "wx" });
      files.push({ path: rel, sha256: sha256(body), bytes: body.length });
    }

    const runtimeSources: Record<string, Buffer> = {
      ".gitattributes": Buffer.from(GITATTRIBUTES),
      ".node-version": Buffer.from(`${PACKAGE_NODE_VERSION}\n`),
      "README.md": readFileSync(join(TEMPLATES, "README.md")),
      "package.json": Buffer.from(packageJson()),
      "server.mjs": readFileSync(join(TEMPLATES, "server.mjs")),
    };
    const runtime: ManifestFile[] = [];
    for (const name of Object.keys(runtimeSources).sort()) {
      const body = runtimeSources[name];
      writeFileSync(join(out, name), body, { flag: "wx" });
      runtime.push({ path: name, sha256: sha256(body), bytes: body.length });
    }

    const bytes = files.reduce((sum, f) => sum + f.bytes, 0);
    const createdAt = options.createdAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const manifest: SiteManifestDoc = {
      contract: "site-manifest.v1",
      subsetOf: "snapshot-manifest.v1",
      fixture: false,
      createdAt,
      exporter: { version: EXPORTER_VERSION },
      package: { name: PACKAGE_NAME, version: PACKAGE_VERSION, node: PACKAGE_NODE_VERSION },
      item: {
        id: `${PACKAGE_NAME}-site-${listingSha256(files).slice(0, 12)}`,
        kind: "site",
        description: "Arquivos servidos das telas solicitacao e vistorias; sha256 = hash da listagem 'sha256  caminho' ordenada de files[].",
        sha256: listingSha256(files),
        bytes,
        location: { kind: "package-path", path: SITE_DIR, note: "pasta site/ deste pacote; destino de arquivo durável pendente" },
        immutable: true,
        exposedToAgent: false,
        version: PACKAGE_VERSION,
      },
      screens: [
        { id: SCREEN_A, title: "Solicitar serviço", entry: `/${telaA.entry}` },
        { id: SCREEN_B, title: "Vistorias", entry: `/${telaB.entry}` },
      ],
      routing: {
        spa: { prefix: `/${siteB.arvore.replace(/\/+$/, "")}/`, index: siteB.indice },
        aliases: { ...(siteB.aliases ?? {}) },
      },
      origin: {
        corpus: { commit: git.commit, dirty: git.dirty, dirtyAllowed: Boolean(options.allowDirty) },
        [SCREEN_A]: {
          build: { command: BUILD_COMMAND, tool: `vite ${viteVersion(corpus)}`, node: process.version },
          selection: `fechamento de arquivos citados a partir de ${telaA.entry} no build`,
        },
        [SCREEN_B]: {
          freezeManifestSha256: b.freezeSha256,
          selection: `lista de arquivos do manifesto do congelamento de public/${siteB.arvore}, conferida por sha256`,
          upstream: {
            app: b.freeze.origem.app, commit: b.freeze.origem.commit, fork: b.freeze.origem.fork, forkCommit: b.freeze.origem.forkCommit,
            buildCommand: b.freeze.build.comando, node: b.freeze.build.node, framework: `angular ${b.freeze.build.angular}`,
          },
        },
      },
      files,
      runtime,
      total: { files: files.length, bytes },
    };
    writeFileSync(join(out, "site-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    log(`exportado em ${out}: ${files.length} arquivos servidos, ${bytes} bytes; corpus ${git.commit}${git.dirty ? " (SUJO)" : ""}`);
    return { out, manifest, files: files.length, bytes };
  } finally {
    rmSync(buildDir, { recursive: true, force: true });
  }
}

// ───────────────────────────────────────────────────────────────── auditoria

export interface AuditOptions {
  /** Diretórios de topo ignorados (metadado do clone local, não do pacote): `.git`. */
  ignoreTopLevel?: string[];
  /** Trechos proibidos em qualquer arquivo de texto (caminhos absolutos, nome da usuária…). */
  forbiddenText?: string[];
}
export interface AuditReport { errors: string[]; files: number; bytes: number }

/**
 * Auditoria do pacote, sem nada do lado da avaliação: allowlist, ocultos, source maps, trechos
 * proibidos, hashes do manifesto. A varredura de vazamento do gabarito fica no teste (ela precisa
 * ler os gabaritos, e o pacote não pode depender deles).
 */
export function auditPackage(dir: string, options: AuditOptions = {}): AuditReport {
  const errors: string[] = [];
  const ignore = new Set(options.ignoreTopLevel ?? []);
  const tree = listTree(dir);
  const files = tree.files.filter((f) => !ignore.has(f.split("/")[0]));
  const dirs = tree.dirs.filter((d) => !ignore.has(d.split("/")[0]));

  let manifest: SiteManifestDoc | null = null;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "site-manifest.json"), "utf8")) as SiteManifestDoc;
  } catch (error) {
    errors.push(`site-manifest.json ilegível: ${(error as Error).message}`);
  }
  const listedSite = new Set((manifest?.files ?? []).map((f) => `${SITE_DIR}/${f.path}`));
  const allowed = new Set<string>([...ROOT_FILES, ...listedSite]);

  for (const f of files) {
    if (!allowed.has(f)) errors.push(`fora da allowlist: ${f}`);
    const segments = f.split("/");
    if (segments.some((s) => s.startsWith(".")) && !HIDDEN_ALLOWED.has(f)) errors.push(`arquivo oculto: ${f}`);
    if (f.toLowerCase().endsWith(".map")) errors.push(`source map: ${f}`);
    if (f.startsWith(`${SITE_DIR}/`) && !SITE_EXTENSIONS.has(extname(f).toLowerCase())) errors.push(`extensão fora da lista: ${f}`);
  }
  for (const d of dirs) if (d.split("/").some((s) => s.startsWith("."))) errors.push(`diretório oculto: ${d}`);
  for (const f of listedSite) if (!files.includes(f)) errors.push(`listado no manifesto e ausente: ${f}`);
  for (const f of ROOT_FILES) if (!files.includes(f)) errors.push(`arquivo da raiz ausente: ${f}`);

  let bytes = 0;
  const hashes = new Map<string, string>();
  for (const f of files) {
    const body = readFileSync(join(dir, f));
    bytes += body.length;
    hashes.set(f, sha256(body));
    if (!TEXT_EXTENSIONS.has(extname(f).toLowerCase())) continue;
    const text = body.toString("utf8");
    if (SOURCE_MAP_DIRECTIVE.test(text)) errors.push(`diretiva sourceMappingURL: ${f}`);
    const lower = text.toLowerCase();
    for (const needle of options.forbiddenText ?? []) {
      if (needle && lower.includes(needle.toLowerCase())) errors.push(`trecho proibido "${needle}" em ${f}`);
    }
  }

  if (manifest) {
    for (const f of manifest.files) {
      const actual = hashes.get(`${SITE_DIR}/${f.path}`);
      if (actual && actual !== f.sha256) errors.push(`sha256 difere do manifesto: ${SITE_DIR}/${f.path}`);
      const size = existsSync(join(dir, SITE_DIR, f.path)) ? statSync(join(dir, SITE_DIR, f.path)).size : -1;
      if (size >= 0 && size !== f.bytes) errors.push(`tamanho difere do manifesto: ${SITE_DIR}/${f.path}`);
    }
    for (const f of manifest.runtime ?? []) {
      const actual = hashes.get(f.path);
      if (actual && actual !== f.sha256) errors.push(`sha256 difere do manifesto: ${f.path}`);
    }
    const runtimeListed = new Set((manifest.runtime ?? []).map((f) => f.path));
    for (const f of ROOT_FILES) if (f !== "site-manifest.json" && !runtimeListed.has(f)) errors.push(`arquivo da raiz sem hash no manifesto: ${f}`);
    if (manifest.item?.sha256 !== listingSha256(manifest.files)) errors.push("item.sha256 não é o hash da listagem de files[]");
    const total = manifest.files.reduce((sum, f) => sum + f.bytes, 0);
    if (manifest.item?.bytes !== total || manifest.total?.files !== manifest.files.length || manifest.total?.bytes !== total) {
      errors.push("totais do manifesto não batem com files[]");
    }
    for (const f of manifest.files) if (f.path.toLowerCase().endsWith(".map")) errors.push(`source map listado: ${f.path}`);
  }
  return { errors, files: files.length, bytes };
}

/** Caminhos e nomes da máquina de preparação, derivados do ambiente (nada escrito à mão aqui). */
export function machineText(): string[] {
  const variants = (p: string): string[] => [p, p.replace(/\\/g, "/"), p.replace(/\\/g, "\\\\")];
  const workspace = resolve(ROOT, "..");
  const user = userInfo().username;
  const out = [
    ...variants(workspace), ...variants(resolve(workspace, "..")), ...variants(homedir()),
    "C:\\Users", "C:/Users", "C:\\\\Users", user,
    ...user.split(/\s+/).filter((w) => w.length >= 4),
  ];
  // "F:\" sozinho seria curto demais para dizer algo; o mínimo é a pasta do workspace.
  return [...new Set(out.filter((s) => s.length >= 4 && !/^[A-Za-z]:[\\/]{0,2}$/.test(s)))];
}

// ───────────────────────────────────────────────────────────────── CLI

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const out = argValue(args, "--out");
  if (!out) {
    console.error("Uso: npm run export:telas -- --out <dir> [--corpus ../govbr-corpus] [--allow-dirty]");
    process.exit(1);
  }
  const result = exportTelas({ out, corpus: argValue(args, "--corpus"), allowDirty: args.includes("--allow-dirty") });
  const audit = auditPackage(result.out, { ignoreTopLevel: [".git"], forbiddenText: machineText() });
  if (audit.errors.length) {
    console.error(`auditoria do pacote falhou:\n  ${audit.errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`auditoria ok: ${audit.files} arquivos, ${audit.bytes} bytes no pacote`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
