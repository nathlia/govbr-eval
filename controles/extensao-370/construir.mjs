/**
 * Extensão de DESENVOLVIMENTO do catálogo de controles para o validator 3.7.0 (D-155/D-159): gêmeos novos da família
 * de botões, para validar o detector C01 (br-button só com ícone fora da variante circular) FORA da tela que o inspirou.
 *
 *   node controles/extensao-370/construir.mjs [--corpus ../govbr-corpus]
 *
 * Por que à parte e não em controles/expectativas.json: o catálogo 1.0.0, as expectativas de desenvolvimento e a matriz
 * do portão NAT-86 (d35b33f5) estão congelados — o portão recusa rodar se controles/expectativas.json mudar, e o
 * construir.mjs principal reescreve também a ala B (reserva). Esta extensão não lê nem escreve nada da reserva, não muda
 * o catálogo, a ala A nem a matriz: escreve só a ala C do corpus (public/ e dist/, mesmos bytes) e
 * controles/extensao-370/expectativas.json, no MESMO formato das expectativas de desenvolvimento (a medição
 * independente controles/medir.mjs as lê com --extensao).
 *
 * Família nova F5-06 (o id não existe no catálogo 1.0.0; F5-01 é da reserva e não é copiada nem reusada): o rótulo do
 * Button é obrigatório (`component-button-7ef75d42ac65`), com a exceção da variante circular que a base literal perdeu
 * (legado `component-button-4d7b5f978df1`). Todos os botões têm nome acessível (aria-label ou texto): só o rótulo
 * visível está em jogo, nunca o nome (WCAG 4.1.2).
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pagina } from "../construcao/comum.mjs";
import { ax, dom, antes } from "../construcao/dsl.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const arg = (nome, padrao) => (process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : padrao);
const CORPUS = resolve(AQUI, arg("--corpus", "../../../govbr-corpus"));
const ALA = "c";
const DESTINOS = [join(CORPUS, "public", "controles", ALA), join(CORPUS, "dist", "controles", ALA)];
/** Sal próprio da extensão (o do catálogo principal fica no construir.mjs principal). */
const SAL = "ext370-4f2a9c61d8e3";
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const idOpaco = (gemeo) => "c-" + sha256(`${SAL}:${gemeo}`).slice(0, 10);

/** O mesmo vocabulário proibido do construir.mjs principal (copiado: importá-lo o executaria). */
const PROIBIDAS = [
  /defeit/i, /conforme/i, /viola[cç]/i, /g[eê]meo/i, /\btwin\b/i, /esperad/i, /expected/i, /gabarito/i, /reserv[ao]do/i,
  /desenvolvimento/i, /fixture/i, /\bcaso\b/i, /\bF[1-8]-\d\d/, /\bT-01/, /excec/i, /exceç/i, /n[aã]o[- ]aplic/i,
  /\bwcag\b/i, /e-?mag/i, /\bconfirmed\b/i, /unsupported/i, /unverifiable/i, /\berrad[ao]\b/i, /incorret/i, /quebrad/i,
  /<!--/, /\/\*/, /\/\/ /, /circular/i, /r[óo]tulo/i,
];

function aplicar(texto, trocas, onde) {
  let saida = texto;
  for (const [antigo, novo] of trocas) {
    const n = saida.split(antigo).length - 1;
    if (n !== 1) throw new Error(`${onde}: o trecho trocado ocorre ${n} vezes (precisa ser 1): ${JSON.stringify(antigo.slice(0, 80))}`);
    saida = saida.replace(antigo, () => novo);
  }
  return saida;
}

// ---------------------------------------------------------------- F5-06 (botões)
const NORMA = "ds:button-7ef75d42ac65";
const BOTAO = `<button class="br-button" type="button" id="imprimir" aria-label="Imprimir comprovante"><i class="fas fa-print" aria-hidden="true"></i></button>`;
const F5_06_D = pagina({
  titulo: "Comprovante de empréstimo – Biblioteca Municipal",
  corpo: `
<h1>Comprovante de empréstimo</h1>
<p>Dom Casmurro · Machado de Assis · Exemplar 2 de 3</p>
<p>Devolução até 18/10/2026. Guarde este comprovante até a devolução.</p>
<div class="acoes">
  <button class="br-button primary" type="button" id="concluir">Concluir</button>
  ${BOTAO}
</div>`,
});
const LEITOR = ".texto-leitor{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}";

