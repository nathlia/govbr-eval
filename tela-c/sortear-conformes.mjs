/**
 * Controles conformes da tela C (plano da C § 6; protocolo NAT-78 § 5.2: denominador da taxa de falso
 * alarme do agente). Sem modelo e sem detector.
 *
 * Regra (plano § 6, fixada antes): entram os pares (elemento × norma) medidos `conforme` (decisoes.json)
 * sobre normas que também têm unidade `viola` na tela ou sobre componentes do inventário; se passarem de
 * 12, sorteiam-se 12 com semente fixa gravada antes, preferindo um por tipo de componente do DS.
 * Decisões de elegibilidade declaradas pelo auditor ANTES do sorteio (e gravadas no arquivo):
 *  - fora o casco da aplicação (br-header, avatar, sign-in): é o mesmo das telas B e dos D-54..D-56, e o
 *    piso conta sem as unidades `exposto` (adendo § E) — controle no casco teria o mesmo problema;
 *  - fora linhas medidas sobre a página inteira (cores, fonte, lang, animações): o controle é (elemento ×
 *    norma), e a página não é um elemento;
 *  - fora pares cuja medida exige leitura de significado (uso do Checkbox, conteúdo do empty state);
 *  - fora pares cujo elemento é âncora de uma unidade ou objeto de uma escalada pendente (o campo do
 *    seletor, C-01; o Cancelar, C-02; os 8 campos obrigatórios, C-03; os campos com máscara, E-01; a
 *    lista do seletor, E-03/E-04; o form, E-02; a br-message, E-06; o "Exibir lista", E-07) — por isso
 *    os pares de campo usam só o "Complemento" (opcional, sem máscara; "Coordenadas" fica fora por ser
 *    alimentado pelo stub do mapa, adendo § C).
 * Sorteio: camada 1 = um item por tipo de componente do DS (ordem fixa de TIPOS), escolhido pela
 * semente; camada 2 = o restante, embaralhado pela mesma semente, até 12. PRNG mulberry32 sobre os
 * 4 primeiros bytes do sha256 da SEMENTE.
 *
 * Uso: node tela-c/sortear-conformes.mjs  → tela-c/conformes.json (e imprime o sha256)
 */
import { writeFileSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const SEMENTE = "tela-c/conformes 2026-10-18 (gravada antes do sorteio)";
export const TETO = 12;
const TIPOS = ["input", "checkbox", "radio", "button", "tab", "breadcrumb", "item", "list", "divider", "message", "estrutura"];

/** Pares elegíveis, na ordem do documento do primeiro elemento. `tipo` = componente do DS (ou estrutura). */
export const ELEGIVEIS = [
  { par: "breadcrumb-tab", tipo: "breadcrumb", state: "inicial", selector: "pnip-admin-form-empresa br-breadcrumb >>> a", count: 2, rules: ["govbr-3.7.0-accessibility-breadcrumb-992f162ca821"], medida: "links \"Home\" e \"Empresa\" do <br-breadcrumb>: tabIndex 0, alcançados por Tab real." },
  { par: "breadcrumb-li", tipo: "breadcrumb", state: "inicial", selector: "pnip-admin-form-empresa br-breadcrumb >>> li", count: 3, rules: ["govbr-3.7.0-accessibility-global-cf61b3eb3c71", "emag:1.7"], medida: "cada item do breadcrumb (Home, Empresa, Cadastrar empresa) é um <li> próprio; os links adjacentes não são separados só por espaço." },
  { par: "breadcrumb-orientacao", tipo: "breadcrumb", state: "inicial", selector: "pnip-admin-form-empresa br-breadcrumb", count: 1, rules: ["govbr-3.7.0-accessibility-global-75c11ccac582", "emag:3.4"], medida: "breadcrumb hierárquico presente; último item = \"Cadastrar empresa\" (localização atual)." },
  { par: "titulos-contraste", tipo: "estrutura", state: "inicial", selector: "pnip-admin-form-empresa h2", count: 2, rules: ["govbr-3.7.0-accessibility-global-cb09bc0c77c0", "emag:4.1", "wcag:1.4.3"], medida: "h2 \"Cadastrar empresa\" e \"Usuários\": #005ea2 sobre #fff = 6,72:1 (≥ 4,5:1; a norma tem a unidade C-07)." },
  { par: "input-rotulo", tipo: "input", state: "inicial", selector: "pnip-admin-form-empresa br-input[formcontrolname=complemento] >>> input", count: 1, rules: ["govbr-3.7.0-accessibility-global-b95c42b61ed3", "emag:6.2", "wcag:1.3.1", "govbr-3.7.0-accessibility-global-b5fad7ce076d"], medida: "campo \"Complemento\": <label for> associado no mesmo shadow root (labels.length = 1; nome acessível \"Complemento\"). A norma tem a unidade C-01." },
  { par: "input-tab", tipo: "input", state: "inicial", selector: "pnip-admin-form-empresa br-input[formcontrolname=complemento] >>> input", count: 1, rules: ["govbr-3.7.0-accessibility-input-6fe41e804955"], medida: "campo \"Complemento\" alcançado por Tab real, entre \"Número\" e \"Município\" (ordem do DOM)." },
  { par: "rotulo-contraste", tipo: "input", state: "inicial", selector: "pnip-admin-form-empresa br-input >>> label", count: 12, rules: ["govbr-3.7.0-accessibility-global-cb09bc0c77c0", "emag:4.1", "wcag:1.4.3"], medida: "rótulos dos 12 campos: #333 sobre #fff = 12,63:1." },
  { par: "input-acao", tipo: "input", state: "inicial", selector: "pnip-admin-form-empresa br-input[formcontrolname=cep] >>> button", count: 1, rules: ["govbr-3.7.0-component-input-3788829b08fe"], medida: "ação interna do CEP: button.br-button.small.circle (terciário, alta densidade), 32×32, border-radius 50%, ícone de lupa." },
  { par: "checkbox-rotulo", tipo: "checkbox", state: "inicial", selector: "pnip-admin-form-empresa br-checkbox >>> input", count: 1, rules: ["govbr-3.7.0-accessibility-global-b95c42b61ed3", "emag:6.2", "wcag:1.3.1", "govbr-3.7.0-accessibility-global-b5fad7ce076d"], medida: "checkbox do módulo com <label for> associado (labels.length = 1)." },
  { par: "checkbox-foco", tipo: "checkbox", state: "inicial", selector: "pnip-admin-form-empresa br-checkbox >>> input", count: 1, rules: ["govbr-3.7.0-accessibility-global-21fbcc2fe37b", "emag:4.4", "wcag:2.4.7"], medida: "com foco por Tab, o ::before do rótulo ganha box-shadow 0 0 0 2px rgb(194,133,12)." },
  { par: "abas-teclado", tipo: "tab", state: "inicial", selector: "pnip-admin-form-empresa .br-tab button", count: 2, rules: ["govbr-3.7.0-accessibility-tab-f1807d71dc5f"], medida: "as duas abas são <button> tabIndex 0; Enter ≡ clique (3/3, teste de estados)." },
  { par: "divisor", tipo: "divider", state: "inicial", selector: "pnip-admin-form-empresa br-divider", count: 2, rules: ["govbr-3.7.0-accessibility-divider-30bbcbf3a17c"], medida: "<br-divider> fora do Tab (tabIndex < 0) e span interno com papel none na árvore do Chromium." },
  { par: "mensagem-icone", tipo: "message", state: "inicial", selector: "pnip-admin-form-empresa .br-message .icon", count: 1, rules: ["govbr-3.7.0-component-message-66b01a712e67"], medida: "ícone semântico (fa-info-circle) à esquerda do conteúdo da br-message." },
  { par: "salvar-um-ponto", tipo: "button", state: "inicial", selector: "pnip-admin-form-empresa br-button[label=Salvar]", count: 1, rules: ["govbr-3.7.0-accessibility-global-79db88c7f55d", "emag:1.4", "wcag:2.4.3"], medida: "o hospedeiro do \"Salvar\" não tem tabindex (tabIndex -1): um só ponto de Tab, o <button> interno de nome \"Salvar\". A norma tem a unidade C-02 (o \"Cancelar\")." },
  { par: "adicionar-rotulo", tipo: "button", state: "inicial", selector: "pnip-admin-form-empresa button.br-button.primary", count: 1, rules: ["govbr-3.7.0-component-button-4d7b5f978df1"], medida: "\"Adicionar\": rótulo visível no próprio botão." },
  { par: "radio-rotulo", tipo: "radio", state: "lista-usuarios", selector: "br-select-pnip .br-radio input[type=radio]", count: 3, rules: ["govbr-3.7.0-accessibility-global-b95c42b61ed3", "emag:6.2", "wcag:1.3.1", "govbr-3.7.0-accessibility-global-b5fad7ce076d"], medida: "os 3 rádios da lista com <label for> associado (labels.length = 1)." },
  { par: "item-superficie", tipo: "item", state: "lista-usuarios", selector: "br-select-pnip .br-item", count: 3, rules: ["govbr-3.7.0-component-item-a6d29ea54434"], medida: "hover aplica gradiente em toda a superfície do br-item; clique perto da borda do item (fora do texto) escolhe a opção." },
  { par: "item-padding", tipo: "item", state: "lista-usuarios", selector: "br-select-pnip .br-item", count: 3, rules: ["govbr-3.7.0-component-item-a10751502b98"], medida: "padding computado 16px (--spacing-scale-2x) nos três br-item." },
];

const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export function sortear() {
  const rnd = mulberry32(parseInt(createHash("sha256").update(SEMENTE).digest("hex").slice(0, 8), 16));
  const restantes = [...ELEGIVEIS];
  const escolhidos = [];
  if (restantes.length <= TETO) return { escolhidos: restantes, camada1: [], sorteio: false };
  const camada1 = [];
  for (const t of TIPOS) {
    const do_tipo = restantes.filter(e => e.tipo === t);
    if (!do_tipo.length) continue;
    const e = do_tipo[Math.floor(rnd() * do_tipo.length)];
    escolhidos.push(e); camada1.push(e.par); restantes.splice(restantes.indexOf(e), 1);
  }
  while (escolhidos.length < TETO && restantes.length) escolhidos.push(restantes.splice(Math.floor(rnd() * restantes.length), 1)[0]);
  escolhidos.sort((a, b) => ELEGIVEIS.indexOf(a) - ELEGIVEIS.indexOf(b));
  return { escolhidos, camada1, sorteio: true };
}

if (process.argv[1] && process.argv[1].endsWith("sortear-conformes.mjs")) {
  const { escolhidos, camada1, sorteio } = sortear();
  const itens = escolhidos.map((e, i) => ({ id: `K-${String(i + 1).padStart(2, "0")}`, par: e.par, tipo: e.tipo, state: e.state, selector: e.selector, count: e.count, rules: e.rules, medida: e.medida }));
  const saida = {
    tela: "cadastrar-empresa (tela C)",
    regra: "plano-tela-c-2026-10-18.md § 6: (elemento × norma) medidos conforme, sobre norma com unidade viola na tela ou sobre componente do inventário; > 12 → 12 por sorteio com semente fixa, preferindo um por tipo de componente do DS. Exclusões declaradas antes do sorteio: casco da aplicação; linhas de página inteira; pares que exigem leitura de significado; elementos que são âncora de unidade ou objeto de escalada pendente (tela-c/sortear-conformes.mjs).",
    semente: SEMENTE, prng: "mulberry32(uint32 dos 8 primeiros hex do sha256 da semente)", teto: TETO,
    elegiveis: ELEGIVEIS.map(e => e.par), camada1_um_por_tipo: camada1, sorteio,
    nota: "Denominador da taxa de falso alarme do agente (protocolo NAT-78 § 5.2). Re-medidos em tela-c/conferir-auditoria.mjs (todos os elegíveis, não só os sorteados).",
    itens,
  };
  const caminho = join(AQUI, "conformes.json");
  writeFileSync(caminho, JSON.stringify(saida, null, 2) + "\n");
  console.log(`${ELEGIVEIS.length} elegíveis → ${itens.length} controles (${sorteio ? "sorteio" : "todos"}); camada 1: ${camada1.join(", ")}`);
  for (const k of itens) console.log(`  ${k.id} ${k.par} [${k.tipo}] ${k.state} ${k.selector} ×${k.count}`);
  console.log(`sha256 conformes.json ${createHash("sha256").update(readFileSync(caminho)).digest("hex")}`);
}
