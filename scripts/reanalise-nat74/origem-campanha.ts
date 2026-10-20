/**
 * Revisão §8, passo 6 (protocolo NAT-78 §8.6; plano de revisão 19/10, entrega 5): ORIGEM MEDIDA (D-129) para campanha v2
 * NOVA. Sem modelo. Para cada cartão julgado como violação na passada congelada, mede nos bytes congelados QUEM ESCREVE o
 * elemento de cada sujeito (template/script da aplicação × script do DS em execução × interior de web component do DS ×
 * folha oficial do DS que a página não sobrescreve) e se o EXEMPLO OFICIAL do DS da versão usada traz o mesmo padrão.
 *
 *   npm run revisao:origem -- medir --passada PASSADA --site SITE_CONGELADO --ds PACOTE_DS [--ds OUTRO ...] --saida PASTA_NOVA
 *       [--analise DIR ...]
 *     → PASTA_NOVA/{origem.json, origem.json.sha256, origem.md}
 *   npm run revisao:origem -- sujeitos --sujeitos SUJEITOS.json --referencia REF.json (--site SITE | --ala ALA --prefixo /x/)
 *       --ds PACOTE_DS [--ds ...] --saida PASTA_NOVA
 *     → o mesmo, para sujeitos declarados à mão (prova de aplicabilidade numa tela sem cartões; nunca entra em recálculo)
 *
 * MÉTODO (fixado aqui antes de aplicar; versão em ORIGEM_VERSAO):
 * - Estado: o sujeito é a chave canônica resolvida na cena do pacote (`1280x900` = última parada do plano; `WxH@parada`);
 *   a página congelada é servida por este processo (só 127.0.0.1, tudo o mais abortado), levada à parada pelos passos do
 *   `setup` da referência (`runSetupSteps`, a mesma semântica do pacote) e a chave tem de resolver em exatamente um nó.
 * - Autoria em execução (origem-sonda.ts): a pilha de quem CRIOU o nó e de quem ESCREVEU cada atributo. O quadro que
 *   decide é o primeiro com endereço fora da sonda. Ele é do DS quando cai numa REGIÃO DS dos bytes servidos: a chamada UMD
 *   inteira (analisador do TypeScript) cujo cabeçalho declara o nome UMD de um arquivo do pacote DS (`core`,
 *   `webcomponents`) e cujo texto contém ≥ 5 marcas do pacote (nomes `BR…` / etiquetas `br-…` do próprio arquivo), ou um
 *   arquivo servido com o mesmo sha256 de um arquivo do pacote. Fora disso, é da página (aplicação e as bibliotecas que
 *   ela escolheu). Nó sem registro de criação veio do HTML estático do documento (página).
 * - Folha (CDP `CSS.getMatchedStylesForNode`): a declaração vencedora de cada propriedade alegada; ela é do DS quando o
 *   seletor casado (normalizado) e a declaração (mesmo valor normalizado) existem numa folha do pacote DS; seletor do DS com
 *   valor diferente → indeterminado; folha do navegador → ninguém escreveu (vale quem controla o elemento); `var(--x)`
 *   leva junto a autoria de `--x`. Interior de shadow root aberto por código do DS → DS (R1).
 * - O que a alegação nomeia (`tracosDaAlegacao`, tabela fixa, só por palavras literais do texto observado/esperado e do id
 *   da regra): atributos (`aria-*`, role, tabindex, alt, title, for, id…) e grupos de CSS (borda, cor, fundo, contorno,
 *   sombra, raio, opacidade; contraste sem grupo → cor + fundo; foco → `:focus`/`:focus-visible` forçados). Sem nada
 *   nomeado, valem a criação do nó e os atributos de acessibilidade presentes.
 * - Dono de um atributo: a página, se ela escreveu o valor final (R2: o que está literalmente nos bytes da página
 *   prevalece); senão o DS, se ele escreveu o valor final; sem escrita registrada, quem criou o nó (o atributo veio com a
 *   criação, ou a AUSÊNCIA é de quem controla o elemento, R3).
 * - Regras (as do NAT-73, origem-relato.md §1): R1 tudo do DS → `ds-entregue`; R2/R3 tudo da página → `pagina`, ou
 *   `pagina-copiando-exemplo-ds` quando o exemplo oficial do componente do DS (dist/components/<c>/examples.html do pacote,
 *   renderizado com o core-init da própria versão) tem um elemento de mesma assinatura com os mesmos valores nos traços
 *   alegados; R4 autoria composta (DS e página nos traços alegados) → `indeterminada`. Medida que falta (chave não
 *   resolvida, quadro sem endereço, valor do DS diferente) → `indeterminada` com o motivo, nunca palpite. Cartão: todos os
 *   sujeitos com a mesma origem → ela; página × cópia → `pagina`; o resto → `indeterminada` (R4).
 * - Cegueira: lê só os cartões (sujeitos, cena, regra, texto observado/esperado) e a passada pelo sha256; não lê braço,
 *   execução nem proveniência de execução, e não grava braço. O resultado é posterior à passada: nenhum juiz o vê.
 *
 * A aplicação à passada (`aplicarOrigem`) usa a própria derivação da ingestão (`derivarClasse` com `origemMedida`): a
 * violação passa a `violacao-pagina` / `violacao-ds` / `violacao-origem-indeterminada` pela origem medida; origem DS tira o
 * crédito do vínculo (P3/R5 da política 1.2.0: "a referência só tem unidades de origem página"). Quem usa: o recálculo
 * (`--origem`) e o estrato 4 do §8.4.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer, type Server } from "node:http";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from "playwright";
import ts from "typescript";
import type { FlowSetupStep } from "../../types";
import { openPage, runSetupSteps, segmentosDasParadas, temNavegacao, type StateCheckpoint } from "../anchors";
import { createSiteServer, loadSite, resolveSitePath, type LoadedSite } from "../measurement-surface";
import type { SemanticPackage } from "../semantic-flow";
import { EVAL, TCC, jsonTexto, ordenar, posix, sha } from "./comum";
import { derivarClasse, type Derivado } from "./e14-comum";
import { contextoDe } from "./e14-ingerir";
import { ELEMENTO, LEITURA, RESOLVER, SONDA_INICIAL } from "./origem-sonda";
import { gravarImutavel, lerArgs, lerPassada, type Passada } from "./revisao-campanha";

export const ORIGEM_VERSAO = "nat78-origem-medida-1.1.0";
export const FORMATO_ORIGEM = "nat78-origem-1.0.0";
export type Origem = "pagina" | "pagina-copiando-exemplo-ds" | "ds-entregue" | "indeterminada";
export type Dono = "ds" | "pagina" | "indeterminado";
const CLASSES_VIOLACAO = new Set(["violacao-pagina", "violacao-ds", "violacao-origem-indeterminada"]);
const lerTexto = (p: string) => readFileSync(p, "utf8").replace(/^﻿/, "");

// ───────────────────────────────────────────────────────────────── o que a alegação nomeia (tabela fixa)

export interface Tracos {
  atributos: string[]; css: string[]; pseudo: ("before" | "after")[]; foco: boolean; nomeados: boolean;
  /** Atributos cuja AUSÊNCIA a alegação afirma ("sem X", "não tem X", "nem X"…): só esses contam como ausência no exemplo. */
  ausentes: string[];
  /** A alegação fala de nome acessível: o nome calculado (árvore de acessibilidade) entra na comparação com o exemplo. */
  nome: boolean;
  /** Grupos de CSS nomeados mas descartados: a alegação nomeia atributo e a regra citada não é de apresentação. */
  cssDescartado: string[];
}

