/**
 * Pré-condições das paradas da tela D, SEM referência (o que `npm run conferir:referencia` cobra do
 * `_meta.setup`/`_meta.states`, medido antes de existir gabarito) — sem modelo e sem detector.
 *
 * Em 3 cargas novas, pelo setup de tela-d/sequencia.mjs, para cada parada: (1) o endereço é o `path`
 * declarado e o documento não recarregou; (2) nenhuma escrita no mock (rede e registro do mock) e
 * nenhum pedido para fora da origem; nenhuma chamada sem fixture; nenhum erro de página; (3) a parada
 * é ADITIVA em relação à anterior (nada presente some, nada visível deixa de ser visível — um
 * segmento só, sem navigate); (4) fica PARADA por 1 s (mesmo conjunto de elementos visíveis e mesma
 * árvore de acessibilidade); (5) as três cargas dão o mesmo conjunto de visíveis.
 *
 * Uso: node tela-d/conferir-paradas.mjs --candidato [--headed]
 */
import { exigirBytes, servir, abrirNavegador, novaPagina, carregar, executarPassos, registroDoMock } from "./comum.mjs";
import { FOTO, arvoreAx } from "./teste-estados.mjs";
import { SETUP, STATES } from "./sequencia.mjs";

const CARGAS = 3;
const bytes = exigirBytes();
const { servidor, base } = await servir();
const navegador = await abrirNavegador();
const falhas = [];
let ok = 0;
const conferir = (cond, msg) => { if (cond) ok++; else falhas.push(msg); };
const porCarga = [];
try {
  for (let carga = 1; carga <= CARGAS; carga++) {
    const { contexto, pagina, erros, escritas, externos } = await novaPagina(navegador);
    await carregar(pagina, base);
    let anterior = null, feito = 0;
    const fotos = {};
    for (const st of STATES) {
      await executarPassos(pagina, SETUP.slice(feito, st.afterStep));
      feito = st.afterStep;
      const f = await pagina.evaluate(FOTO);
      const ax = await arvoreAx(pagina);
      await pagina.waitForTimeout(1000);
      const f2 = await pagina.evaluate(FOTO);
      const ax2 = await arvoreAx(pagina);
      const mock = await registroDoMock(pagina);
      const tag = `carga ${carga}, parada ${st.id}`;
      conferir(new URL(f.url).pathname === st.path, `${tag}: path ${new URL(f.url).pathname} ≠ ${st.path}`);
      conferir(!anterior || f.doc === anterior.doc, `${tag}: documento recarregado`);
      conferir(escritas().length === 0 && mock.atendidos.every(k => /^GET /.test(k)), `${tag}: escrita ${[...escritas().map(p => p.metodo + " " + p.caminho), ...mock.atendidos.filter(k => !/^GET /.test(k))].join(", ")}`);
      conferir(externos().length === 0, `${tag}: pedidos externos ${externos().map(p => p.host + p.caminho).join(", ")}`);
      conferir(mock.naoMockados.length === 0, `${tag}: chamadas sem fixture ${mock.naoMockados.join(", ")}`);
      conferir(erros.length === 0, `${tag}: erros de página ${erros.join(" | ")}`);
      if (anterior) {
        const sumiram = anterior.presentes.filter(k => !f.presentes.includes(k));
        const apagaram = anterior.visiveis.filter(k => !f.visiveis.includes(k));
        conferir(sumiram.length === 0 && apagaram.length === 0, `${tag}: não aditiva (${sumiram.length} sumiram, ${apagaram.length} deixaram de ser visíveis; ex.: ${[...sumiram, ...apagaram].slice(0, 3).join(" | ")})`);
      }
      const mudou = f.visiveis.length !== f2.visiveis.length || f.visiveis.some((k, i) => k !== f2.visiveis[i]);
      conferir(!mudou && ax.hash === ax2.hash, `${tag}: não fica parada por 1 s (visíveis ${f.visiveis.length}→${f2.visiveis.length}, ax ${ax.hash}→${ax2.hash})`);
      fotos[st.id] = { visiveis: f2.visiveis.length, chaves: f2.visiveis.join("\n"), ax: ax2.hash };
      anterior = f2;
    }
    porCarga.push(fotos);
    await contexto.close();
  }
  for (const st of STATES) {
    const iguais = new Set(porCarga.map(f => f[st.id].chaves)).size === 1;
    conferir(iguais, `parada ${st.id}: as ${CARGAS} cargas dão conjuntos de visíveis diferentes (${porCarga.map(f => f[st.id].visiveis).join("/")})`);
  }
} finally {
  await navegador.close();
  servidor.close();
}
console.log(`bytes: ${bytes.modo}, ${bytes.n} arquivos · sha256 da lista ${bytes.sha256Lista}`);
for (const st of STATES) console.log(`  ${st.id.padEnd(16)} afterStep ${st.afterStep} · ${st.path} · visíveis ${porCarga.map(f => f[st.id]?.visiveis).join("/")} · ax ${porCarga[0]?.[st.id]?.ax}`);
console.log(`\n${ok}/${ok + falhas.length} conferências passam`);
for (const f of falhas) console.log(`  FALHA ${f}`);
process.exitCode = falhas.length ? 1 : 0;
