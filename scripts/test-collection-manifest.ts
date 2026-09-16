/**
 * Fatia 6 — identidade da coleta, sem navegador. Inclui os três casos que a revisão de 16/09
 * mostrou passando como compatíveis: compilado diferente, árvore suja no lugar de hash, e hash da
 * página ausente de um lado.
 */
import assert from "node:assert/strict";
import {
  COLLECTION_PLAN_VERSION, compareIdentities, identityProblems, manifestProblems, planProblems, statePlanOf,
  statePlanSha256, verifyInstalledIdentity, oracleIdentity, type CollectionManifest, type CollectionPlan,
  type ExecutableIdentity,
} from "./collection-manifest";

let tests = 0;
function test(name: string, fn: () => void): void { fn(); tests++; console.log(`ok ${name}`); }

const h = (c: string): string => c.repeat(64);
const identity: ExecutableIdentity = {
  collection: "fluxo-1.3.0", referenceSha256: h("a"), siteManifestSha256: h("b"),
  oracleDistSha256: h("c"), oracleDataSha256: h("d"), statePlanSha256: h("e"),
};
const plan: CollectionPlan = {
  planVersion: COLLECTION_PLAN_VERSION, stamp: "s", schedule: "alternado", seed: null, attemptBudget: 2,
  retryPolicy: "nenhuma", failurePolicy: "interrompe", arms: ["com", "sem"], runsPerArm: 1, model: "m",
  reasoningEffort: "high", oracleProfile: "combined", provider: "claude", scope: "full", suite: "fluxo",
  slots: [{ slot: 1, arm: "com", repetition: 1, block: 1 }, { slot: 2, arm: "sem", repetition: 1, block: 1 }],
};
function manifest(overrides: Partial<CollectionManifest> = {}): CollectionManifest {
  return {
    manifestVersion: "manifesto-coleta-1.0.0", generatedAt: "t", collection: { version: "fluxo-1.3.0" },
    identity: { ...identity }, reference: { version: "1.5.0", sha256: h("a"), file: "ground-truth-fluxo.json", units: 1, specs: 1 },
    statePlan: null,
    oracle: { version: "2.5.2", distSha256: h("c"), distFiles: 1, sourceSha256: h("f"), dataSha256: h("d"),
      knowledgeSha256: h("1"), dataFiles: { "tokens.json": h("2") }, builtInPreflight: true },
    site: { manifestSha256: h("b"), corpusCommit: "abc", corpusDirty: false },
    surface: { version: "surface-1.2.0" }, surfaceSha256: h("3"), plan: structuredClone(plan), planSha256: h("4"),
    analysisAtCollection: { scoringVersion: "x", acceptancePolicy: "y", scorerSha256: h("5"),
      checkerAliasesSha256: h("6"), kbAliasesSha256: h("7") },
    repos: { "govbr-eval": { commit: "abc", dirty: true, lockSha256: h("8") } },
    runtime: { node: "v25", platform: "win32 x64", client: { name: "claude-cli", version: "2.0.0" },
      playwright: { eval: "1.61.1", validator: "1.61.1", mcp: "0.0.70" },
      browsers: { eval: "140", validator: "140" }, notMeasured: [] },
    archive: null,
    ...overrides,
  };
}

test("identical complete identities are compatible", () => {
  assert.deepEqual(compareIdentities(identity, { ...identity }), []);
});

test("a different compiled oracle is refused (review case 1)", () => {
  const problems = compareIdentities(identity, { ...identity, oracleDistSha256: h("9") });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /oracleDistSha256/);
});

test("dirty status is not identity: only hashes are compared, and a dirty tree cannot hide a change (review case 2)", () => {
  // `dirty` is not a field of the identity at all; a changed page under a dirty tree is still caught.
  assert.equal("corpusDirty" in identity, false);
  assert.match(compareIdentities(identity, { ...identity, siteManifestSha256: h("0") })[0], /siteManifestSha256/);
});

test("a missing page hash on either side is refused, never treated as equal (review case 3)", () => {
  assert.match(compareIdentities(identity, { ...identity, siteManifestSha256: null }).join(";"), /linha de base: siteManifestSha256/);
  assert.match(compareIdentities({ ...identity, siteManifestSha256: null }, identity).join(";"), /coleta: siteManifestSha256/);
  // Two nulls are not a match.
  assert.ok(compareIdentities({ ...identity, siteManifestSha256: null }, { ...identity, siteManifestSha256: null }).length >= 2);
});

