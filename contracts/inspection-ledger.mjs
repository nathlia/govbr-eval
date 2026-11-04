// Regras do registro de inspeção (inspection.v1, NAT-81) que um JSON Schema não expressa.
//
// Um só lugar, sem dependências: o coletor (runner/container/collector.mjs, que recebe uma cópia deste
// arquivo junto com os schemas na imagem) e o validador de contratos (contracts/index.ts) aplicam as
// MESMAS regras. Só roda sobre relatório que já passou no schema.
//
//   x-unique            id repetido dentro de regions, states, items ou candidates
//   x-unknown-state     região, item ou candidato aponta estado que não está em `states`
//   x-unknown-region    item aponta região que não está em `regions`
//   x-unknown-finding   candidato aponta índice fora de `report.findings`
//   x-accepted-without-finding  candidato aceito sem achado vinculado
//   x-rejected-with-finding     candidato rejeitado vinculado a achado enviado (a decisão contradiz o relatório);
//                               incerto pode ou não apontar achado — o achado enviado com incerteza é legítimo
//   x-recipe-from-load  receita de estado que não começa no carregamento (`load`)
//   x-complete-with-gaps        `completion: complete` com região não inspecionada/parcial ou estado não alcançado
//
// Revisão clauses-1 (lista única 3.7.2, B2; `clauses` é opcional e aditivo):
//   x-unique            o mesmo par (ref, state) duas vezes em `clauses`
//   x-unknown-state     cláusula aponta estado que não está em `states`
//   x-unknown-finding   cláusula aponta índice fora de `report.findings`
//   x-violated-without-finding  cláusula `violada` sem achado vinculado
//   x-finding-without-violation cláusula `medida` ou `nao-se-aplica` vinculada a achado (a decisão contradiz o relatório)
//
// Declaração `confirmed` sem origem, motivo ausente para não inspecionado/rejeitado/incerto e
// `validation-tool` sem `originRef` são recusados pelo próprio schema (if/then → required).

/** @param {unknown} v */
const isRecord = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/**
 * @param {unknown} report  o `report` do envelope (o que o agente enviou)
 * @param {string} [base]   prefixo do caminho JSON dos erros (ex.: "/report")
 * @returns {{ path: string, keyword: string, message: string }[]}
 */
export function inspectionLedgerErrors(report, base = "") {
  /** @type {{ path: string, keyword: string, message: string }[]} */
  const errors = [];
  if (!isRecord(report) || !isRecord(report.inspection)) return errors;
  const ins = report.inspection;
  const at = `${base}/inspection`;
  const list = (k) => (Array.isArray(ins[k]) ? ins[k] : []);
  const findingsCount = Array.isArray(report.findings) ? report.findings.length : 0;

  /** @param {string} k */
  const ids = (k) => {
    const seen = new Set();
    list(k).forEach((x, i) => {
      if (!isRecord(x) || typeof x.id !== "string") return;
      if (seen.has(x.id)) errors.push({ path: `${at}/${k}/${i}/id`, keyword: "x-unique", message: `id repetido em ${k}: ${x.id}` });
      seen.add(x.id);
    });
    return seen;
  };
  const states = ids("states");
  const regions = ids("regions");
  ids("items");
  ids("candidates");

  const stateRef = (path, id) => {
    if (typeof id === "string" && !states.has(id)) errors.push({ path, keyword: "x-unknown-state", message: `estado desconhecido: ${id}` });
  };

  list("regions").forEach((r, i) => {
    if (!isRecord(r) || !Array.isArray(r.states)) return;
    r.states.forEach((s, j) => stateRef(`${at}/regions/${i}/states/${j}`, s));
  });
  list("states").forEach((s, i) => {
    if (!isRecord(s) || !Array.isArray(s.recipe) || s.recipe.length === 0) return;
    if (!isRecord(s.recipe[0]) || s.recipe[0].action !== "load") {
      errors.push({ path: `${at}/states/${i}/recipe/0/action`, keyword: "x-recipe-from-load", message: "a receita começa no carregamento da página (`load`)" });
    }
  });
  list("items").forEach((it, i) => {
    if (!isRecord(it)) return;
    stateRef(`${at}/items/${i}/state`, it.state);
    if (typeof it.region === "string" && !regions.has(it.region)) {
      errors.push({ path: `${at}/items/${i}/region`, keyword: "x-unknown-region", message: `região desconhecida: ${it.region}` });
    }
  });
  list("candidates").forEach((c, i) => {
    if (!isRecord(c)) return;
    stateRef(`${at}/candidates/${i}/state`, c.state);
    const links = Array.isArray(c.findings) ? c.findings : [];
    links.forEach((n, j) => {
      if (typeof n === "number" && n >= findingsCount) {
        errors.push({ path: `${at}/candidates/${i}/findings/${j}`, keyword: "x-unknown-finding", message: `achado ${n} não existe (o relatório tem ${findingsCount})` });
      }
    });
    if (c.decision === "accepted" && links.length === 0) {
      errors.push({ path: `${at}/candidates/${i}/findings`, keyword: "x-accepted-without-finding", message: "candidato aceito precisa apontar o achado que originou" });
    }
    if (c.decision === "rejected" && links.length > 0) {
      errors.push({ path: `${at}/candidates/${i}/findings`, keyword: "x-rejected-with-finding", message: "candidato rejeitado não aponta achado enviado" });
    }
  });

  const clausePairs = new Set();
  list("clauses").forEach((c, i) => {
    if (!isRecord(c)) return;
    const pair = JSON.stringify([c.ref, c.state]);
    if (clausePairs.has(pair)) errors.push({ path: `${at}/clauses/${i}`, keyword: "x-unique", message: `cláusula repetida no mesmo estado: ${c.ref} em ${c.state}` });
    clausePairs.add(pair);
    stateRef(`${at}/clauses/${i}/state`, c.state);
    const links = Array.isArray(c.findings) ? c.findings : [];
    links.forEach((n, j) => {
      if (typeof n === "number" && n >= findingsCount) {
        errors.push({ path: `${at}/clauses/${i}/findings/${j}`, keyword: "x-unknown-finding", message: `achado ${n} não existe (o relatório tem ${findingsCount})` });
      }
    });
    if (c.status === "violada" && links.length === 0) {
      errors.push({ path: `${at}/clauses/${i}/findings`, keyword: "x-violated-without-finding", message: "cláusula violada precisa apontar o achado que a registra" });
    }
    if (c.status !== "violada" && links.length > 0) {
      errors.push({ path: `${at}/clauses/${i}/findings`, keyword: "x-finding-without-violation", message: `cláusula ${c.status} não aponta achado enviado` });
    }
  });

  if (ins.completion === "complete") {
    const gaps = [
      ...list("regions").filter((r) => isRecord(r) && r.status !== "inspected").map((r) => `região ${r.id} (${r.status})`),
      ...list("states").filter((s) => isRecord(s) && isRecord(s.arrival) && s.arrival.status === "not-reached").map((s) => `estado ${s.id} não alcançado`),
    ];
    if (gaps.length) {
      errors.push({ path: `${at}/completion`, keyword: "x-complete-with-gaps", message: `declarado completo com lacunas: ${gaps.slice(0, 5).join("; ")}` });
    }
  }
  return errors;
}