const sujeito = (esperado, nota = "") => [{ sujeito: "button#imprimir", normas: [NORMA], esperado, nota }];
const visivel = "document.getElementById('imprimir').innerText.trim()";
const temCirculo = "document.getElementById('imprimir').classList.contains('circle')";
const icones = "document.querySelectorAll('#imprimir i.fas').length";

const gemeos = [
  {
    id: "F5-06-D",
    papel: "defeituoso",
    descricao: "br-button só com ícone (fa-print), sem a classe circle, nomeado por aria-label='Imprimir comprovante'.",
    html: F5_06_D,
    celulas: sujeito("confirmed", "só ícone e sem circle: falta o rótulo visível; o nome acessível existe (não é o caso da 4.1.2)"),
    fatos: {
      inicial: [
        dom(visivel, "igual", "", "nenhum texto no botão"),
        dom(icones, "igual", 1, "um ícone"),
        dom(temCirculo, "igual", false, "sem a classe circle"),
        ax("#imprimir", "nome", "igual", "Imprimir comprovante", "nome acessível pelo aria-label"),
      ],
    },
  },
  {
    id: "F5-06-C1",
    papel: "conforme",
    de: "F5-06-D",
    descricao: "o mesmo botão na variante circular (classe circle).",
    mudanca: "acrescenta só a classe circle",
    trocas: [['<button class="br-button" type="button" id="imprimir"', '<button class="br-button circle" type="button" id="imprimir"']],
    celulas: sujeito("conforme", "a variante circular é a forma só com ícone que o DS admite"),
    fatos: { inicial: [dom(visivel, "igual", ""), dom(temCirculo, "igual", true), ax("#imprimir", "nome", "igual", "Imprimir comprovante")] },
  },
  {
    id: "F5-06-C2",
    papel: "conforme",
    de: "F5-06-D",
    descricao: "botão não circular com rótulo visível ao lado do ícone.",
    mudanca: "troca só o botão: texto visível no lugar do aria-label",
    trocas: [[BOTAO, `<button class="br-button secondary" type="button" id="imprimir"><i class="fas fa-print" aria-hidden="true"></i> Imprimir comprovante</button>`]],
    celulas: sujeito("conforme"),
    fatos: { inicial: [dom(visivel, "igual", "Imprimir comprovante"), dom(temCirculo, "igual", false), ax("#imprimir", "nome", "igual", "Imprimir comprovante")] },
  },
  {
    id: "F5-06-D2",
    papel: "defeituoso",
    de: "F5-06-D",
    descricao: "br-button só com ícone e o texto só para leitor de tela (recortado em 1px), sem circle.",
    mudanca: "troca só o botão (texto recortado no lugar do aria-label) e acrescenta a folha que recorta o texto",
    trocas: [
      antes("</head>", `<style>\n${LEITOR}\n</style>\n`),
      [BOTAO, `<button class="br-button" type="button" id="imprimir"><i class="fas fa-print" aria-hidden="true"></i><span class="texto-leitor">Imprimir comprovante</span></button>`],
    ],
    celulas: sujeito("confirmed", "o texto existe só para a tecnologia assistiva: na tela, o botão é só ícone"),
    fatos: {
      inicial: [
        dom("(() => { const r = document.querySelector('#imprimir .texto-leitor').getBoundingClientRect(); return r.width <= 1 && r.height <= 1; })()", "igual", true, "o texto não tem caixa visível"),
        dom(temCirculo, "igual", false),
        ax("#imprimir", "nome", "igual", "Imprimir comprovante"),
      ],
    },
  },
  {
    id: "F5-06-N",
    papel: "conforme",
    de: "F5-06-D",
    descricao: "o botão só com ícone sem circle como parte do Input do DS (botão de ação do campo, marcação dos exemplos oficiais).",
    mudanca: "troca só o botão por um Input com botão de ação",
    trocas: [[BOTAO, `<div class="br-input input-button"><label for="codigo">Código do exemplar</label><input id="codigo" type="text"><button class="br-button" type="button" id="imprimir" aria-label="Buscar exemplar"><i class="fas fa-search" aria-hidden="true"></i></button></div>`]],
    celulas: sujeito("conforme", "parte da anatomia publicada do Input (exemplo oficial input-buttons), não um Button avulso"),
    fatos: {
      inicial: [
        dom(visivel, "igual", ""),
        dom(temCirculo, "igual", false),
        dom("document.getElementById('imprimir').closest('.br-input') !== null", "igual", true, "dentro do Input"),
        ax("#imprimir", "nome", "igual", "Buscar exemplar"),
      ],
    },
  },
];

