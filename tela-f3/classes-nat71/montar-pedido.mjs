/**
 * Tela F3 — pedido da classificação NAT-71 (protocolo NAT-78 § 5.3; NAT-71 § 3.1–3.2), no molde da D e da E.
 *
 * A D e a E não arquivaram o texto literal do pedido aos classificadores; o que ficou é o que cada classificador
 * registrou (`definicoes`, `referencia`, `referenciaSha256`) e o cabeçalho de `comparacao.md` ("cada um só com as
 * definições da NAT-71 §3.1–3.3 e as specs da referência …, sem a proposta do auditor (`_meta.classes`), sem ver o
 * outro, sem navegador e sem ferramenta"; na E, também a §5.3 do protocolo e, como leitura auxiliar, os critérios de
 * julgamento). Este pedido reproduz essas condições e o formato de saída dos arquivos `classificador-N.json`.
 *
 * Herança: as 13 specs naturais da F3 são as da referência 1.1.0 da D (conferido aqui: byte a byte, fora a âncora da D-14,
 * trocada só por seletor do mesmo elemento — tela-f3/montar-referencia.mjs), já classificadas
 * (tela-d/classes-nat71/classes-finais.json, sha256 3b8eff65…). Ver `heranca` em `pedido/LEIA.md` e em
 * `heranca-naturais.json`. Vão aos classificadores só as 12 semeadas. Molde: tela-f/classes-nat71/montar-pedido.mjs.
 * Uso: node tela-f3/classes-nat71/montar-pedido.mjs → pedido/ + heranca-naturais.json + cópia em .tmp-eval/tela-f3-nat71/pedido
 */
import { createHash } from "crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "../..");
const TW = join(RAIZ, "../../thesis-workspace/planejamento/atual");
const FORA = "F:/Dev Nath/TCC/.tmp-eval/tela-f3-nat71/pedido";
const sha = b => createHash("sha256").update(b).digest("hex");
const refBuf = readFileSync(join(RAIZ, "ground-truth-processos-f3.json")), ref = JSON.parse(refBuf);
const dBuf = readFileSync(join(RAIZ, "ground-truth-processos-1.1.0.json")), D = JSON.parse(dBuf);
const finBuf = readFileSync(join(RAIZ, "tela-d/classes-nat71/classes-finais.json")), fin = JSON.parse(finBuf);
const critBuf = readFileSync(join(RAIZ, "tela-f3/criterios-de-julgamento.json"));
const sem = ref._meta.estratos.semeado.specs, nat = ref._meta.estratos.natural.specs;

// herança: spec natural idêntica byte a byte à da D 1.1.0; a D-14 idêntica fora a âncora (registrada em _meta.estratos.natural.reancoradas)
const heranca = nat.map(id => {
  const f = ref.violations.find(v => v.id === id), d = D.violations.find(v => v.id === id), c = fin.specs.find(s => s.id === id);
  const reanc = ref._meta.estratos.natural.reancoradas?.[id];
  const semAncora = x => JSON.stringify({ ...x, anchor: null });
  const igual = JSON.stringify(f) === JSON.stringify(d);
  const igualForaAncora = !igual && !!reanc && reanc.antes === d.anchor && reanc.depois === f.anchor && semAncora(f) === semAncora(d);
  if (!igual && !igualForaAncora) throw new Error(`${id} não é idêntica à da D 1.1.0: não herda`);
  return { id, classe: c.classe, automatizabilidade: c.automatizabilidade, limitrofe: c.limitrofe, origem: `herdada de tela-d/classes-nat71/classes-finais.json (${c.origem})`,
    ...(igualForaAncora ? { diferencaDaD: `só a âncora (${d.anchor} → ${f.anchor}), mesmo elemento; descrição, rules e categories idênticas — a classe é do defeito, não do seletor (NAT-71 §3.1)` } : {}) };
});

// definições: NAT-71 §3.1–3.2 e protocolo §5.3, copiadas literalmente
const plano = readFileSync(join(TW, "plano-nat71-objetivos-evidencia-2026-10-13.md"), "utf8");
const def = plano.slice(plano.indexOf("### 3.1 Classes do **defeito**"), plano.indexOf("### 3.3 As famílias existentes"));
const prot = readFileSync(join(TW, "protocolo-nat78-estudo-complementar-CONGELADO-2026-11-16.md"), "utf8");
const i53 = prot.indexOf("### 5.3 Classes pré-registradas"); const p53 = prot.slice(i53, prot.indexOf("**Estado em 16/11:**", i53));
if (def.length < 1000 || p53.length < 200) throw new Error("trecho das definições não achado");

const specs = ref.violations.filter(v => sem.includes(v.id)).map(v => ({ id: v.id, state: v.state, anchor: v.anchor, scope: v.scope, expectedCount: v.expectedCount,
  ...(v.participantCount ? { participantCount: v.participantCount } : {}), rules: v.rules, categories: v.categories, ...(v.acceptance ? { acceptance: v.acceptance } : {}), description: v.description }));
