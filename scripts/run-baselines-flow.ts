/**
 * Linhas de base determinísticas da suíte de fluxo (D-06/D-23/D-25; fatia 6 do v02).
 *
 * A suíte `TC-*` atribui achado do axe a caso pelo `data-testid` da seção que o contém. A tela de
 * fluxo não tem seções, então esse runner não serve aqui — e herdar os números dele seria pior do
 * que não ter nenhum: seriam medidas de OUTRA página apresentadas ao lado de execuções desta.
 *
 * Uma PASSADA por janela do plano de estados (a padrão e cada janela extra que uma spec declara),
 * todas depois da mesma sequência de `setup` do gabarito. Em cada passada:
 *   axe          — página inteira;
 *   validator    — duas varreduras, nunca confundidas. A NÃO GUIADA varre a página inteira sob
 *                  política fixa, sem seletor nenhum do gabarito: é a que pode ser posta ao lado do
 *                  agente, que também não sabia onde olhar. A GUIADA recebe as âncoras das specs
 *                  daquela janela: é diagnóstico de cobertura (prova que cada lacuna incorporada tem
 *                  medida executada) e nunca entra na comparação.
 * Achados brutos, resolução de seletores, estado, janela e duração de cada varredura ficam no
 * arquivo. ESLint mede o FONTE, não o DOM, e fica à parte.
 *
 * Uso:
 *   bateria: npm run baselines:fluxo -- --out NOVO_ARQ --collection-manifest ARQ --site-manifest ARQ
 *            (APP_URL = origem que serve o site congelado; os bytes servidos são conferidos)
 *   avulso:  npm run baselines:fluxo -- --dev-global   (results/baselines-fluxo.json, não confrontável)
 */

import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { ESLint } from "eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import type { FlowGroundTruth, FlowSetupStep, FlowViewport } from "../types";
import { ROOT } from "./adjudication";
import { VIEWPORT_PADRAO, exigeSegmentoUnico, preparePage, resolveOnPage } from "./anchors";
import { normalizeRuleId } from "./units";
import { FLOW_INSTRUMENT_VERSION } from "./instrument";
import {
  VALIDATOR_ROOT, compareIdentities, gitState, oracleIdentity, readCollectionManifest, sha256, sha256File,
  statePlanOf, statePlanSha256, type ExecutableIdentity,
} from "./collection-manifest";
import { verifyServedSite } from "./measurement-surface";
import { referenciaDe, telaFromArgs } from "./telas";

const execFileAsync = promisify(execFile);

/**
 * 2.1.0 (D-54): a política passa a incluir o check `page` do validator 2.7.0 (regiões obrigatórias do
 * Template Base e salto para o conteúdo). O formato do arquivo não mudou, só o que a varredura pede;
 * cada varredura grava os seus `checks`, então o arquivo diz por si o que rodou. Linhas de base
 * 2.0.0 de baterias fechadas continuam legíveis (READABLE_BASELINE_VERSIONS) e não são regravadas.
 */
export const BASELINE_VERSION = "linha-de-base-fluxo-2.1.0";
export const READABLE_BASELINE_VERSIONS: readonly string[] = ["linha-de-base-fluxo-2.0.0", BASELINE_VERSION];
/** Checks pedidos ao validator nas duas passadas. Fixos e independentes da tela. */
export const BASELINE_CHECKS = ["tokens", "structure", "page"] as const;
/** Política da varredura comparável. Fixa e independente da tela. */
export const UNGUIDED_POLICY = "pagina-inteira: checks tokens+structure+page, seletor padrão do validator, " +
  "todos os componentes e verificações de token, janela e setup do plano de estados, sem seletor do gabarito";
export const GUIDED_POLICY = "diagnostico: âncoras das specs da janela; não comparável ao agente";

/** `bateria`: escrita sob o carimbo de uma bateria e confrontável com ela. `dev-global`: avulsa. */
export type FlowBaselineScope = "bateria" | "dev-global";