// ---------------------------------------------------------------- páginas
const paginas = new Map();
for (const g of gemeos) {
  const id = idOpaco(g.id);
  const html = g.html ?? aplicar(paginas.get(g.de).html, g.trocas, g.id);
  for (const re of PROIBIDAS) if (re.test(html)) throw new Error(`isolamento: ${g.id} contém ${re}`);
  paginas.set(g.id, { id, html });
}
const manifesto = {};
for (const destino of DESTINOS) {
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  for (const p of paginas.values()) writeFileSync(join(destino, `${p.id}.html`), p.html);
}
// ordenado por nome, como os manifestos de a/ e b/
for (const p of [...paginas.values()].sort((x, y) => x.id.localeCompare(y.id))) manifesto[`${p.id}.html`] = sha256(Buffer.from(p.html));
const meta = {
  o_que_e: "Páginas estáticas da Biblioteca Municipal (serviço fictício de reservas e renovação de empréstimos), servidas sem rede.",
  regra: "Reproduzir, nunca reparar: os arquivos são gerados e conferidos byte a byte. Não edite à mão.",
  ala: ALA,
};
for (const destino of DESTINOS) writeFileSync(join(destino, "manifesto.json"), JSON.stringify({ _meta: meta, arquivos: manifesto }, null, 2) + "\n");
for (const destino of DESTINOS) for (const f of readdirSync(destino)) if (f !== "manifesto.json" && sha256(readFileSync(join(destino, f))) !== manifesto[f]) throw new Error(`${destino}/${f}: bytes ≠ manifesto`);

// ---------------------------------------------------------------- expectativas (eval)
const familia = { caso: "F5-06", familia: "F5", titulo: "Botão só com ícone fora da variante circular (rótulo do Button)" };
const expectativas = {
  _meta: {
    o_que_e: "EXTENSÃO de desenvolvimento do catálogo de controles (validator 3.7.0, C01): expectativas por gêmeo, no formato de controles/expectativas.json. Fora do catálogo 1.0.0 congelado e da matriz do portão NAT-86; não toca a reserva.",
    divisao: "desenvolvimento",
    familias: [familia],
    fonte: { norma: NORMA, texto: "O rótulo é um elemento obrigatório.", excecaoPerdida: { legado: "govbr-3.7.0-component-button-4d7b5f978df1", texto: "A exceção ocorre na versão tipo circular uma vez que não existe rótulo." } },
    corpus: { ala: `/controles/${ALA}/`, manifesto: `public/controles/${ALA}/manifesto.json (cópia idêntica em dist/)`, alaManifestoSha256: sha256(readFileSync(join(DESTINOS[0], "manifesto.json"))) },
    construcao: "node controles/extensao-370/construir.mjs; medição: node controles/medir.mjs --extensao controles/extensao-370/expectativas.json",
  },
  gemeos: gemeos.map((g) => {
    const p = paginas.get(g.id);
    const base = g.de ? paginas.get(g.de) : null;
    return {
      gemeo: g.id,
      caso: familia.caso,
      familia: familia.familia,
      papel: g.papel,
      descricaoCatalogo: g.descricao,
      celulas: g.celulas,
      alegacoes: [],
      pagina: { id: p.id, caminho: `/controles/${ALA}/${p.id}.html`, sha256: manifesto[`${p.id}.html`] },
      viewport: { width: 1280, height: 900 },
      toque: false,
      receita: [{ acao: "capturar", nome: "inicial" }],
      fatos: g.fatos,
      axePermitido: [],
      ...(base ? { derivacao: { de: g.de, paginaDe: `/controles/${ALA}/${base.id}.html`, mudanca: g.mudanca, trocas: g.trocas, trocasJs: [] } } : {}),
    };
  }),
};
writeFileSync(join(AQUI, "expectativas.json"), JSON.stringify(expectativas, null, 2) + "\n");
console.log(`ala ${ALA}: ${paginas.size} páginas (public/ e dist/) · ${gemeos.length} gêmeos em controles/extensao-370/expectativas.json`);