/** Atributos nomeados LITERALMENTE no texto (nunca por sinônimo nem pelo id da regra). */
export const ATRIBUTOS_LITERAIS: readonly { re: RegExp; attr: string | null }[] = [
  { re: /\baria-[a-z]+\b/g, attr: null },
  { re: /\brole\b/i, attr: "role" },
  { re: /\btabindex\b/i, attr: "tabindex" },
  { re: /\balt\b/i, attr: "alt" },
  { re: /\btitle\b/i, attr: "title" },
  { re: /\bfor\s*=|atributo for\b|\bsem (?:o )?for\b|\bhtmlFor\b|<label for\b|\bfor\)/i, attr: "for" },
  { re: /(?<![-#.\w])id\b(?![-\w])/i, attr: "id" },
  { re: /(?<!-)\bhidden\b/i, attr: "hidden" },
  { re: /\blang\b/i, attr: "lang" },
  { re: /\bhref\b/i, attr: "href" },
  { re: /\bplaceholder\b/i, attr: "placeholder" },
  { re: /\baccesskey\b/i, attr: "accesskey" },
];
/** Grupos de CSS nomeados no texto. */
export const GRUPOS_CSS: readonly { id: string; re: RegExp; props: string[] }[] = [
  { id: "borda", re: /\bbordas?\b|\bborder(?!-radius)\b/i, props: ["border-top-color"] },
  { id: "raio", re: /\braio\b|radius|arredondad/i, props: ["border-top-left-radius"] },
  { id: "contorno", re: /\boutline\b|contorno de foco|indicador de foco|indicador visível de foco/i, props: ["outline-style", "outline-width", "outline-color"] },
  { id: "sombra", re: /box-shadow|\bsombra\b/i, props: ["box-shadow"] },
  { id: "opacidade", re: /opacidade|\bopacity\b/i, props: ["opacity"] },
  { id: "fundo", re: /\bbackground\b|background-color|cor de fundo|\bfundo\b/i, props: ["background-color"] },
  { id: "cor", re: /(?<![-\w])color\s*:|cor do texto|\bcor\b(?! de fundo)/i, props: ["color"] },
];
const CONTRASTE = /contraste|contrast|(?:^|[^\d.])1\.4\.(?:3|6|11)\b/i;
const FOCO = /\bfoco\b|\bfocus\b|focus-visible|(?:^|[^\d.])2\.4\.(?:7|11|13)\b/i;
const FOCO_VISIVEL = /indicador de foco|foco visível|focus-visible|(?:^|[^\d.])2\.4\.(?:7|11|13)\b/i;
/** Regra citada de apresentação: contraste e uso de cor (1.4.x), foco visível (2.4.7/11/13), token/cor/tipografia/espaçamento do DS. */
const REGRA_DE_APRESENTACAO = /(?:^|[^\d.])1\.4\.\d+\b|contrast|(?:^|[^\d.])2\.4\.(?:7|11|13)\b|focus|token|\bcolor\b|\bcor\b|typograph|tipograf|spacing|espaç/i;
const NEGACAO = String.raw`(?:\bsem|\bnem|\bn[ãa]o\s+t[eê]m|\bn[ãa]o\s+tem|\bn[ãa]o\s+h[áa]|\bfalta(?:m)?|\baus[eê]ncia\s+de|\bwithout|\bmissing|\bno)`;
const NOME = /nome acess[ií]vel|sem nome|nome calculado|accessible name|discernible text|n[ãa]o t[eê]m? nome|nome vazio/i;
const escRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A alegação afirma a AUSÊNCIA do atributo: negação seguida (em até 3 itens de lista) do nome, ou "<attr> ausente/vazio". */
export const alegaAusencia = (t: string, a: string): boolean =>
  new RegExp(String.raw`${NEGACAO}\s+(?:o\s+|a\s+|um\s+|atributo\s+|attribute\s+)?(?:[\w-]+\s*(?:,|/|\bou\b|\bnem\b|\be\b)\s*){0,3}${escRe(a)}\b|${escRe(a)}\s+(?:ausente|vazio|missing)`, "i").test(t);

export function tracosDaAlegacao(texto: string, regra: string | null): Tracos {
  const t = texto ?? "";
  const atributos = new Set<string>();
  for (const a of ATRIBUTOS_LITERAIS) {
    if (a.attr === null) for (const m of t.matchAll(a.re)) atributos.add(m[0].toLowerCase());
    else if (a.re.test(t)) atributos.add(a.attr);
  }
  const css = new Set<string>();
  const grupos: string[] = [];
  for (const g of GRUPOS_CSS) if (g.re.test(t)) { grupos.push(g.id); for (const p of g.props) css.add(p); }
  const comRegra = `${t} ${regra ?? ""}`;
  if (!css.size && CONTRASTE.test(comRegra)) { css.add("color"); css.add("background-color"); grupos.push("contraste"); }
  if (!css.size && FOCO_VISIVEL.test(comRegra)) { for (const p of ["outline-style", "outline-width", "outline-color", "box-shadow"]) css.add(p); grupos.push("foco-visivel"); }
  let cssDescartado: string[] = [];
  if (atributos.size && css.size && !REGRA_DE_APRESENTACAO.test(regra ?? "")) { cssDescartado = grupos; css.clear(); }
  const pseudo: ("before" | "after")[] = [];
  if (css.size && /::?before\b/i.test(t)) pseudo.push("before");
  if (css.size && /::?after\b/i.test(t)) pseudo.push("after");
  const foco = css.size > 0 && FOCO.test(comRegra);
  const ausentes = [...atributos].filter(a => alegaAusencia(t, a)).sort();
  const nome = NOME.test(t) || [...atributos].some(a => ["aria-label", "aria-labelledby", "alt", "title", "for"].includes(a));
  return { atributos: [...atributos].sort(), css: [...css].sort(), pseudo, foco, nomeados: atributos.size + css.size > 0, ausentes, nome, cssDescartado };
}

/** Atributos de acessibilidade considerados quando a alegação não nomeia nada. */
export const ehAtributoA11y = (n: string) => /^(role|tabindex|alt|title|for|lang|hidden|inert|aria-[a-z]+)$/.test(n);
/** Atributos de texto livre: no exemplo, conta só presença/vazio, nunca o texto. */
const TEXTO_LIVRE = new Set(["aria-label", "aria-description", "aria-roledescription", "aria-placeholder", "aria-valuetext", "title", "alt", "placeholder", "id", "for", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "href", "lang"]);

// ───────────────────────────────────────────────────────────────── pacote do DS (bytes do pacote entregue)

export interface ArquivoPacote { rel: string; sha256: string; nomeUmd: string | null; marcas: string[] }
export interface PacoteDS {
  nome: string; versao: string; dir: string; packageJsonSha256: string;
  js: ArquivoPacote[]; css: { rel: string; sha256: string }[];
  /** seletor normalizado → propriedade → valores normalizados declarados nas folhas do pacote. */
  indice: Map<string, Map<string, Set<string>>>; classes: Set<string>; componentes: string[];
}

const SHORTHANDS: Record<string, string[]> = {
  "border-top-color": ["border", "border-top", "border-color"], "border-top-style": ["border", "border-top", "border-style"],
  "border-top-width": ["border", "border-top", "border-width"], "border-top-left-radius": ["border-radius"],
  "outline-style": ["outline"], "outline-width": ["outline"], "outline-color": ["outline"], "background-color": ["background"],
};
const PROPS_HERDADAS = new Set(["color"]);
export const normSeletor = (s: string): string => s.trim().toLowerCase()
  .replace(/::(before|after|placeholder|marker|selection|first-line|first-letter)\b/g, ":$1")
  .replace(/\s*([>+~,])\s*/g, "$1").replace(/\s+/g, " ").replace(/"/g, "'");
/** Cor hexadecimal → rgb()/rgba() (o CDP devolve a declaração em rgb; a folha do pacote pode estar em hex). */
const hexParaRgb = (h: string): string => {
  let x = h.slice(1);
  if (x.length === 3 || x.length === 4) x = [...x].map(c => c + c).join("");
  const n = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16));
  if (x.length === 8) { const a = Math.round(parseInt(x.slice(6, 8), 16) / 255 * 1000) / 1000; return a === 1 ? `rgb(${n.join(",")})` : `rgba(${n.join(",")},${a})`; }
  return `rgb(${n.join(",")})`;
};
export const normValor = (v: string): string => v.trim().toLowerCase().replace(/\s*!\s*important$/, "").replace(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/g, hexParaRgb)
  .replace(/\s*([,()/])\s*/g, "$1").replace(/\s+/g, " ").replace(/"/g, "'").replace(/rgba\(([^,]+,[^,]+,[^,]+),1\)/g, "rgb($1)");

/** Separa no nível de topo (fora de parênteses, colchetes e aspas). */
function separarTopo(s: string, sep: string): string[] {
  const out: string[] = []; let prof = 0, q: string | null = null, ini = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c; else if (c === "(" || c === "[") prof++; else if (c === ")" || c === "]") prof--;
    else if (c === sep && prof === 0) { out.push(s.slice(ini, i)); ini = i + 1; }
  }
  out.push(s.slice(ini));
  return out;
}

/** Índice das regras de estilo de uma folha (atravessa @media/@supports/@layer/@container; pula as outras @-regras). */
export function indexarCss(texto: string, indice: Map<string, Map<string, Set<string>>> = new Map(), classes: Set<string> = new Set()): { indice: typeof indice; classes: Set<string> } {
  const t = texto.replace(/\/\*[\s\S]*?\*\//g, "");
  const bloco = (ini: number, fim: number): void => {
    let i = ini;
    while (i < fim) {
      // prelúdio até a próxima { (fora de aspas)
      let j = i, q: string | null = null;
      while (j < fim) { const c = t[j]; if (q) { if (c === "\\") j++; else if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === "{" || c === ";") break; j++; }
      if (j >= fim) return;
      if (t[j] === ";") { i = j + 1; continue; }
      const pre = t.slice(i, j).trim();
      // fim do bloco equilibrado
      let k = j + 1, prof = 1; q = null;
      while (k < fim && prof > 0) { const c = t[k]; if (q) { if (c === "\\") k++; else if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === "{") prof++; else if (c === "}") prof--; k++; }
      const corpo = [j + 1, k - 1] as const;
      if (pre.startsWith("@")) { if (/^@(media|supports|layer|container|document)\b/i.test(pre)) bloco(corpo[0], corpo[1]); }
      else if (pre) {
        const decls = separarTopo(t.slice(corpo[0], corpo[1]), ";").map(d => { const p = d.indexOf(":"); return p < 0 ? null : [d.slice(0, p).trim().toLowerCase(), normValor(d.slice(p + 1))] as const; }).filter((x): x is readonly [string, string] => !!x && !!x[0]);
        for (const sel of separarTopo(pre, ",")) {
          const s = normSeletor(sel);
          if (!s) continue;
          for (const m of s.matchAll(/\.([a-z_][\w-]*)/gi)) classes.add(m[1]);
          let porProp = indice.get(s); if (!porProp) { porProp = new Map(); indice.set(s, porProp); }
          for (const [p, v] of decls) { let vs = porProp.get(p); if (!vs) { vs = new Set(); porProp.set(p, vs); } vs.add(v); }
        }
      }
      i = k;
    }
  };
  bloco(0, t.length);
  return { indice, classes };
}

const listar = (d: string): string[] => readdirSync(d).flatMap(f => { const a = join(d, f); return statSync(a).isDirectory() ? listar(a) : [a]; });

/** Lê um pacote do DS instalado (pasta com package.json e dist/). Só JS/CSS de topo da dist e os exemplos de componentes. */
export function lerPacoteDS(dirArg: string): PacoteDS {
  const dir = resolve(dirArg);
  const pjAbs = join(dir, "package.json");
  if (!existsSync(pjAbs)) throw new Error(`--ds ${dir}: sem package.json (é a pasta do pacote instalado, ex.: node_modules/@govbr-ds/core)`);
  const pjTxt = readFileSync(pjAbs);
  const pj = JSON.parse(pjTxt.toString("utf8")) as { name: string; version: string };
  if (!/^@govbr-ds\//.test(pj.name)) throw new Error(`--ds ${dir}: pacote ${pj.name} não é do gov.br DS`);
  const dist = join(dir, "dist");
  if (!existsSync(dist)) throw new Error(`--ds ${dir}: sem dist/`);
  const js: ArquivoPacote[] = [], css: { rel: string; sha256: string }[] = [];
  const idx = { indice: new Map<string, Map<string, Set<string>>>(), classes: new Set<string>() };
  for (const f of readdirSync(dist).sort()) {
    const abs = join(dist, f);
    if (!statSync(abs).isFile()) continue;
    if (/\.js$/.test(f)) {
      const b = readFileSync(abs), t = b.toString("utf8");
      const cab = t.slice(0, 2000);
      const nome = /exports\[\s*["'`]([\w$-]+)["'`]\s*\]/.exec(cab)?.[1] ?? /define\(\s*["'`]([\w$-]+)["'`]/.exec(cab)?.[1] ?? null;
      const marcas = new Set<string>();
      for (const m of t.matchAll(/\bBR[A-Z][A-Za-z]{2,}\b/g)) marcas.add(m[0]);
      for (const m of t.matchAll(/["'`](br-[a-z]+(?:-[a-z]+)*)["'`]/g)) marcas.add(m[1]);
      js.push({ rel: posix(relative(dir, abs)), sha256: sha(b), nomeUmd: nome, marcas: [...marcas].sort().slice(0, 400) });
    } else if (/\.css$/.test(f)) {
      const t = readFileSync(abs, "utf8");
      css.push({ rel: posix(relative(dir, abs)), sha256: sha(t) });
      indexarCss(t, idx.indice, idx.classes);
    }
  }
  const comps = existsSync(join(dist, "components")) ? readdirSync(join(dist, "components")).filter(c => existsSync(join(dist, "components", c, "examples.html"))).sort() : [];
  return { nome: pj.name, versao: pj.version, dir, packageJsonSha256: sha(pjTxt), js, css, indice: idx.indice, classes: idx.classes, componentes: comps };
}

// ───────────────────────────────────────────────────────────────── regiões DS nos bytes servidos

export interface RegiaoDS { inicio: number; fim: number; pacote: string; versao: string; nomeUmd: string; marcas: number; sha256: string; modo: "umd" | "arquivo-identico" }

/** Regiões do DS num arquivo JS servido: chamadas UMD com o nome UMD e ≥ 5 marcas de um arquivo do pacote; ou arquivo idêntico. */
export function regioesDS(texto: string, pacotes: PacoteDS[]): RegiaoDS[] {
  const s = sha(texto);
  for (const p of pacotes) for (const f of p.js) if (f.sha256 === s) return [{ inicio: 0, fim: texto.length, pacote: p.nome, versao: p.versao, nomeUmd: f.nomeUmd ?? "", marcas: f.marcas.length, sha256: s, modo: "arquivo-identico" }];
  const nomes = new Map<string, { p: PacoteDS; marcas: Set<string> }[]>();
  for (const p of pacotes) for (const f of p.js) if (f.nomeUmd) { const l = nomes.get(f.nomeUmd) ?? []; l.push({ p, marcas: new Set(f.marcas) }); nomes.set(f.nomeUmd, l); }
  if (!nomes.size || !/define/.test(texto)) return [];
  const sf = ts.createSourceFile("servido.js", texto, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  const out: RegiaoDS[] = [];
  const visitar = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      let e: ts.Expression = n.expression;
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      if ((ts.isFunctionExpression(e) || ts.isArrowFunction(e)) && e.parameters.length >= 2) {
        const cab = texto.slice(e.getStart(sf), e.end);
        if (cab.length < 1200 && /define/.test(cab)) {
          for (const [nome, ps] of nomes) {
            const re = new RegExp(`(?:define\\(\\s*["'\`]${nome}["'\`]|exports\\[\\s*["'\`]${nome}["'\`]\\s*\\]|exports\\.${nome}\\b)`);
            if (!re.test(cab)) continue;
            const corpo = texto.slice(n.getStart(sf), n.end);
            let melhor: { p: PacoteDS; k: number } | null = null;
            for (const { p, marcas } of ps) {
              let k = 0; for (const m of marcas) if (corpo.includes(m)) k++;
              if (k >= Math.min(5, marcas.size) && (!melhor || k > melhor.k)) melhor = { p, k };
            }
            if (melhor) { out.push({ inicio: n.getStart(sf), fim: n.end, pacote: melhor.p.nome, versao: melhor.p.versao, nomeUmd: nome, marcas: melhor.k, sha256: sha(corpo), modo: "umd" }); return; }
          }
        }
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return out.sort((a, b) => a.inicio - b.inicio);
}

// ───────────────────────────────────────────────────────────────── quadros da pilha → dono

export interface Quadro { funcao: string | null; url: string; linha: number; coluna: number }
export function lerQuadro(l: string): Quadro | null {
  const m = /^at (?:(?:async )?(.*?) \()?(.+?):(\d+):(\d+)\)?$/.exec(l.trim());
  if (!m || !/^https?:\/\//.test(m[2])) return null;
  return { funcao: m[1] ?? null, url: m[2], linha: Number(m[3]), coluna: Number(m[4]) };
}

export interface Autoria { dono: Dono; motivo: string; quadro: { funcao: string | null; arquivo: string; linha: number; coluna: number; offset: number } | null; regiao: { pacote: string; versao: string; nomeUmd: string; sha256: string; modo: string } | null }

/** Resolve servido: caminho do site → bytes; e cache das regiões por arquivo. */
export interface Servido { origem: string; arquivo: (caminho: string) => { texto: string; sha256: string } | null; regioes: Map<string, RegiaoDS[]>; pacotes: PacoteDS[] }

export function autoriaDaPilha(pilha: string[] | null | undefined, sv: Servido): Autoria {
  if (!pilha) return { dono: "pagina", motivo: "sem registro de criação: HTML estático do documento (parser)", quadro: null, regiao: null };
  const q = pilha.map(lerQuadro).find((x): x is Quadro => !!x);
  if (!q) return { dono: "indeterminado", motivo: `pilha sem quadro com endereço (${pilha.slice(0, 2).join(" | ") || "vazia"})`, quadro: null, regiao: null };
  const u = new URL(q.url);
  if (u.origin !== sv.origem) return { dono: "indeterminado", motivo: `quadro fora do site servido (${u.origin})`, quadro: null, regiao: null };
  const caminho = decodeURIComponent(u.pathname);
  const f = sv.arquivo(caminho);
  if (!f) return { dono: "indeterminado", motivo: `quadro em ${caminho}, fora dos bytes congelados`, quadro: null, regiao: null };
  let rs = sv.regioes.get(caminho);
  if (!rs) { rs = regioesDS(f.texto, sv.pacotes); sv.regioes.set(caminho, rs); }
  let off = 0, l = 1;
  for (let i = 0; i < f.texto.length && l < q.linha; i++) if (f.texto.charCodeAt(i) === 10) { l++; off = i + 1; }
  off += q.coluna - 1;
  const quadro = { funcao: q.funcao, arquivo: caminho, linha: q.linha, coluna: q.coluna, offset: off };
  const r = rs.find(x => off >= x.inicio && off < x.fim);
  if (r) return { dono: "ds", motivo: `script do DS em execução (${r.pacote}@${r.versao}, região UMD "${r.nomeUmd}" ${r.modo})`, quadro, regiao: { pacote: r.pacote, versao: r.versao, nomeUmd: r.nomeUmd, sha256: r.sha256, modo: r.modo } };
  return { dono: "pagina", motivo: "script da aplicação (fora das regiões do DS)", quadro, regiao: null };
}

// ───────────────────────────────────────────────────────────────── decisão (puras)

export interface Escrita { valor: string | null; pilha: string[] }
export interface Traco { traco: string; tipo: "atributo" | "css"; valor: string | null; dono: Dono; como: string; autoria?: Autoria | null; evidencia?: Record<string, unknown> }

/** Dono de um atributo: R2 (a página escreveu o valor final) > DS escreveu o valor final > última escrita > quem criou o nó (R3). */
export function donoDoAtributo(nome: string, atual: string | null, escritas: Escrita[] | undefined, criador: Autoria, sv: Servido): Traco {
  if (!escritas?.length) return { traco: nome, tipo: "atributo", valor: atual, dono: criador.dono, como: atual === null ? "ausente, sem escrita: de quem controla o elemento (R3)" : "veio com a criação do nó", autoria: criador };
  const comFinal = escritas.filter(e => e.valor === atual).map(e => ({ e, a: autoriaDaPilha(e.pilha, sv) }));
  const pag = comFinal.find(x => x.a.dono === "pagina");
  if (pag) return { traco: nome, tipo: "atributo", valor: atual, dono: "pagina", como: "a página escreveu o valor final (R2)", autoria: pag.a };
  const ds = comFinal.find(x => x.a.dono === "ds");
  if (ds) return { traco: nome, tipo: "atributo", valor: atual, dono: "ds", como: "o DS escreveu o valor final", autoria: ds.a };
  if (comFinal.length) return { traco: nome, tipo: "atributo", valor: atual, dono: "indeterminado", como: `escrita do valor final sem autoria: ${comFinal[0].a.motivo}`, autoria: comFinal[0].a };
  const ult = autoriaDaPilha(escritas[escritas.length - 1].pilha, sv);
  return { traco: nome, tipo: "atributo", valor: atual, dono: ult.dono, como: "última escrita (valor registrado difere do final)", autoria: ult };
}

export interface MedidaSujeito {
  chave: string; seletor?: string; cena: string; parada: string | null; ok: boolean; motivo: string | null; rotulo?: string;
  criacao?: Autoria & { tipo: string }; sombra?: { hospedeiro: string; modo: string; autoria: Autoria } | null;
  tracos?: Traco[]; nomeCalculado?: string | null; componente?: string | null; exemplo?: Exemplo | null;
  origem: Origem; regra: string; porque: string;
}
export interface Exemplo { pacote: string; versao: string; componente: string; arquivo: string; sha256: string; assinatura: string[]; candidatos: number; mesmoPadrao: boolean | null; diferencas: string[] }

/** R1–R4 sobre os traços de um sujeito (o exemplo só decide entre página e cópia do exemplo). */
export function decidirSujeito(m: { criacao: Autoria; sombra: { autoria: Autoria } | null; tracos: Traco[]; exemplo: Exemplo | null }): { origem: Origem; regra: string; porque: string } {
  if (m.sombra && m.sombra.autoria.dono === "ds") return { origem: "ds-entregue", regra: "R1", porque: "interior de shadow root aberto por código do DS" };
  if (m.sombra && m.sombra.autoria.dono === "indeterminado") return { origem: "indeterminada", regra: "medida", porque: `shadow root sem autoria: ${m.sombra.autoria.motivo}` };
  const donos = new Set(m.tracos.map(t => t.dono));
  const ind = m.tracos.filter(t => t.dono === "indeterminado");
  if (ind.length) return { origem: "indeterminada", regra: "medida", porque: `traço sem autoria medida: ${ind.map(t => `${t.traco} (${t.como})`).join("; ")}` };
  if (donos.has("ds") && donos.has("pagina")) return { origem: "indeterminada", regra: "R4", porque: `autoria composta: DS escreve ${m.tracos.filter(t => t.dono === "ds").map(t => t.traco).join(", ")}; a página, ${m.tracos.filter(t => t.dono === "pagina").map(t => t.traco).join(", ")}` };
  if (donos.has("ds")) return { origem: "ds-entregue", regra: "R1", porque: `o DS escreve ${m.tracos.map(t => t.traco).join(", ")}` };
  const ausencia = m.tracos.every(t => t.valor === null);
  const regra = ausencia ? "R3" : "R2";
  if (m.exemplo?.mesmoPadrao) return { origem: "pagina-copiando-exemplo-ds", regra, porque: `a página escreve ${m.tracos.map(t => t.traco).join(", ")}; o exemplo oficial ${m.exemplo.componente} (${m.exemplo.versao}) tem o mesmo padrão` };
  return { origem: "pagina", regra, porque: `a página escreve ${m.tracos.map(t => t.traco).join(", ")}${m.exemplo ? (m.exemplo.mesmoPadrao === false ? `; o exemplo oficial ${m.exemplo.componente} difere (${m.exemplo.diferencas.slice(0, 3).join("; ")})` : m.exemplo.candidatos ? `; exemplo ${m.exemplo.componente}: nada comparável` : `; exemplo ${m.exemplo.componente} sem elemento correspondente`) : "; sem componente do DS na cadeia (exemplo não se aplica)"}` };
}

export function decidirCartao(origens: Origem[]): { origem: Origem; regra: string; porque: string } {
  if (!origens.length) return { origem: "indeterminada", regra: "medida", porque: "cartão sem sujeito medido" };
  const u = new Set(origens);
  if (u.size === 1) return { origem: origens[0], regra: "sujeitos", porque: `todos os ${origens.length} sujeito(s): ${origens[0]}` };
  if ([...u].every(o => o === "pagina" || o === "pagina-copiando-exemplo-ds")) return { origem: "pagina", regra: "sujeitos", porque: "sujeitos da página, parte copiando o exemplo do DS" };
  return { origem: "indeterminada", regra: "R4", porque: `sujeitos com origens diferentes: ${[...u].sort().join(", ")}` };
}

// ───────────────────────────────────────────────────────────────── CSS pelo CDP

interface CdpProp { name: string; value: string; important?: boolean; disabled?: boolean; parsedOk?: boolean }
interface CdpRegra { rule: { selectorList: { selectors: { text: string }[]; text: string }; origin: string; style: { cssProperties: CdpProp[] }; styleSheetId?: string }; matchingSelectors: number[] }
interface CdpCasados { inlineStyle?: { cssProperties: CdpProp[] }; matchedCSSRules?: CdpRegra[]; pseudoElements?: { pseudoType: string; matches: CdpRegra[] }[]; inherited?: { inlineStyle?: { cssProperties: CdpProp[] }; matchedCSSRules?: CdpRegra[] }[] }
type Vencedora = { fonte: "regra"; regra: CdpRegra; prop: CdpProp } | { fonte: "inline"; prop: CdpProp; nivel: number } | null;

function vencedora(prop: string, regras: CdpRegra[] | undefined, inline: CdpProp[] | undefined): Vencedora {
  const nomes = [prop, ...(SHORTHANDS[prop] ?? [])];
  const casa = (p: CdpProp) => nomes.includes(p.name) && !p.disabled && p.parsedOk !== false && p.value !== "";
  let normal: Vencedora = null, imp: Vencedora = null;
  for (const r of regras ?? []) for (const p of r.rule.style.cssProperties) if (casa(p)) { const v: Vencedora = { fonte: "regra", regra: r, prop: p }; if (p.important) imp = v; else normal = v; }
  for (const p of inline ?? []) if (casa(p)) { const v: Vencedora = { fonte: "inline", prop: p, nivel: 0 }; if (p.important) imp = v; else if (!imp) normal = v; }
  return imp ?? normal;
}

export interface ContextoCss { casados: CdpCasados; pseudo: "before" | "after" | null; criador: Autoria; escritas: Record<string, Escrita[]>; pacotes: PacoteDS[]; sv: Servido; folhas: Map<string, string> }

/** Dono de uma propriedade (ou propriedade personalizada) no elemento/pseudo; `var(--x)` arrasta a autoria de `--x`. */
export function donoCss(prop: string, cx: ContextoCss, prof = 0): { dono: Dono; como: string; declaracao: string | null; seletor: string | null; folha: string | null } {
  const m = cx.casados;
  const listas: { regras?: CdpRegra[]; inline?: CdpProp[]; nivel: number }[] = [];
  if (cx.pseudo) listas.push({ regras: m.pseudoElements?.find(p => p.pseudoType === cx.pseudo)?.matches, nivel: -1 });
  listas.push({ regras: m.matchedCSSRules, inline: m.inlineStyle?.cssProperties, nivel: 0 });
  const herda = PROPS_HERDADAS.has(prop) || prop.startsWith("--");
  if (herda) (m.inherited ?? []).forEach((h, i) => listas.push({ regras: h.matchedCSSRules, inline: h.inlineStyle?.cssProperties, nivel: i + 1 }));
  let v: Vencedora = null, nivel = 0;
  for (const l of listas) { v = vencedora(prop, l.regras, l.inline); if (v) { nivel = l.nivel; break; } if (!herda && l.nivel === 0 && cx.pseudo === null) break; }
  if (!v) return { dono: cx.criador.dono, como: `${prop} sem declaração de autor: de quem controla o elemento (R3)`, declaracao: null, seletor: null, folha: null };
  const decl = `${v.prop.name}: ${v.prop.value}${v.prop.important && !/!\s*important\s*$/i.test(v.prop.value) ? " !important" : ""}`;
  let base: { dono: Dono; como: string; seletor: string | null; folha: string | null };
  if (v.fonte === "inline") {
    const ws = [...(cx.escritas[`style:${v.prop.name}`] ?? []), ...(cx.escritas["style"] ?? [])];
    const a = nivel === 0 && ws.length ? autoriaDaPilha(ws[ws.length - 1].pilha, cx.sv) : cx.criador;
    base = { dono: nivel === 0 ? a.dono : "indeterminado", como: nivel === 0 ? `estilo inline (${ws.length ? a.motivo : "veio com a criação"})` : "estilo inline de ancestral (não medido)", seletor: null, folha: null };
  } else if (v.regra.rule.origin === "user-agent") {
    return { dono: cx.criador.dono, como: `${prop} só da folha do navegador: de quem controla o elemento (R3)`, declaracao: decl, seletor: v.regra.rule.selectorList.text, folha: "user-agent" };
  } else if (v.regra.rule.origin !== "regular") {
    base = { dono: "indeterminado", como: `regra de origem ${v.regra.rule.origin}`, seletor: v.regra.rule.selectorList.text, folha: null };
  } else {
    const sels = v.regra.matchingSelectors.map(i => v!.fonte === "regra" ? v!.regra.rule.selectorList.selectors[i]?.text ?? "" : "").filter(Boolean);
    const folha = v.regra.rule.styleSheetId ? cx.folhas.get(v.regra.rule.styleSheetId) ?? null : null;
    let achado: { p: PacoteDS; igual: boolean } | null = null;
    for (const p of cx.pacotes) for (const s of sels) {
      const porProp = p.indice.get(normSeletor(s));
      // A declaração vencedora pode ser a longa (`border-top-color`) que o CDP expande da abreviada da folha (`border-top`).
      const nomes = [v.prop.name, ...(SHORTHANDS[v.prop.name] ?? []), ...(SHORTHANDS[prop] ?? [])].filter((x, i, a) => a.indexOf(x) === i);
      const pares = nomes.map(nm => [nm, porProp?.get(nm)] as const).filter((x): x is readonly [string, Set<string>] => !!x[1]);
      if (!pares.length) continue;
      const alvo = normValor(v.prop.value);
      const igual = pares.some(([nm, vals]) => vals.has(alvo) || (nm !== v.prop.name && [...vals].some(x => ` ${x} `.includes(` ${alvo} `))));
      if (!achado || (igual && !achado.igual)) achado = { p, igual };
    }
    const selTxt = sels.join(", ") || v.regra.rule.selectorList.text;
    if (achado?.igual) base = { dono: "ds", como: `declaração da folha do DS (${achado.p.nome}@${achado.p.versao}) que a página não sobrescreve`, seletor: selTxt, folha };
    else if (achado) base = { dono: "indeterminado", como: `seletor da folha do DS (${achado.p.nome}@${achado.p.versao}) com valor diferente do pacote`, seletor: selTxt, folha };
    else base = { dono: "pagina", como: "folha da aplicação (seletor/declaração fora das folhas do DS)", seletor: selTxt, folha };
  }
  const vars = [...v.prop.value.matchAll(/var\(\s*(--[\w-]+)/g)].map(x => x[1]);
  if (!vars.length || prof >= 3) return { ...base, declaracao: decl };
  const subs = vars.map(x => ({ x, d: donoCss(x, cx, prof + 1) }));
  const donos = new Set([base.dono, ...subs.map(s => s.d.dono)]);
  const dono: Dono = donos.has("indeterminado") ? "indeterminado" : donos.has("pagina") ? "pagina" : "ds";
  return { ...base, dono, declaracao: decl, como: `${base.como}; ${subs.map(s => `${s.x}: ${s.d.dono} (${s.d.como}${s.d.seletor ? ` · ${s.d.seletor}` : ""})`).join("; ")}` };
}

// ───────────────────────────────────────────────────────────────── servidor e página

export interface Alvo { site: LoadedSite; rotulo: string; referencia: Referencia; referenciaSha256: string; pacotes: PacoteDS[] }
export interface Referencia { _meta: { url: string; waitFor?: string; setup?: FlowSetupStep[]; states?: StateCheckpoint[]; viewport?: { width: number; height: number }; ds?: string } }

export function paradaDaCena(ref: Referencia, cena: string): { viewport: { width: number; height: number }; parada: StateCheckpoint | null } {
  const m = /^(\d+)x(\d+)(?:@(.+))?$/.exec(cena);
  if (!m) throw new Error(`cena ${cena} fora do formato WxH[@parada]`);
  const viewport = { width: Number(m[1]), height: Number(m[2]) };
  const states = ref._meta.states ?? [];
  const setup = ref._meta.setup ?? [];
  if (m[3]) { const st = states.find(s => s.id === m[3]); if (!st) throw new Error(`cena ${cena}: parada ${m[3]} fora de _meta.states`); return { viewport, parada: st }; }
  if (temNavegacao(setup)) throw new Error(`cena ${cena} sem parada numa referência que navega (D-60: cena por segmento é WxH@parada)`);
  if (!states.length) return { viewport, parada: setup.length ? { id: "fim-do-setup", afterStep: setup.length } : null };
  const segs = segmentosDasParadas(setup, states);
  return { viewport, parada: segs[segs.length - 1].ultimo };
}

async function servir(handler: Server): Promise<{ origem: string; fechar: () => Promise<void> }> {
  await new Promise<void>(r => handler.listen(0, "127.0.0.1", () => r()));
  const ad = handler.address() as { port: number };
  return { origem: `http://127.0.0.1:${ad.port}`, fechar: () => new Promise<void>(r => handler.close(() => r())) };
}
const TIPOS: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".ico": "image/x-icon", ".map": "application/json" };
/** Serve a dist/ de um pacote DS (só leitura) para renderizar os exemplos oficiais. */
function servidorDist(dist: string): Server {
  return createServer((req, res) => {
    let p: string; try { p = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname); } catch { res.writeHead(400); res.end(); return; }
    const f = resolve(dist, "." + p);
    if (relative(dist, f).startsWith("..") || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TIPOS[extname(f)] ?? "application/octet-stream" }); res.end(readFileSync(f));
  });
}

async function contexto(browser: Browser, origem: string, viewport: { width: number; height: number }, sonda: boolean): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport, serviceWorkers: "block" });
  await ctx.route("**/*", r => (new URL(r.request().url()).origin === origem ? r.continue() : r.abort()));
  if (sonda) await ctx.addInitScript({ content: SONDA_INICIAL });
  return ctx;
}

async function nodeId(cdp: CDPSession, chave: string): Promise<number | null> {
  await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const r = await cdp.send("Runtime.evaluate", { expression: `(${ELEMENTO})(${JSON.stringify(chave)})` }) as { result: { objectId?: string; subtype?: string } };
  if (!r.result.objectId || r.result.subtype === "null") return null;
  const n = await cdp.send("DOM.requestNode", { objectId: r.result.objectId }) as { nodeId: number };
  return n.nodeId || null;
}

async function casadosCss(cdp: CDPSession, id: number, foco: boolean): Promise<CdpCasados> {
  if (foco) await cdp.send("CSS.forcePseudoState", { nodeId: id, forcedPseudoClasses: ["focus", "focus-visible", "focus-within"] });
  return await cdp.send("CSS.getMatchedStylesForNode", { nodeId: id }) as CdpCasados;
}

/** Valores computados (elemento e pseudos) para comparar com o exemplo. */
const COMPUTADOS = `function (props, pseudos) { const el = this; const out = {}; for (const ps of [null, ...pseudos]) { const cs = getComputedStyle(el, ps ? "::" + ps : null); for (const p of props) out[(ps ? ps + ":" : "") + p] = cs.getPropertyValue(p); } return out; }`;

interface Leitura { ok: boolean; motivo?: string; chaveMedida: string; rotulo: string; criacao: { tipo: string; pilha: string[] } | null; escritas: Record<string, Escrita[]>; atributos: Record<string, string>;
  hospedeiros: { etiqueta: string; chave: string; modo: string; sombra: { modo: string; pilha: string[] } | null }[]; cadeia: { etiqueta: string; classes: string[]; componentes: string[]; criacao?: { tipo: string; pilha: string[] } | null; escritasClasse?: Escrita[] | null }[] }

// ───────────────────────────────────────────────────────────────── exemplo oficial

/** Componente do DS na cadeia → pasta do exemplo; `flatpickr-calendar` é o calendário do datetimepicker (tabela fixa). */
const ALIAS_COMPONENTE: Record<string, string> = { "flatpickr-calendar": "datetimepicker" };
function componentesDaCadeia(cad: Leitura["cadeia"], pacotes: PacoteDS[]): { raiz: string; componente: string; pacote: PacoteDS; nivel: number }[] {
  const out: { raiz: string; componente: string; pacote: PacoteDS; nivel: number }[] = [];
  cad.forEach((c, nivel) => {
    for (const cls of c.componentes) {
      const comp = ALIAS_COMPONENTE[cls] ?? cls.replace(/^br-/, "");
      for (const p of pacotes) if (p.componentes.includes(comp) && !out.some(o => o.componente === comp)) out.push({ raiz: cls, componente: comp, pacote: p, nivel });
    }
  });
  return out;
}
const assinaturaDe = (cad: { etiqueta: string; classes: string[] }[], ds: Set<string>) => cad.map(c => [c.etiqueta, ...c.classes.filter(x => ds.has(x)).sort()].join("."));

const DESCENDENTES_EXEMPLO = `(raiz, prof, etiqueta, attrs) => {
  const out = [];
  for (const r of document.querySelectorAll("." + raiz)) {
    let nivel = [r];
    for (let i = 0; i < prof; i++) nivel = nivel.flatMap(e => Array.from(e.children));
    for (const e of nivel) {
      if (e.tagName.toLowerCase() !== etiqueta) continue;
      const cad = []; let x = e; for (let i = 0; i <= prof && x; i++) { cad.push({ etiqueta: x.tagName.toLowerCase(), classes: Array.from(x.classList) }); x = x.parentElement; }
      const a = {}; for (const n of attrs) a[n] = e.getAttribute(n);
      out.push({ cad, attrs: a, idx: out.length });
    }
  }
  window.__exemploCandidatos = out.map(() => null);
  return out;
}`;

class Exemplos {
  private abertos = new Map<string, { page: Page; ctx: BrowserContext; arquivo: string; sha256: string }>();
  private servidores = new Map<string, { origem: string; fechar: () => Promise<void> }>();
  usados: { pacote: string; versao: string; arquivo: string; sha256: string }[] = [];
  constructor(private browser: Browser) {}
  async pagina(p: PacoteDS, comp: string, viewport: { width: number; height: number }) {
    const k = `${p.nome}@${p.versao}|${comp}`;
    if (this.abertos.has(k)) return this.abertos.get(k)!;
    let sv = this.servidores.get(p.dir);
    if (!sv) { sv = await servir(servidorDist(join(p.dir, "dist"))); this.servidores.set(p.dir, sv); }
    const ctx = await contexto(this.browser, sv.origem, viewport, false);
    const page = await ctx.newPage();
    await page.goto(`${sv.origem}/components/${comp}/examples.html`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    const rel = `dist/components/${comp}/examples.html`;
    const e = { page, ctx, arquivo: `${p.nome}@${p.versao}/${rel}`, sha256: sha(readFileSync(join(p.dir, rel))) };
    this.abertos.set(k, e);
    if (!this.usados.some(u => u.arquivo === e.arquivo)) this.usados.push({ pacote: p.nome, versao: p.versao, arquivo: e.arquivo, sha256: e.sha256 });
    return e;
  }
  async fechar() { for (const e of this.abertos.values()) await e.ctx.close(); for (const s of this.servidores.values()) await s.fechar(); }
}

/** Nome calculado do nó (árvore de acessibilidade do Chromium); null se o nó não está na árvore. */
async function nomeAx(cdp: CDPSession, id: number): Promise<string | null> {
  const r = await cdp.send("Accessibility.getPartialAXTree", { nodeId: id, fetchRelatives: false }) as { nodes: { ignored?: boolean; name?: { value?: string } }[] };
  const n = r.nodes[0];
  return !n || n.ignored ? null : String(n.name?.value ?? "");
}

/**
 * Compara o sujeito com o exemplo oficial. Só entram traços COMPARÁVEIS: atributo presente no sujeito, atributo cuja
 * ausência a alegação afirma, propriedade de CSS alegada e, se a alegação fala de nome, o vazio do nome calculado. Sem
 * traço comparável → `mesmoPadrao: null` (nada a comparar; nunca "mesmo padrão" por vacuidade).
 */
async function compararExemplo(ex: Exemplos, lt: Leitura, tracos: Traco[], tr: Tracos, valoresSujeito: Record<string, string>, nomeSujeito: string | null, pacotes: PacoteDS[], viewport: { width: number; height: number }): Promise<Exemplo | null> {
  const comps = componentesDaCadeia(lt.cadeia, pacotes);
  if (!comps.length) return null;
  const attrs = tracos.filter(t => t.tipo === "atributo" && t.traco !== "(criação do nó)" && (t.valor !== null || tr.ausentes.includes(t.traco)));
  const ignorados = tracos.filter(t => t.tipo === "atributo" && t.traco !== "(criação do nó)" && !attrs.includes(t)).map(t => `${t.traco} (ausente, ausência não alegada)`);
  const cssProps = tr.css, pseudos = tr.pseudo;
  const comparaNome = tr.nome && nomeSujeito !== null;
  let primeiro: Exemplo | null = null;
  for (const c of comps) {
    const ds = c.pacote.classes;
    const assin = assinaturaDe(lt.cadeia.slice(0, c.nivel + 1), ds);
    const e = await ex.pagina(c.pacote, c.componente, viewport);
    const nomesAttr = attrs.map(t => t.traco);
    const cands = await e.page.evaluate(`(${DESCENDENTES_EXEMPLO})(${JSON.stringify(c.raiz)}, ${c.nivel}, ${JSON.stringify(lt.cadeia[0].etiqueta)}, ${JSON.stringify(nomesAttr)})`) as { cad: { etiqueta: string; classes: string[] }[]; attrs: Record<string, string | null>; idx: number }[];
    const iguais = cands.filter(k => JSON.stringify(assinaturaDe(k.cad, ds)) === JSON.stringify(assin));
    const base: Exemplo = { pacote: c.pacote.nome, versao: c.pacote.versao, componente: c.componente, arquivo: e.arquivo, sha256: e.sha256, assinatura: [...assin].reverse(), candidatos: iguais.length, mesmoPadrao: null, diferencas: ignorados };
    if (!iguais.length) { primeiro ??= base; continue; }
    if (!attrs.length && !cssProps.length && !comparaNome) return { ...base, diferencas: ["nenhum traço comparável (nada a comparar)", ...ignorados] };
    let melhor: string[] | null = null;
    const cdp = await e.page.context().newCDPSession(e.page);
    try {
      await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
      await cdp.send("DOM.getDocument", { depth: -1 });
      for (const k of iguais) {
        const dif: string[] = [];
        for (const t of attrs) {
          const a = t.valor, b = k.attrs[t.traco];
          const igual = TEXTO_LIVRE.has(t.traco) ? (a === null) === (b === null) && ((a ?? "").trim() === "") === ((b ?? "").trim() === "") : a === b;
          if (!igual) dif.push(`${t.traco}: página ${JSON.stringify(a)} × exemplo ${JSON.stringify(b)}`);
        }
        if (cssProps.length || comparaNome) {
          const r = await cdp.send("Runtime.evaluate", { expression: `(() => { const out = []; for (const r of document.querySelectorAll(${JSON.stringify("." + c.raiz)})) { let n = [r]; for (let i = 0; i < ${c.nivel}; i++) n = n.flatMap(e => Array.from(e.children)); for (const e of n) if (e.tagName.toLowerCase() === ${JSON.stringify(lt.cadeia[0].etiqueta)}) out.push(e); } return out[${k.idx}] || null; })()` }) as { result: { objectId?: string } };
          if (!r.result.objectId) { dif.push("elemento do exemplo não alcançado"); continue; }
          const { nodeId: nid } = await cdp.send("DOM.requestNode", { objectId: r.result.objectId }) as { nodeId: number };
          if (comparaNome) {
            const nb = await nomeAx(cdp, nid);
            if ((nomeSujeito!.trim() === "") !== ((nb ?? "").trim() === "")) dif.push(`nome calculado: página ${JSON.stringify(nomeSujeito)} × exemplo ${JSON.stringify(nb)}`);
          }
          if (cssProps.length) {
            if (tr.foco) await cdp.send("CSS.forcePseudoState", { nodeId: nid, forcedPseudoClasses: ["focus", "focus-visible", "focus-within"] });
            const v = await cdp.send("Runtime.callFunctionOn", { objectId: r.result.objectId, functionDeclaration: COMPUTADOS, arguments: [{ value: cssProps }, { value: pseudos }], returnByValue: true }) as { result: { value: Record<string, string> } };
            for (const [kk, vv] of Object.entries(v.result.value)) if (normValor(vv) !== normValor(valoresSujeito[kk] ?? "")) dif.push(`${kk}: página ${valoresSujeito[kk]} × exemplo ${vv}`);
            if (tr.foco) await cdp.send("CSS.forcePseudoState", { nodeId: nid, forcedPseudoClasses: [] });
          }
        }
        if (!melhor || dif.length < melhor.length) melhor = dif;
        if (!dif.length) break;
      }
    } finally { await cdp.detach(); }
    return { ...base, mesmoPadrao: melhor!.length === 0, diferencas: [...melhor!, ...ignorados] };
  }
  return primeiro;
}

// ───────────────────────────────────────────────────────────────── classe do DS escolhida pela página (D-129 × D-52)

/** Dono de uma classe na cadeia: quem escreveu o `class` com o token (página > DS); sem escrita, quem criou o nó. */
export function donoDaClasse(token: string, cadeia: Leitura["cadeia"], sv: Servido): { dono: Dono; como: string; nivel: number } | null {
  const nivel = cadeia.findIndex(c => c.classes.includes(token));
  if (nivel < 0) return null;
  const c = cadeia[nivel];
  const com = (c.escritasClasse ?? []).filter(e => (e.valor ?? "").split(/\s+/).includes(token)).map(e => autoriaDaPilha(e.pilha, sv));
  if (com.some(a => a.dono === "pagina")) return { dono: "pagina", como: `classe ${token} escrita pela página`, nivel };
  if (com.some(a => a.dono === "ds")) return { dono: "ds", como: `classe ${token} escrita pelo script do DS`, nivel };
  if (com.length) return { dono: "indeterminado", como: `classe ${token}: ${com[0].motivo}`, nivel };
  const cr = autoriaDaPilha(c.criacao?.pilha ?? null, sv);
  return { dono: cr.dono, como: `classe ${token} veio com a criação do nó (${cr.motivo})`, nivel };
}

/** Classes do seletor vencedor que estão na cadeia do sujeito. */
export const classesDoSeletor = (seletor: string | null, cadeia: { classes: string[] }[]): string[] =>
  [...new Set([...(seletor ?? "").matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]))].filter(c => cadeia.some(x => x.classes.includes(c))).sort();

/**
 * Regra da escolha (revisão do orquestrador, 20/10): declaração do DS que venceu por uma classe que a PÁGINA aplicou é
 * decisão da página, salvo quando essa classe faz parte da estrutura do componente como o exemplo oficial a usa (D-52).
 * - alguma classe do seletor escrita pelo script do DS, ou nenhuma classe escrita pela página → fica `ds` (o DS aplicou);
 * - exemplo oficial com elemento de MESMA assinatura (as mesmas classes do DS na mesma estrutura) → estrutura do componente:
 *   fica `ds` se o exemplo tem o mesmo valor; se não tem, `indeterminado` (a medida se contradiz);
 * - senão, a classe é escolha da página → `pagina`; e, se o exemplo do componente usa a mesma classe (mesma etiqueta) com o
 *   mesmo valor, o exemplo devolvido marca a cópia (`pagina-copiando-exemplo-ds`).
 * Muda os traços em lugar; devolve o exemplo da cópia quando há.
 */
async function escolhaDeClasse(ex: Exemplos, lt: Leitura, tracos: Traco[], tr: Tracos, valores: Record<string, string>, exemplo: Exemplo | null, pacotes: PacoteDS[], sv: Servido, viewport: { width: number; height: number }): Promise<Exemplo | null> {
  let copia: Exemplo | null = null;
  for (const t of tracos) {
    if (t.tipo !== "css" || t.dono !== "ds") continue;
    const sel = (t.evidencia?.seletor as string | null) ?? null;
    const toks = classesDoSeletor(sel, lt.cadeia).map(c => ({ c, d: donoDaClasse(c, lt.cadeia, sv)! }));
    const pag = toks.filter(x => x.d.dono === "pagina");
    const ev = { ...(t.evidencia ?? {}), classesDoSeletor: toks.map(x => ({ classe: x.c, dono: x.d.dono, como: x.d.como })) };
    if (toks.some(x => x.d.dono === "ds") || !pag.length) { t.evidencia = { ...ev, escolha: "classe aplicada pelo DS ou seletor sem classe da página: o DS escreve" }; continue; }
    if (exemplo && exemplo.candidatos > 0) {
      if (exemplo.mesmoPadrao === false) { t.dono = "indeterminado"; t.como = `${t.como}; classe(s) ${pag.map(x => x.c).join(", ")} na estrutura do exemplo ${exemplo.componente}, mas o exemplo não tem o mesmo valor`; }
      t.evidencia = { ...ev, escolha: `estrutura do componente: o exemplo oficial ${exemplo.componente} tem elemento de mesma assinatura (D-52)` };
      continue;
    }
    t.dono = "pagina";
    t.como = `classe(s) do DS ${pag.map(x => x.c).join(", ")} escolhida(s) pela página (declaração do DS: ${t.como})`;
    t.evidencia = { ...ev, escolha: "classe escolhida pela página: fora da estrutura do exemplo oficial (ou sem componente na cadeia)" };
    const noElemento = pag.map(x => x.c).filter(x => lt.cadeia[0].classes.includes(x));
    const c = noElemento.length ? await exemploComClasse(ex, lt, noElemento, tr, valores, pacotes, viewport) : null;
    if (c) { t.evidencia = { ...t.evidencia, exemploComAClasse: { arquivo: c.arquivo, mesmoPadrao: c.mesmoPadrao } }; if (c.mesmoPadrao && !copia) copia = c; }
  }
  return copia;
}

/** O exemplo do componente usa a(s) mesma(s) classe(s) na mesma etiqueta, com os mesmos valores nos traços de CSS? */
async function exemploComClasse(ex: Exemplos, lt: Leitura, classes: string[], tr: Tracos, valores: Record<string, string>, pacotes: PacoteDS[], viewport: { width: number; height: number }): Promise<Exemplo | null> {
  for (const c of componentesDaCadeia(lt.cadeia, pacotes)) {
    const e = await ex.pagina(c.pacote, c.componente, viewport);
    const seletor = `.${c.raiz} ${lt.cadeia[0].etiqueta}${classes.map(x => "." + x).join("")}`;
    const cdp = await e.page.context().newCDPSession(e.page);
    try {
      const n = await e.page.evaluate(`document.querySelectorAll(${JSON.stringify(seletor)}).length`) as number;
      const base: Exemplo = { pacote: c.pacote.nome, versao: c.pacote.versao, componente: c.componente, arquivo: e.arquivo, sha256: e.sha256, assinatura: [seletor], candidatos: n, mesmoPadrao: n ? false : null, diferencas: [] };
      if (!n) continue;
      let melhor: string[] | null = null;
      for (let i = 0; i < n; i++) {
        const h = await cdp.send("Runtime.evaluate", { expression: `document.querySelectorAll(${JSON.stringify(seletor)})[${i}]` }) as { result: { objectId?: string } };
        const v = await cdp.send("Runtime.callFunctionOn", { objectId: h.result.objectId!, functionDeclaration: COMPUTADOS, arguments: [{ value: tr.css }, { value: tr.pseudo }], returnByValue: true }) as { result: { value: Record<string, string> } };
        const dif = Object.entries(v.result.value).filter(([k, vv]) => normValor(vv) !== normValor(valores[k] ?? "")).map(([k, vv]) => `${k}: página ${valores[k]} × exemplo ${vv}`);
        if (!melhor || dif.length < melhor.length) melhor = dif;
        if (!dif.length) break;
      }
      return { ...base, mesmoPadrao: melhor!.length === 0, diferencas: melhor! };
    } finally { await cdp.detach(); }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────── medição

/** Sujeito: a chave canônica do pacote; só nos sujeitos declarados à mão (modo `sujeitos`), um seletor que tem de resolver em exatamente um nó. */
export interface ItemMedida { id: string; sujeitos: { chave?: string; seletor?: string; cena: string }[]; texto: string; regra: string | null }
export interface CartaoMedido { id: string; regra: string | null; tracos: Tracos; sujeitos: MedidaSujeito[]; origem: Origem; regraDeDecisao: string; porque: string }

export async function medir(alvo: Alvo, itens: ItemMedida[], o: { log?: (s: string) => void } = {}): Promise<{ cartoes: CartaoMedido[]; ambiente: Record<string, unknown>; exemplos: Exemplos["usados"]; regioes: Record<string, unknown[]> }> {
  const log = o.log ?? (() => {});
  const srv = await servir(createSiteServer(alvo.site));
  const browser = await chromium.launch();
  const versaoChromium = browser.version();
  const ex = new Exemplos(browser);
  const sv: Servido = {
    origem: srv.origem, pacotes: alvo.pacotes, regioes: new Map(),
    arquivo: (c: string) => { const f = resolveSitePath(alvo.site, c); return f ? { texto: f.body.toString("utf8"), sha256: sha(f.body) } : null; },
  };
  const porCena = new Map<string, { item: ItemMedida; i: number }[]>();
  for (const it of itens) it.sujeitos.forEach((s, i) => { const l = porCena.get(s.cena) ?? []; l.push({ item: it, i }); porCena.set(s.cena, l); });
  const medidas = new Map<string, MedidaSujeito>();
  const tracosDe = new Map(itens.map(it => [it.id, tracosDaAlegacao(it.texto, it.regra)]));
  try {
    for (const [cena, lista] of ordenar([...porCena], ([c]) => c)) {
      const { viewport, parada } = paradaDaCena(alvo.referencia, cena);
      const ctx = await contexto(browser, srv.origem, viewport, true);
      const erros: string[] = [];
      try {
        const page = await ctx.newPage();
        page.on("pageerror", e => erros.push(e.message));
        await openPage(page, srv.origem + alvo.referencia._meta.url, { waitFor: alvo.referencia._meta.waitFor });
        await runSetupSteps(page, (alvo.referencia._meta.setup ?? []).slice(0, parada?.afterStep ?? 0));
        await page.waitForTimeout(300);
        const cdp = await ctx.newCDPSession(page);
        const folhas = new Map<string, string>();
        cdp.on("CSS.styleSheetAdded", (e: { header: { styleSheetId: string; sourceURL: string } }) => { folhas.set(e.header.styleSheetId, e.header.sourceURL ? new URL(e.header.sourceURL, srv.origem).pathname : "(folha sem endereço: <style> ou construída)"); });
        await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
        log(`cena ${cena} (parada ${parada?.id ?? "inicial"}): ${lista.length} sujeito(s)`);
        for (const { item, i } of lista) {
          const s = item.sujeitos[i];
          const k = `${s.chave ?? `seletor:${s.seletor}`}|${cena}|${item.id}`;
          const tr = tracosDe.get(item.id)!;
          let chave = s.chave ?? null;
          if (chave === null) {
            const rs = await page.evaluate(`(${RESOLVER})(${JSON.stringify(s.seletor ?? "")})`) as { chave: string | null; n: number };
            if (rs.chave === null) { medidas.set(k, { chave: "", seletor: s.seletor, cena, parada: parada?.id ?? null, ok: false, motivo: `seletor resolve em ${rs.n} nó(s)`, origem: "indeterminada", regra: "medida", porque: `seletor não resolve em exatamente um nó (${rs.n})` }); continue; }
            chave = rs.chave;
          }
          const lt = await page.evaluate(`(${LEITURA})(${JSON.stringify(chave)})`) as Leitura;
          const base = { chave, ...(s.seletor ? { seletor: s.seletor } : {}), cena, parada: parada?.id ?? null };
          if (!lt.ok) { medidas.set(k, { ...base, ok: false, motivo: lt.motivo ?? "?", origem: "indeterminada", regra: "medida", porque: `sujeito não medido: ${lt.motivo}` }); continue; }
          if (lt.chaveMedida !== chave) { medidas.set(k, { ...base, ok: false, motivo: `a chave resolve em outro nó (${lt.chaveMedida})`, origem: "indeterminada", regra: "medida", porque: "chave não reproduz" }); continue; }
          const criador = { ...autoriaDaPilha(lt.criacao?.pilha ?? null, sv), tipo: lt.criacao?.tipo ?? "html-estatico" };
          const h = lt.hospedeiros[0];
          const sombra = h ? { hospedeiro: h.etiqueta, modo: h.modo, autoria: h.sombra ? autoriaDaPilha(h.sombra.pilha, sv) : { dono: "indeterminado" as Dono, motivo: "shadow root sem registro de attachShadow", quadro: null, regiao: null } } : null;
          const tracos: Traco[] = [];
          const nomesAttr = tr.nomeados ? tr.atributos : Object.keys(lt.atributos).filter(ehAtributoA11y).sort();
          for (const n of nomesAttr) tracos.push(donoDoAtributo(n, lt.atributos[n] ?? null, lt.escritas[n], criador, sv));
          let valoresSujeito: Record<string, string> = {};
          if (tr.css.length) {
            const id = await nodeId(cdp, chave);
            if (!id) tracos.push({ traco: "css", tipo: "css", valor: null, dono: "indeterminado", como: "nó não alcançado pelo CDP" });
            else {
              const casados = await casadosCss(cdp, id, tr.foco);
              const r = await cdp.send("Runtime.evaluate", { expression: `(${ELEMENTO})(${JSON.stringify(chave)})` }) as { result: { objectId?: string } };
              const v = await cdp.send("Runtime.callFunctionOn", { objectId: r.result.objectId!, functionDeclaration: COMPUTADOS, arguments: [{ value: tr.css }, { value: tr.pseudo }], returnByValue: true }) as { result: { value: Record<string, string> } };
              valoresSujeito = v.result.value;
              for (const ps of tr.pseudo.length ? tr.pseudo : [null]) for (const p of tr.css) {
                const d = donoCss(p, { casados, pseudo: ps, criador, escritas: lt.escritas, pacotes: alvo.pacotes, sv, folhas });
                tracos.push({ traco: `${ps ? `::${ps} ` : ""}${p}`, tipo: "css", valor: valoresSujeito[(ps ? ps + ":" : "") + p] ?? null, dono: d.dono, como: d.como, evidencia: { declaracao: d.declaracao, seletor: d.seletor, folha: d.folha, focoForcado: tr.foco } });
              }
              if (tr.foco) await cdp.send("CSS.forcePseudoState", { nodeId: id, forcedPseudoClasses: [] });
            }
          }
          if (!tr.nomeados) tracos.unshift({ traco: "(criação do nó)", tipo: "atributo", valor: "criado", dono: criador.dono, como: criador.motivo, autoria: criador });
          let nomeCalculado: string | null = null;
          if (tr.nome) { const id = await nodeId(cdp, chave); nomeCalculado = id ? await nomeAx(cdp, id) : null; }
          let exemplo = sombra?.autoria.dono === "ds" ? null : await compararExemplo(ex, lt, tracos, tr, valoresSujeito, nomeCalculado, alvo.pacotes, viewport);
          if (!sombra || sombra.autoria.dono !== "ds") {
            const esc = await escolhaDeClasse(ex, lt, tracos, tr, valoresSujeito, exemplo, alvo.pacotes, sv, viewport);
            if (esc) exemplo = esc;
          }
          const d = decidirSujeito({ criacao: criador, sombra, tracos, exemplo });
          medidas.set(k, { ...base, ok: true, motivo: null, rotulo: lt.rotulo, criacao: criador, sombra, tracos, nomeCalculado, componente: exemplo?.componente ?? null, exemplo, ...d });
        }
        await cdp.detach();
      } finally { await ctx.close(); }
      if (erros.length) log(`  erros da página na cena ${cena}: ${erros.slice(0, 3).join(" | ")}`);
    }
  } finally { await ex.fechar(); await browser.close(); await srv.fechar(); }
  const cartoes: CartaoMedido[] = itens.map(it => {
    const sujeitos = it.sujeitos.map(s => medidas.get(`${s.chave ?? `seletor:${s.seletor}`}|${s.cena}|${it.id}`)!);
    const d = decidirCartao(sujeitos.map(s => s.origem));
    return { id: it.id, regra: it.regra, tracos: tracosDe.get(it.id)!, sujeitos, origem: d.origem, regraDeDecisao: d.regra, porque: d.porque };
  });
  const regioes: Record<string, unknown[]> = {};
  for (const [c, rs] of ordenar([...sv.regioes], ([x]) => x)) if (rs.length) regioes[c] = rs.map(r => ({ inicio: r.inicio, fim: r.fim, pacote: r.pacote, versao: r.versao, nomeUmd: r.nomeUmd, marcas: r.marcas, sha256: r.sha256, modo: r.modo, arquivoSha256: sv.arquivo(c)!.sha256 }));
  return { cartoes, ambiente: { playwright: (createRequire(import.meta.url)("playwright/package.json") as { version: string }).version, chromium: versaoChromium, headless: true, viewportDasCenas: [...porCena.keys()].sort() }, exemplos: ex.usados, regioes };
}

// ───────────────────────────────────────────────────────────────── passada → itens; documento; aplicação

/** Cartões a medir: os julgados como violação na passada (origem só se aplica a violação, política §2). */
export function itensDaPassada(p: Passada): { itens: ItemMedida[]; pulados: { id: string; classe: string }[] } {
  const itens: ItemMedida[] = [], pulados: { id: string; classe: string }[] = [];
  for (const it of p.itens) {
    const j = p.julgados.get(it.id)!;
    if (!CLASSES_VIOLACAO.has(j.derivado.classe)) { pulados.push({ id: it.id, classe: j.derivado.classe }); continue; }
    const card = p.card.get(`${it.par}|${it.cardIdOriginal}`)!;
    const sujeitos = card.subjects.filter(s => s.key !== null).map(s => ({ chave: s.key!, cena: s.scene ?? card.scene }));
    itens.push({ id: it.id, sujeitos, texto: [card.observed ?? card.description ?? "", card.expected ?? ""].join("\n"), regra: card.rule ?? null });
  }
  return { itens: ordenar(itens, x => x.id), pulados: ordenar(pulados, x => x.id) };
}

const scriptsDoMetodo = () => Object.fromEntries(["scripts/reanalise-nat74/origem-campanha.ts", "scripts/reanalise-nat74/origem-sonda.ts", "scripts/anchors.ts", "scripts/measurement-surface.ts"]
  .map(f => [f, sha(readFileSync(join(EVAL, f)))]));
const relTccOuAbs = (abs: string) => { const r = relative(TCC, abs); return r.startsWith("..") || isAbsolute(r) ? posix(abs) : posix(r); };

export function regrasDoMetodo(): Record<string, unknown> {
  return {
    R1: "o que viola é escrito pelo script do DS em execução, no shadow root de web component do DS, ou por declaração da folha oficial do DS que a página não sobrescreve, aplicada pelo DS ou pela estrutura do componente como o exemplo oficial a usa (D-52) → ds-entregue",
    R1escolha: "declaração do DS que vence por classe do DS que a PÁGINA aplicou fora da estrutura do exemplo oficial (classe utilitária, variante, ou sem componente na cadeia) é escolha da página → pagina; pagina-copiando-exemplo-ds se o exemplo do componente usa a mesma classe, na mesma etiqueta, com o mesmo valor",
    R2: "o que viola é escrito pela página (template, JSX, script ou CSS da aplicação; a escrita da página com o valor final prevalece) → pagina; pagina-copiando-exemplo-ds se o exemplo oficial do componente, na versão usada, tem o mesmo padrão",
    R3: "ausência (atributo/declaração que falta): de quem controla (cria) o elemento; elemento da página com a mesma ausência no exemplo → pagina-copiando-exemplo-ds",
    R4: "autoria composta nos traços alegados (DS e página) → indeterminada",
    medida: "medida que falta ou se contradiz (chave não resolvida, quadro sem endereço, seletor do DS com valor diferente) → indeterminada com o motivo",
    cartao: "todos os sujeitos com a mesma origem → ela; página e cópia do exemplo → pagina; o resto → indeterminada (R4)",
    tracos: { atributosLiterais: ATRIBUTOS_LITERAIS.map(a => ({ re: String(a.re), attr: a.attr })), gruposCss: GRUPOS_CSS.map(g => ({ id: g.id, re: String(g.re), props: g.props })),
      contrasteSemGrupo: String(CONTRASTE), focoVisivelSemGrupo: String(FOCO_VISIVEL), focoForcado: String(FOCO), semNada: "criação do nó + atributos de acessibilidade presentes" },
    regioesDS: "chamada UMD (analisador do TypeScript) com o nome UMD de um arquivo do pacote no cabeçalho e ≥ 5 marcas (BR…/br-…) do arquivo no corpo, ou arquivo servido com o sha256 de um arquivo do pacote",
    folhaDoDS: "seletor casado normalizado e declaração (mesmo valor normalizado) presentes numa folha da dist do pacote",
    exemplo: "dist/components/<componente>/examples.html do pacote (componente = classe/etiqueta br-* da cadeia; flatpickr-calendar → datetimepicker), elemento de mesma assinatura (etiqueta + classes do DS desde a raiz do componente), mesmos valores nos traços alegados (texto livre: só presença/vazio)",
  };
}

export function documento(o: { modo: "passada" | "sujeitos"; passada: Passada | null; alvo: Alvo; siteDir: string; itensPulados: { id: string; classe: string }[]; r: Awaited<ReturnType<typeof medir>>; entradasExtras: Record<string, string>; aplicacao: AplicacaoOrigem[] | null; aviso: string | null }): Record<string, unknown> {
  const porOrigem: Record<string, number> = {};
  for (const c of o.r.cartoes) porOrigem[c.origem] = (porOrigem[c.origem] ?? 0) + 1;
  return {
    formato: FORMATO_ORIGEM, versao: ORIGEM_VERSAO, modo: o.modo, aviso: o.aviso,
    passada: o.passada ? { nome: o.passada.nome, dir: relTccOuAbs(o.passada.dir), julgamentosSha256: o.passada.julgSha, chaveSha256: sha(o.passada.chaveTxt), campanha: o.passada.campanha.campaignId } : null,
    site: { dir: relTccOuAbs(o.siteDir), manifestSha256: o.alvo.site.manifestSha256, rotulo: o.alvo.rotulo, entrada: o.alvo.referencia._meta.url },
    referencia: { sha256: o.alvo.referenciaSha256, ds: o.alvo.referencia._meta.ds ?? null },
    pacotesDS: o.alvo.pacotes.map(p => ({ nome: p.nome, versao: p.versao, dir: relTccOuAbs(p.dir), packageJsonSha256: p.packageJsonSha256, js: p.js.map(f => ({ rel: f.rel, sha256: f.sha256, nomeUmd: f.nomeUmd })), css: p.css })),
    metodo: { regras: regrasDoMetodo(), scripts: scriptsDoMetodo(), ambiente: o.r.ambiente },
    regioesDS: o.r.regioes, exemplosUsados: o.r.exemplos, entradas: o.entradasExtras,
    resumo: { medidos: o.r.cartoes.length, porOrigem, pulados: o.itensPulados.length },
    pulados: o.itensPulados.map(x => ({ ...x, motivo: "sem violação na passada: a origem não se aplica (política, §2)" })),
    cartoes: o.r.cartoes,
    aplicacao: o.aplicacao,
  };
}

export interface AplicacaoOrigem { id: string; origemMedida: Origem; classeAntes: string; classeDepois: string; specAntes: string | null; creditoAntes: boolean; creditoDepois: boolean }
export interface DocOrigem { formato: string; versao: string; modo: string; passada: { nome: string; julgamentosSha256: string } | null; cartoes: { id: string; origem: Origem }[] }

const credita = (d: Pick<Derivado, "classe" | "spec" | "fundamentacao">) => d.fundamentacao !== null && !!d.spec && (d.classe === "violacao-pagina" || d.classe === "violacao-origem-indeterminada");

/**
 * Derivados da passada com a origem medida, pela MESMA derivação da ingestão. Confere antes que a derivação sem origem
 * reproduz o derivado gravado de todo cartão (senão para: a cópia não seria a da ingestão).
 */
export function aplicarOrigem(p: Passada, doc: DocOrigem | null): { derivados: Map<string, Derivado>; aplicacao: AplicacaoOrigem[] } {
  if (doc) {
    if (doc.formato !== FORMATO_ORIGEM) throw new Error(`origem: formato ${doc.formato} ≠ ${FORMATO_ORIGEM}`);
    if (doc.modo !== "passada" || !doc.passada) throw new Error("origem: documento de sujeitos sintéticos não se aplica a passada");
    if (doc.passada.julgamentosSha256 !== p.julgSha) throw new Error(`origem medida sobre outra passada (julgamentos ${doc.passada.julgamentosSha256.slice(0, 8)}… ≠ ${p.julgSha.slice(0, 8)}… de ${p.nome})`);
  }
  const med = new Map((doc?.cartoes ?? []).map(c => [c.id, c.origem]));
  for (const id of med.keys()) if (!p.item.has(id)) throw new Error(`origem: ${id} não é cartão de ${p.nome}`);
  const derivados = new Map<string, Derivado>(), aplicacao: AplicacaoOrigem[] = [];
  for (const it of p.itens) {
    const j = p.julgados.get(it.id)!, cego = p.cartao.get(it.id)!;
    const specs = p.referencias[cego.tela].defeitos.map(d => d.id);
    const ctx = contextoDe(cego, it, specs);
    const sem = derivarClasse(j.resposta, ctx);
    if (JSON.stringify(sem) !== JSON.stringify(j.derivado)) throw new Error(`${it.id}: a derivação não reproduz o derivado gravado na passada (deriva entre ingestão e origem)`);
    const o = med.get(it.id);
    if (!o) { derivados.set(it.id, j.derivado); continue; }
    const com = derivarClasse(j.resposta, { ...ctx, origemMedida: o });
    derivados.set(it.id, com);
    aplicacao.push({ id: it.id, origemMedida: o, classeAntes: j.derivado.classe, classeDepois: com.classe, specAntes: j.derivado.spec, creditoAntes: credita(j.derivado), creditoDepois: credita(com) });
  }
  return { derivados, aplicacao: ordenar(aplicacao, x => x.id) };
}

/** Lê e confere uma pasta de origem (origem.json + .sha256). */
export function lerOrigem(dir: string): { doc: DocOrigem & Record<string, unknown>; texto: string; sha256: string; arquivo: string } {
  const arquivo = join(resolve(dir), "origem.json");
  if (!existsSync(arquivo)) throw new Error(`--origem ${dir}: sem origem.json`);
  const texto = lerTexto(arquivo), s = sha(texto);
  const sAbs = join(resolve(dir), "origem.json.sha256");
  if (!existsSync(sAbs) || lerTexto(sAbs).trim().split(/\s+/)[0] !== s) throw new Error(`--origem ${dir}: origem.json não confere com origem.json.sha256`);
  return { doc: JSON.parse(texto), texto, sha256: s, arquivo };
}

export function origemMd(j: Record<string, unknown>): string {
  const cs = j.cartoes as CartaoMedido[];
  const ap = (j.aplicacao as AplicacaoOrigem[] | null) ?? [];
  const L = [`# Origem medida (D-129) — ${j.modo === "passada" ? `passada \`${(j.passada as { nome: string }).nome}\`` : "sujeitos declarados (aplicabilidade)"}`, ""];
  if (j.aviso) L.push(`> **${j.aviso}**`, "");
  const res = j.resumo as { medidos: number; porOrigem: Record<string, number>; pulados: number };
  L.push(`Método ${j.versao}, sem modelo. Medidos ${res.medidos} cartão(ões) (${Object.entries(res.porOrigem).sort().map(([k, v]) => `${k} ${v}`).join(", ")}); pulados ${res.pulados} (sem violação). Bytes: site ${(j.site as { manifestSha256: string }).manifestSha256.slice(0, 12)}…; pacotes ${(j.pacotesDS as { nome: string; versao: string }[]).map(p => `${p.nome}@${p.versao}`).join(", ")}.`, "");
  L.push("| cartão | regra citada | origem | regra | por quê | classe antes → depois |", "|---|---|---|---|---|---|");
  for (const c of cs) { const a = ap.find(x => x.id === c.id); L.push(`| ${c.id} | ${c.regra ?? "—"} | **${c.origem}** | ${c.regraDeDecisao} | ${c.porque.replace(/\|/g, "\\|").slice(0, 220)} | ${a ? `${a.classeAntes} → ${a.classeDepois}${a.creditoAntes !== a.creditoDepois ? ` (crédito ${a.creditoAntes ? "sai" : "entra"})` : ""}` : "—"} |`); }
  L.push("", "## Por sujeito", "");
  for (const c of cs) {
    L.push(`### ${c.id} — ${c.origem}`, "", `Traços: ${c.tracos.nomeados ? [...c.tracos.atributos, ...c.tracos.css.map(x => `css ${x}`)].join(", ") + (c.tracos.pseudo.length ? ` (pseudo ${c.tracos.pseudo.join(", ")})` : "") + (c.tracos.foco ? " (foco forçado)" : "") : "nenhum nomeado (criação + atributos de acessibilidade)"}.`, "");
    for (const s of c.sujeitos) {
      L.push(`- \`${s.chave || "(html)"}\` @ ${s.cena}${s.parada ? ` (${s.parada})` : ""}: **${s.origem}** (${s.regra}) — ${s.porque.replace(/\|/g, "\\|")}`);
      if (s.criacao) L.push(`  - criação: ${s.criacao.tipo}, ${s.criacao.dono} — ${s.criacao.motivo}${s.criacao.quadro ? ` · ${s.criacao.quadro.arquivo}:${s.criacao.quadro.linha}:${s.criacao.quadro.coluna}${s.criacao.quadro.funcao ? ` (${s.criacao.quadro.funcao})` : ""}` : ""}`);
      if (s.nomeCalculado !== undefined && s.nomeCalculado !== null) L.push(`  - nome calculado (árvore de acessibilidade): ${JSON.stringify(s.nomeCalculado)}`);
      if (s.sombra) L.push(`  - shadow root de <${s.sombra.hospedeiro}> (${s.sombra.modo}): ${s.sombra.autoria.dono} — ${s.sombra.autoria.motivo}`);
      for (const t of s.tracos ?? []) L.push(`  - ${t.traco} = ${JSON.stringify(t.valor)}: ${t.dono} — ${t.como}${t.autoria?.quadro ? ` · ${t.autoria.quadro.arquivo}:${t.autoria.quadro.linha}:${t.autoria.quadro.coluna}` : ""}${t.evidencia?.seletor ? ` · \`${t.evidencia.seletor}\` {${t.evidencia.declaracao}} em ${t.evidencia.folha}` : ""}`);
      if (s.exemplo) L.push(`  - exemplo oficial ${s.exemplo.arquivo} (sha256 ${s.exemplo.sha256.slice(0, 12)}…): ${s.exemplo.candidatos} elemento(s) de mesma assinatura; mesmo padrão: ${s.exemplo.mesmoPadrao === null ? "n/a" : s.exemplo.mesmoPadrao ? "sim" : `não (${s.exemplo.diferencas.slice(0, 3).join("; ")})`}`);
    }
    L.push("");
  }
  return L.join("\n");
}

// ───────────────────────────────────────────────────────────────── alvo (site congelado ou ala de SPA) e CLI

/** Ala congelada no corpus (pasta com manifesto.json `arquivos` sha256), servida sob `prefixo` como SPA (índice para rota sem extensão). */
export function carregarAla(dirArg: string, prefixo: string): LoadedSite {
  const dir = resolve(dirArg);
  const mTxt = lerTexto(join(dir, "manifesto.json"));
  const m = JSON.parse(mTxt) as { arquivos: Record<string, string> };
  if (!/^\/[\w-]+\/$/.test(prefixo)) throw new Error(`--prefixo ${prefixo}: forma /nome/`);
  const files = new Map<string, { body: Buffer; type: string }>(), lista: Record<string, string> = {};
  for (const [rel, s] of Object.entries(m.arquivos)) {
    const body = readFileSync(join(dir, rel));
    if (sha(body) !== s) throw new Error(`ala ${dir}: ${rel} difere do manifesto`);
    files.set(prefixo + rel, { body, type: TIPOS[extname(rel)] ?? "application/octet-stream" });
    lista[prefixo + rel] = s;
  }
  return { manifest: { version: `ala:${basename(dir)}`, entry: prefixo, sourceDist: dir, corpusCommit: null, corpusDirty: null, files: lista, spa: { prefixo, indice: `${prefixo}index.html` } } as LoadedSite["manifest"], manifestSha256: sha(mTxt), files };
}

/** Cada versão de pacote DS passada tem de constar da declaração de DS da tela (`_meta.ds`), quando ela declara versões. */
export function conferirVersoes(ref: Referencia, pacotes: PacoteDS[]): void {
  const decl = ref._meta.ds ?? "";
  const vs: string[] = [...(decl.match(/\d+\.\d+\.\d+/g) ?? [])];
  if (!vs.length) return;
  for (const p of pacotes) if (!vs.includes(p.versao)) throw new Error(`--ds ${p.nome}@${p.versao}: versão fora da declaração da tela (_meta.ds: "${decl}")`);
}

const USO = `uso:
  origem-campanha.ts medir --passada PASSADA --site SITE_CONGELADO --ds PACOTE_DS [--ds ...] --saida PASTA_NOVA [--analise DIR ...]
  origem-campanha.ts sujeitos --sujeitos ARQ.json --referencia REF.json (--site SITE | --ala ALA --prefixo /x/) --ds PACOTE_DS [--ds ...] --saida PASTA_NOVA`;

export async function executar(argv: string[]): Promise<number> {
  const a = lerArgs(argv, ["--passada", "--site", "--ala", "--prefixo", "--ds", "--saida", "--analise", "--sujeitos", "--referencia"], []);
  if ("erro" in a) { console.error(`RECUSADO: ${a.erro}\n${USO}`); return 1; }
  try {
    const um = (k: string, obrig = true): string | null => { const v = a.opts.get(k); if (!v?.length) { if (obrig) throw new Error(`falta ${k} (obrigatório; nunca há pasta padrão)`); return null; } if (v.length > 1) throw new Error(`${k} mais de uma vez`); return resolve(v[0]); };
    const [modo, ...resto] = a.modo;
    if (resto.length) throw new Error(`argumento solto: ${resto.join(" ")}`);
    if (modo !== "medir" && modo !== "sujeitos") throw new Error(`modo ${modo ?? "(nenhum)"}: medir | sujeitos`);
    const saida = um("--saida")!;
    if (existsSync(saida)) throw new Error(`--saida ${saida} já existe (a origem vai para uma pasta NOVA)`);
    const dsDirs = (a.opts.get("--ds") ?? []).map(x => resolve(x));
    if (!dsDirs.length) throw new Error("falta --ds (pasta do pacote DS instalado; uma por pacote usado pela tela)");
    const pacotes = dsDirs.map(lerPacoteDS);
    const extras: Record<string, string> = {};
    let alvo: Alvo, siteDir: string, passada: Passada | null = null, itens: ItemMedida[], pulados: { id: string; classe: string }[] = [], aviso: string | null = null;
    if (modo === "medir") {
      if (a.opts.has("--ala") || a.opts.has("--sujeitos") || a.opts.has("--referencia")) throw new Error("medir: só --passada, --site, --ds, --saida e --analise (a referência vem da análise)");
      passada = lerPassada(um("--passada")!, { analises: (a.opts.get("--analise") ?? []).map(x => resolve(x)) });
      const r = relative(passada.dir, saida); if (r === "" || (!r.startsWith("..") && !isAbsolute(r))) throw new Error("--saida não pode ficar dentro da passada");
      siteDir = um("--site")!;
      const site = loadSite(siteDir);
      const man = JSON.parse(passada.manifestoTxt) as { analises: { dir: string; packageSha256: string }[] };
      let ref: Referencia | null = null, refSha: string | null = null;
      for (const an of man.analises) {
        const abs = (a.opts.get("--analise") ?? []).map(x => resolve(x)).find(x => basename(x) === an.dir) ?? join(dirname(passada.dir), an.dir);
        const pkg = JSON.parse(lerTexto(join(abs, "revisao", "package.json"))) as SemanticPackage & { provenance: { site?: { manifestSha256?: string }; reference?: { sha256?: string } } };
        if (pkg.provenance.site?.manifestSha256 !== site.manifestSha256) throw new Error(`--site: manifesto ${site.manifestSha256.slice(0, 12)}… ≠ site do pacote de ${an.dir} (${String(pkg.provenance.site?.manifestSha256).slice(0, 12)}…)`);
        const rTxt = readFileSync(join(abs, "entradas", "referencia.json"));
        const rs = sha(rTxt);
        if (pkg.provenance.reference?.sha256 && pkg.provenance.reference.sha256 !== rs) throw new Error(`${an.dir}: entradas/referencia.json ≠ referência do pacote`);
        if (refSha && refSha !== rs) throw new Error("análises da passada com referências diferentes");
        ref = JSON.parse(rTxt.toString("utf8")); refSha = rs;
        extras[`${an.dir}/entradas/referencia.json`] = rs; extras[`${an.dir}/revisao/package.json`] = an.packageSha256;
      }
      Object.assign(extras, Object.fromEntries(Object.entries(passada.fontes).map(([k, v]) => [`${passada!.nome}/${k}`, v])));
      alvo = { site, rotulo: `site-manifest ${site.manifest.version}`, referencia: ref!, referenciaSha256: refSha!, pacotes };
      ({ itens, pulados } = itensDaPassada(passada));
      if (/^ensaio/.test(passada.campanha.campaignId)) aviso = "ENSAIO fora da amostra (§7.4): prova o caminho; nada daqui é resultado";
    } else {
      const refAbs = um("--referencia")!, refTxt = readFileSync(refAbs);
      const ref = JSON.parse(refTxt.toString("utf8")) as Referencia;
      const sitio = um("--site", false), ala = um("--ala", false);
      if (!!sitio === !!ala) throw new Error("sujeitos: exatamente um de --site / --ala");
      let site: LoadedSite;
      if (sitio) { site = loadSite(sitio); siteDir = sitio; }
      else { const pre = a.opts.get("--prefixo")?.[0]; if (!pre) throw new Error("--ala exige --prefixo"); site = carregarAla(ala!, pre); siteDir = ala!; }
      const sujAbs = um("--sujeitos")!, sujTxt = lerTexto(sujAbs);
      const suj = JSON.parse(sujTxt) as { formato: string; itens: ItemMedida[] };
      if (suj.formato !== "nat78-origem-sujeitos-1.0.0") throw new Error(`--sujeitos: formato ${suj.formato} ≠ nat78-origem-sujeitos-1.0.0`);
      itens = ordenar(suj.itens, x => x.id);
      extras[relTccOuAbs(refAbs)] = sha(refTxt); extras[relTccOuAbs(sujAbs)] = sha(sujTxt);
      alvo = { site, rotulo: site.manifest.version, referencia: ref, referenciaSha256: sha(refTxt), pacotes };
      aviso = "sujeitos declarados à mão (prova de aplicabilidade): não são cartões, não entram em recálculo";
    }
    conferirVersoes(alvo.referencia, pacotes);
    const r = await medir(alvo, itens, { log: s => console.error(s) });
    const aplicacao = passada ? aplicarOrigem(passada, { formato: FORMATO_ORIGEM, versao: ORIGEM_VERSAO, modo: "passada", passada: { nome: passada.nome, julgamentosSha256: passada.julgSha }, cartoes: r.cartoes.map(c => ({ id: c.id, origem: c.origem })) }).aplicacao : null;
    const doc = documento({ modo: modo === "medir" ? "passada" : "sujeitos", passada, alvo, siteDir: siteDir!, itensPulados: pulados, r, entradasExtras: extras, aplicacao, aviso });
    const jTxt = jsonTexto(doc);
    gravarImutavel(saida, [["origem.json", jTxt], ["origem.json.sha256", `${sha(jTxt)}  origem.json\n`], ["origem.md", origemMd(doc)]]);
    for (const c of r.cartoes) console.log(`${c.id}: ${c.origem} (${c.regraDeDecisao}) — ${c.porque.slice(0, 160)}`);
    console.log(`gravado em ${saida} (origem.json sha256 ${sha(jTxt)})`);
    return 0;
  } catch (e) { console.error(e instanceof Error ? e.message : e); return 1; }
}

if (process.argv[1] && /(?:^|[\\/])origem-campanha\.ts$/.test(process.argv[1])) executar(process.argv.slice(2)).then(c => process.exit(c));