test("every identity field is checked: KB, reference, state plan and collection", () => {
  for (const field of ["referenceSha256", "oracleDataSha256", "statePlanSha256"] as const) {
    assert.match(compareIdentities(identity, { ...identity, [field]: h("9") }).join(), new RegExp(field));
  }
  assert.match(compareIdentities(identity, { ...identity, collection: "fluxo-1.2.0" }).join(), /collection/);
  assert.deepEqual(identityProblems("x", undefined), ["x: identidade ausente"]);
  assert.match(identityProblems("x", { ...identity, oracleDistSha256: "2.5.2" }).join(), /oracleDistSha256 ausente ou inválido/);
});

test("a complete manifest has no problems; each required field fails explicitly", () => {
  assert.deepEqual(manifestProblems(manifest()), []);
  const broken = manifest();
  broken.oracle.knowledgeSha256 = null;
  broken.repos["govbr-eval"] = { commit: null, dirty: null, gitError: "not a git repository", lockSha256: null };
  broken.runtime.client.version = "unknown";
  broken.runtime.browsers.validator = null;
  broken.surface = null;
  const problems = manifestProblems(broken).join("\n");
  for (const expected of [/base de conhecimento/, /commit de govbr-eval \(not a git repository\)/, /estado da árvore/,
    /package-lock de govbr-eval/, /versão do cliente/, /navegador do oráculo/, /descrição da superfície/]) {
    assert.match(problems, expected);
  }
  assert.match(manifestProblems(manifest({ identity: { ...identity, oracleDataSha256: null } })).join(), /oracleDataSha256/);
  assert.match(manifestProblems(manifest({ site: { manifestSha256: h("0"), corpusCommit: null, corpusDirty: null } })).join(), /site: hash diverge/);
});

test("the plan must be frozen, complete and without undeclared retries", () => {
  assert.deepEqual(planProblems(plan), []);
  assert.deepEqual(planProblems(null), ["plano ausente"]);
  assert.match(planProblems({ ...plan, attemptBudget: 3 }).join(), /retry não declarado/);
  assert.match(planProblems({ ...plan, slots: plan.slots.slice(0, 1) }).join(), /slots ≠ braços × repetições/);
  assert.match(planProblems({ ...plan, slots: [plan.slots[1], plan.slots[0]] }).join(), /fora de ordem/);
  assert.match(planProblems({ ...plan, slots: [plan.slots[0], { ...plan.slots[0], slot: 2 }] }).join(), /repetido/);
  assert.match(planProblems({ ...plan, seed: 42 as unknown as null }).join(), /semente/);
  assert.match(planProblems({ ...plan, retryPolicy: " " }).join(), /retry\/falha/);
});

test("state plan identity follows windows, setup and waitFor", () => {
  const gt = { _meta: { url: "/fluxo.html", viewport: { width: 1280, height: 900 }, setup: [{ action: "click" }], waitFor: "#cpf" },
    violations: [{ id: "V-1" }, { id: "V-2", viewport: { width: 320, height: 720 } }, { id: "V-3", viewport: { width: 1280, height: 900 } }] };
  const planOf = statePlanOf(gt);
  assert.deepEqual(planOf.extras, [{ viewport: { width: 320, height: 720 }, specs: ["V-2"] }]);
  const base = statePlanSha256(planOf);
  assert.notEqual(statePlanSha256(statePlanOf({ ...gt, _meta: { ...gt._meta, setup: [] } })), base);
  assert.notEqual(statePlanSha256(statePlanOf({ ...gt, violations: [{ id: "V-1" }] })), base);
  assert.equal(statePlanSha256(statePlanOf(structuredClone(gt))), base);
});

test("installed oracle is checked against the manifest (build or KB change mid-battery)", () => {
  const live = oracleIdentity();
  assert.ok(live.distSha256 && live.dataSha256, "validator dist/data must exist for this check");
  const current = manifest({ identity: { ...identity, oracleDistSha256: live.distSha256, oracleDataSha256: live.dataSha256 } });
  assert.deepEqual(verifyInstalledIdentity(current), []);
  assert.match(verifyInstalledIdentity(manifest({ identity: { ...identity, oracleDataSha256: live.dataSha256 } })).join(), /compilado mudou/);
  assert.match(verifyInstalledIdentity(manifest({ identity: { ...identity, oracleDistSha256: live.distSha256 } })).join(), /base do oráculo mudaram/);
});

console.log(`${tests} collection-manifest tests passed.`);