export interface AxeFindingRef {
  rule: string;
  impact: string | null;
  description: string;
  /** Seletor que o próprio axe devolveu para o nó. */
  target: string;
}

export interface ValidatorFindingRef {
  id: string | null;
  rule: string;
  source: string;
  description: string;
  expected: string | null;
  target: string;
}

export interface ValidatorScanRecord {
  mode: "nao-guiada" | "guiada";
  policy: string;
  request: { selectors: string[] | null; checks: string[]; viewport: FlowViewport; actions: number };
  stateFingerprint: string | null;
  coverage: unknown;
  findings: ValidatorFindingRef[];
  seconds: number;
}

export interface BaselinePass {
  /** `LARGURAxALTURA`: a cena do plano de estados. */
  id: string;
  viewport: FlowViewport;
  /** Specs que esta janela existe para medir (a padrão mede as que não declaram janela). */
  specs: string[];
  startedAt: string;
  seconds: number;
  axe: { violations: number; passes: number; incomplete: string[]; findings: AxeFindingRef[]; seconds: number };
  validator: { unguided: ValidatorScanRecord; guided: ValidatorScanRecord | null };
  /** Resolução de todo seletor desta passada, na mesma página e no mesmo estado. */
  resolution: { bySelector: Record<string, { ok: boolean; error: string | null; keys: string[] }>; labels: Record<string, string> };
}

export interface FlowBaselines {
  baselineVersion: string;
  /** `failed`: nada aqui é comparável; as passadas concluídas ficam para diagnóstico. */
  status: "complete" | "failed";
  error: string | null;
  scope: FlowBaselineScope;
  timestamp: string;
  appUrl: string;
  state: { setup: FlowSetupStep[]; waitFor: string | null };
  provenance: {
    collectionManifest: { path: string; sha256: string } | null;
    /** Identidade MEDIDA aqui (bytes servidos, compilado usado, gabarito lido), não copiada do manifesto. */
    identity: ExecutableIdentity;
    corpus: { commit: string | null; dirty: boolean | null };
    validatorVersion: string | null;
    tools: { axe: string | null; playwright: string | null };
  };
  passes: BaselinePass[];
  /** Diagnóstico de cobertura: a guiada detectou cada spec `deterministicBaseline`? */
  coverageCheck: { specId: string; pass: string; detected: boolean }[];
  eslint: {
    tool: string;
    config: string;
    /** Fonte da tela, lido do corpus vivo: não é o build congelado. */
    files: { path: string; sha256: string | null }[];
    /**
     * Achados do linter, SEM atribuição a elemento. Um linter de código aponta arquivo e linha;
     * a unidade desta suíte é um elemento do DOM, e não existe mapa honesto entre os dois sem
     * marcar o corpus — o que o D-02 proíbe. Fica como contagem declarada.
     */
    findings: { rule: string; message: string; file: string; line: number }[];
    seconds: number;
  } | null;
  /**
   * Por que não há medida de fonte, quando `eslint` é `null`: a tela não declara `sources`. Fica
   * dito no arquivo para que um zero ausente não seja lido como zero medido.
   */
  eslintAusente?: string;
  /**
   * Custo de execução. Zero de API não é zero de custo: a passada determinística consome relógio e
   * máquina, e comparar "de graça" com o agente sem dizer isso é meia verdade.
   */
  cost: { wallClockSeconds: number; apiUsd: 0; platform: string; passes: { id: string; seconds: number }[] };
  /** Resumo legado (D-35/D-38) para `score:fluxo:legacy`; a comparação v02 lê `passes`. */
  legacy: {
    axe: { byElementKey: Record<string, AxeFindingRef[]>; unattributed: AxeFindingRef[]; passes: number };
    validator: { byElementKey: Record<string, ValidatorFindingRef[]>; mode: "guiada" } | null;
  } | null;
}