const specsTxt = JSON.stringify({ origem: "ground-truth-processos-f3.json, tela F3 (processos), referência 1.0.0 — só as specs a classificar", referenciaSha256: sha(refBuf),
  estados: ref._meta.states.map(s => ({ id: s.id, note: s.note })), specs }, null, 1) + "\n";

const leia = `# Classificação de specs (NAT-71) — tela F3, processos

Você é um classificador independente. Classifique cada spec de \`specs.json\` por **classe do defeito**
(sintático, layout/visual, contextual/relacional, semântico) e por **nível de automatizabilidade** (a, b, c),
usando só as definições de \`definicoes.md\` (NAT-71 §3.1–3.2 e protocolo NAT-78 §5.3, copiadas literalmente).

## Condições (as mesmas das telas D e E)

- Leia só os arquivos desta pasta. Não abra navegador, página, repositório, ferramenta de validação nem nenhum
  outro arquivo; não procure outras classificações. Outro classificador faz o mesmo trabalho sem ver o seu.
- A classe é propriedade do defeito e do que é preciso observar para decidi-lo (§3.1), não de qual ferramenta o
  detectaria. O nível é um eixo separado (§3.2): **a** = há predicado implementado em ferramenta, com positivos e
  negativos que passam (diga qual ferramenta e qual regra, se for o caso); **b** = predicado determinístico
  escrevível, não implementado ou não testado; **c** = exige interpretação de significado.
- Uma spec pode ter mais de uma parte: classifique pela parte que a spec efetivamente cobra (§3.1, linha
  "Semântico"). Se ficar entre duas classes, escolha uma, marque \`limitrofe: true\` e diga entre quais e por quê.
- \`criterios-de-julgamento.json\` é leitura auxiliar (o que um juiz olha em cada spec); não muda as definições.

## Saída

Escreva \`classificador-<seu número>.json\` (o número vem no pedido que você recebeu) nesta pasta, no formato:

\`\`\`json
{
 "arquivo": "classificador-<n>",
 "referencia": "specs.json (tela F3, processos-f3 1.0.0)",
 "referenciaSha256": "${sha(refBuf)}",
 "definicoes": "<o que você leu: arquivos desta pasta>",
 "specs": [
  { "id": "F3-01", "classe": "sintático | layout/visual | contextual/relacional | semântico", "automatizabilidade": "a | b | c", "limitrofe": true, "motivo": "<uma a três frases, citando a definição>" }
 ]
}
\`\`\`

Uma entrada por spec, todas as ${specs.length} (${specs.map(s => s.id).join(", ")}).

## Herança (nota para quem monta o pedido; não muda a sua tarefa)

A referência da F3 tem também 13 specs naturais (D-01…D-14), idênticas às da referência 1.1.0 da tela D (byte a byte;
a D-14 só com outro seletor, a mesma troca da F2, para o mesmo elemento), que já têm classe final (duas classificações cegas e a decisão da autora, \`tela-d/classes-nat71/classes-finais.json\`).
O procedimento da D (§5.3) classifica o texto da spec, sem navegador e sem ferramenta: para uma spec idêntica, a
entrada da classificação é a mesma, e o procedimento não exige refazê-la. Por isso essas 13 herdam a classe final da D
(registrado em \`heranca-naturais.json\`, fora deste pedido) e só as 12 specs F3-01…F3-12 vêm a você.
`;

rmSync(join(AQUI, "pedido"), { recursive: true, force: true });
mkdirSync(join(AQUI, "pedido"), { recursive: true });
writeFileSync(join(AQUI, "pedido/LEIA.md"), leia);
writeFileSync(join(AQUI, "pedido/definicoes.md"), `# Definições (cópia literal)\n\nDe \`thesis-workspace/planejamento/atual/plano-nat71-objetivos-evidencia-2026-10-13.md\`:\n\n${def.trim()}\n\nDe \`thesis-workspace/planejamento/atual/protocolo-nat78-estudo-complementar-CONGELADO-2026-11-16.md\`:\n\n${p53.trim()}\n`);
writeFileSync(join(AQUI, "pedido/specs.json"), specsTxt);
writeFileSync(join(AQUI, "pedido/criterios-de-julgamento.json"), critBuf);
writeFileSync(join(AQUI, "heranca-naturais.json"), JSON.stringify({
  regra: "spec natural idêntica byte a byte à da referência 1.1.0 da D (ou idêntica fora a âncora, reancorada no mesmo elemento e registrada na referência) herda a classe final da D (ver pedido/LEIA.md › Herança)",
  referenciaF3: { arquivo: "ground-truth-processos-f3.json", sha256: sha(refBuf), status: "rascunho" },
  referenciaD: { arquivo: "ground-truth-processos-1.1.0.json", sha256: sha(dBuf) },
  classesFinaisD: { arquivo: "tela-d/classes-nat71/classes-finais.json", sha256: sha(finBuf) },
  identicas: heranca.length, specs: heranca,
}, null, 1) + "\n");
rmSync(FORA, { recursive: true, force: true });
mkdirSync(FORA, { recursive: true });
cpSync(join(AQUI, "pedido"), FORA, { recursive: true });
console.log(`pedido: ${specs.length} specs aos classificadores; ${heranca.length} herdadas; cópia em ${FORA}`);