const argv = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Falta valor para ${name}`);
  return value;
};
const seconds = (started: number): number => Number(((Date.now() - started) / 1000).toFixed(1));
const sceneId = (v: FlowViewport): string => `${v.width}x${v.height}`;

async function main(): Promise<number> {
  const devGlobal = argv.includes("--dev-global");
  const outArg = argValue("--out");
  const manifestArg = argValue("--collection-manifest");
  const siteManifestArg = argValue("--site-manifest");
  if (devGlobal === Boolean(outArg)) throw new Error("Use --out (linha de base de bateria) OU --dev-global (arquivo avulso).");
  if (outArg && (!manifestArg || !siteManifestArg)) throw new Error("Linha de base de bateria exige --collection-manifest e --site-manifest.");
  // A tela decide o arquivo avulso e o fonte que o ESLint lê: com uma pasta e um fonte fixos, a
  // linha de base de uma segunda tela sobrescreveria a da primeira e o ESLint leria a página errada.
  const tela = telaFromArgs(argv);
  const out = resolve(ROOT, outArg ?? `results/baselines-${tela.nome}.json`);
  if (outArg && existsSync(out)) throw new Error(`${out} já existe: linha de base de bateria nunca é sobrescrita.`);

  const appOrigin = process.env.APP_URL ?? "http://localhost:3000";
  const collection = manifestArg ? readCollectionManifest(resolve(manifestArg)) : null;
  if (collection && !collection.manifest.archive) throw new Error("O manifesto de coleta não arquivou o gabarito.");
  // Na bateria, o gabarito é a cópia arquivada pela coleta, não o arquivo vivo — e uma bateria sem
  // referência para em `referenciaDe`, nomeando o arquivo que falta. O arquivo AVULSO aceita tela
  // ainda sem referência (tela B, D-49): mede a página como ela é, sem spec, sem varredura guiada e
  // sem diagnóstico de cobertura. Nada aqui inventa gabarito nem antecipa achado.
  const arquivoGt = process.env.FLOW_GT ?? (devGlobal ? tela.reference : referenciaDe(tela));
  const gtPath = collection?.manifest.archive ? join(ROOT, collection.manifest.archive.reference.path)
    : arquivoGt ? join(ROOT, arquivoGt) : null;
  const gtBytes = gtPath ? readFileSync(gtPath) : null;
  const gt = gtBytes ? JSON.parse(gtBytes.toString("utf8")) as FlowGroundTruth : null;
  const statePlan = gt ? statePlanOf(gt)
    : { padrao: VIEWPORT_PADRAO, extras: [], setup: [], waitFor: null, url: tela.entry };
  // A linha de base varre o estado do FIM do setup, e o scanner do oráculo recebe a mesma sequência
  // como `actions` — a extensão de navegação (D-57) não chega a ele. Recusa antes de gastar nada.
  exigeSegmentoUnico(statePlan.setup, "baselines:fluxo (axe e varredura do validator no fim do setup)");
  const url = new URL(gt?._meta.url ?? tela.entry, appOrigin).toString();
  const corpusSrc = process.env.CORPUS_SRC ?? join(ROOT, "..", "govbr-corpus", "src");
  const flowSources = tela.sources.map(source => join(corpusSrc, "..", source));

  const validatorEntry = join(VALIDATOR_ROOT, "dist", "cli", "scan-page.js");
  if (!existsSync(validatorEntry)) throw new Error(`Scanner compilado ausente: ${validatorEntry}. Rode npm run build no validator.`);
  const oracleAtStart = oracleIdentity();
  const served = siteManifestArg ? await verifyServedSite(appOrigin, resolve(siteManifestArg)) : null;
  const identity: ExecutableIdentity = {
    collection: FLOW_INSTRUMENT_VERSION,
    referenceSha256: gtBytes ? sha256(gtBytes) : null,
    siteManifestSha256: served?.manifestSha256 ?? null,
    oracleDistSha256: oracleAtStart.distSha256,
    oracleDataSha256: oracleAtStart.dataSha256,
    statePlanSha256: statePlanSha256(statePlan),
  };
  const corpus = gitState(join(ROOT, "..", "govbr-corpus"));
  const started = Date.now();
  const record: FlowBaselines = {
    baselineVersion: BASELINE_VERSION,
    status: "failed",
    error: null,
    scope: devGlobal ? "dev-global" : "bateria",
    timestamp: new Date().toISOString(),
    appUrl: url,
    state: { setup: gt?._meta.setup ?? [], waitFor: gt?._meta.waitFor ?? null },
    provenance: {
      collectionManifest: collection ? { path: resolve(manifestArg!).replace(/\\/g, "/"), sha256: collection.sha256 } : null,
      identity,
      corpus: { commit: corpus.commit, dirty: corpus.dirty },
      validatorVersion: oracleAtStart.version,
      tools: {
        axe: (JSON.parse(readFileSync(join(ROOT, "node_modules", "axe-core", "package.json"), "utf8")) as { version: string }).version,
        playwright: (JSON.parse(readFileSync(join(ROOT, "node_modules", "playwright", "package.json"), "utf8")) as { version: string }).version,
      },
    },
    passes: [],
    coverageCheck: [],
    eslint: null,
    cost: { wallClockSeconds: 0, apiUsd: 0, platform: `${process.platform} ${process.arch}`, passes: [] },
    legacy: null,
  };

  const save = (): void => {
    record.cost.wallClockSeconds = seconds(started);
    record.cost.passes = record.passes.map(p => ({ id: p.id, seconds: p.seconds }));
    writeFileSync(out, JSON.stringify(record, null, 2) + "\n", devGlobal ? {} : { flag: "wx" });
  };

  try {
    if (collection) {
      const mismatches = compareIdentities(collection.manifest.identity, identity);
      if (mismatches.length) throw new Error(`A linha de base mediria outra coleta: ${mismatches.join("; ")}`);
    }
    console.log(`\nLinhas de base da suíte de fluxo — ${url}`);
    console.log(`Plano: ${[statePlan.padrao, ...statePlan.extras.map(e => e.viewport)].map(sceneId).join(", ")} · setup de ${record.state.setup.length} passo(s)`);

    const setupActions = record.state.setup.map(step => ({
      action: step.action,
      ...(step.selector ? { selector: step.selector } : {}),
      ...(step.value !== undefined ? { value: step.value } : {}),
      ...(step.ms !== undefined ? { ms: step.ms } : {}),
    }));

    async function scan(mode: "nao-guiada" | "guiada", viewport: FlowViewport, anchors: string[]): Promise<ValidatorScanRecord> {
      const selectors = mode === "guiada" ? [...new Set(anchors)] : null;
      const checks = [...BASELINE_CHECKS];
      const request = { url, checks, actions: setupActions, viewport, ...(selectors ? { selectors } : {}) };
      const t = Date.now();
      const { stdout } = await execFileAsync(process.execPath,
        [validatorEntry, Buffer.from(JSON.stringify(request), "utf8").toString("base64")], { maxBuffer: 32 * 1024 * 1024 });
      const result = JSON.parse(stdout) as {
        stateFingerprint?: string; coverage?: unknown;
        findings: Array<{ id?: string; rule: { id: string; source: string }; element: { locator: string }; evidence: { observed: string; expected?: string } }>;
      };
      return {
        mode, policy: mode === "guiada" ? GUIDED_POLICY : UNGUIDED_POLICY,
        request: { selectors, checks, viewport, actions: setupActions.length },
        stateFingerprint: result.stateFingerprint ?? null,
        coverage: result.coverage ?? null,
        findings: result.findings.map(f => ({
          id: f.id ?? null, rule: normalizeRuleId(f.rule.id), source: f.rule.source,
          description: f.evidence.observed, expected: f.evidence.expected ?? null, target: f.element.locator,
        })),
        seconds: seconds(t),
      };
    }

    // Sem gabarito não há spec: uma cena só, a janela padrão do experimento, e nenhuma âncora.
    const violations = gt?.violations ?? [];
    const scenes = [
      { viewport: statePlan.padrao, specs: violations.filter(v => !v.viewport ||
        (v.viewport.width === statePlan.padrao.width && v.viewport.height === statePlan.padrao.height)) },
      ...statePlan.extras.map(e => ({ viewport: e.viewport, specs: violations.filter(v => e.specs.includes(v.id)) })),
    ];

    const browser = await chromium.launch();
    try {
      for (const scene of scenes) {
        const passStarted = Date.now();
        const context = await browser.newContext({ viewport: scene.viewport });
        const page: Page = await context.newPage();
        await preparePage(page, url, { waitFor: gt?._meta.waitFor, setup: gt?._meta.setup });
        const axeStarted = Date.now();
        const axe = await new AxeBuilder({ page }).analyze();
        const axeSeconds = seconds(axeStarted);
        const axeFindings: AxeFindingRef[] = axe.violations.flatMap(v => v.nodes.map(n => ({
          rule: v.id, impact: v.impact ?? null, description: v.help ?? v.description, target: n.target.flat().join(" "),
        })));
        const anchors = scene.specs.map(spec => spec.anchor);
        const unguided = await scan("nao-guiada", scene.viewport, []);
        const guided = anchors.length ? await scan("guiada", scene.viewport, anchors) : null;
        const selectors = [...axeFindings.map(f => f.target), ...unguided.findings.map(f => f.target),
          ...(guided?.findings.map(f => f.target) ?? []), ...anchors, ...scene.specs.flatMap(s => s.except ? [s.except] : [])];
        const resolved = await resolveOnPage(page, selectors);
        await context.close();
        const pass: BaselinePass = {
          id: sceneId(scene.viewport), viewport: scene.viewport, specs: scene.specs.map(s => s.id),
          startedAt: new Date(passStarted).toISOString(), seconds: seconds(passStarted),
          axe: { violations: axe.violations.length, passes: axe.passes.length, incomplete: axe.incomplete.map(i => i.id),
            findings: axeFindings, seconds: axeSeconds },
          validator: { unguided, guided },
          resolution: {
            bySelector: Object.fromEntries([...resolved.bySelector].map(([s, r]) => [s, { ok: r.ok, error: r.error, keys: r.keys }])),
            labels: Object.fromEntries([...resolved.byKey].map(([k, e]) => [k, e.label])),
          },
        };
        record.passes.push(pass);
        console.log(`\n[${pass.id}] axe ${axe.violations.length} regra(s)/${axeFindings.length} nó(s) · ` +
          `validator não guiada ${unguided.findings.length} (${unguided.seconds}s) · guiada ${guided?.findings.length ?? "—"} · ${pass.seconds}s`);
      }
    } finally {
      await browser.close();
    }

    // Diagnóstico de cobertura: cada spec marcada deve ter sido medida pela guiada da sua janela.
    for (const pass of gt ? record.passes : []) {
      for (const specId of pass.specs) {
        const spec = gt!.violations.find(v => v.id === specId)!;
        if (!spec.deterministicBaseline) continue;
        const keys = new Set(pass.resolution.bySelector[spec.anchor]?.keys ?? []);
        const rules = new Set(spec.rules.map(normalizeRuleId));
        const detected = (pass.validator.guided?.findings ?? []).some(f =>
          rules.has(f.rule) && (pass.resolution.bySelector[f.target]?.keys ?? []).some(k => keys.has(k)));
        record.coverageCheck.push({ specId, pass: pass.id, detected });
      }
    }

    if (flowSources.length === 0) {
      // Tela sem fonte declarada: página capturada, não entrada Vite. Rodar o linter sobre nada e
      // gravar "0 achados" seria apresentar ausência de medida como ausência de defeito.
      record.eslintAusente = `a tela "${tela.nome}" não declara fonte em telas.json: página capturada, sem TSX para o linter ler`;
      console.log(`\neslint-plugin-jsx-a11y: não executado — ${record.eslintAusente}`);
    } else {
      const eslintStarted = Date.now();
      const eslint = new ESLint({
        // O fonte do corpus mora fora do govbr-eval; sem isto o ESLint 9 o ignora.
        cwd: dirname(corpusSrc),
        overrideConfigFile: true,
        overrideConfig: [{
          files: ["**/*.tsx"],
          languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
          plugins: { "jsx-a11y": jsxA11y },
          rules: jsxA11y.flatConfigs.recommended.rules,
        }],
      });
      const lintResults = await eslint.lintFiles(flowSources);
      record.eslint = {
        tool: "eslint-plugin-jsx-a11y (recommended)",
        config: "flat, recommended",
        files: flowSources.map(path => ({ path: path.replace(/\\/g, "/"), sha256: sha256File(path) })),
        findings: lintResults.flatMap(r => r.messages.map(m => ({ rule: m.ruleId ?? "?", message: m.message, file: r.filePath, line: m.line }))),
        seconds: seconds(eslintStarted),
      };
      console.log(`\neslint-plugin-jsx-a11y: ${record.eslint.findings.length} achado(s) no fonte (não atribuídos a elemento)`);
    }

    record.legacy = gt ? legacySummary(record, gt) : null;

    const oracleAtEnd = oracleIdentity();
    if (oracleAtEnd.distSha256 !== oracleAtStart.distSha256 || oracleAtEnd.dataSha256 !== oracleAtStart.dataSha256) {
      throw new Error("O oráculo compilado mudou durante a linha de base.");
    }
    const missing = record.coverageCheck.filter(c => !c.detected);
    if (missing.length) throw new Error(`Diagnóstico guiado não detectou: ${missing.map(c => `${c.specId}@${c.pass}`).join(", ")}`);
    record.status = "complete";
    save();
    console.log(`\nEscrito em ${out} (${record.scope}, ${record.cost.wallClockSeconds}s, US$ 0 de API)\n`);
    return 0;
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
    save();
    console.error(`Linha de base FALHOU: ${record.error}\nParcial preservado em ${out} (status failed, ${record.passes.length} passada(s)).`);
    return 1;
  }
}

/** Mesmo recorte do D-35: uma passada extra só atribui às âncoras das specs da sua janela. */
function legacySummary(record: FlowBaselines, gt: FlowGroundTruth): FlowBaselines["legacy"] {
  const axeByKey: Record<string, AxeFindingRef[]> = {};
  const unattributed: AxeFindingRef[] = [];
  const validatorByKey: Record<string, ValidatorFindingRef[]> = {};
  record.passes.forEach((pass, index) => {
    const allowed = index === 0 ? null : new Set(pass.specs.flatMap(id => {
      const spec = gt.violations.find(v => v.id === id)!;
      return pass.resolution.bySelector[spec.anchor]?.keys ?? [];
    }));
    for (const f of pass.axe.findings) {
      const keys = (pass.resolution.bySelector[f.target]?.keys ?? []).filter(k => !allowed || allowed.has(k));
      if (!keys.length && !allowed) unattributed.push(f);
      for (const k of keys) (axeByKey[k] ??= []).push(f);
    }
    for (const f of pass.validator.guided?.findings ?? []) {
      for (const k of (pass.resolution.bySelector[f.target]?.keys ?? []).filter(k => !allowed || allowed.has(k))) {
        (validatorByKey[k] ??= []).push(f);
      }
    }
  });
  return {
    axe: { byElementKey: axeByKey, unattributed, passes: record.passes[0]?.axe.passes ?? 0 },
    validator: record.passes.some(p => p.validator.guided) ? { byElementKey: validatorByKey, mode: "guiada" } : null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }, err => { console.error(err instanceof Error ? err.message : err); process.exitCode = 1; });
}
