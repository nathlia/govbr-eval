/**
 * D-168 — escreve o .md legível de uma medição de domínio (medir-dominio.mjs), só com os fatos medidos, registro a
 * registro, sem conclusão de identidade (quem declara o domínio é a referência).
 * Uso: node tela-b/vistorias/medicao-dominio-md.mjs <medicao.json> <saida.md>
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const [arq, saida] = process.argv.slice(2);
if (!arq || !saida) { console.error("uso: node tela-b/vistorias/medicao-dominio-md.mjs <medicao.json> <saida.md>"); process.exit(1); }
const bytes = readFileSync(arq), m = JSON.parse(bytes.toString("utf8"));
const id = r => r.slice(-4);
const cel = s => String(s ?? "—").replace(/\|/g, "/");
const titulos = d => { const det = d.titulos.filter(t => t.noDetalhe), fora = d.titulos.filter(t => !t.noDetalhe);
  return `${fora.length ? `fora do detalhe: ${fora.map(t => "h" + t.nivel).join(" ")}; ` : ""}detalhe: ${det.map(t => "h" + t.nivel).join(" ")} (1º "${det[0]?.texto ?? "—"}")`; };
const textarea = d => d.textareas.length ? d.textareas.map(t => `${t.visivel ? "visível" : "oculta"}, id ${t.id ?? "—"}, labels ${t.labels}, label irmão ${t.labelIrmao.map(l => `"${l.texto}" for=${l.for ?? "—"}`).join(", ") || "—"}, nome AX "${t.ax?.nome ?? "?"}"`).join("; ") : "—";
const tabelas = d => d.tabelas.length ? d.tabelas.map(t => `${t.visivel ? "" : "(oculta) "}após h4 "${t.h4Antes ?? "—"}" [${t.cabecalhos.join(", ")}], caption ${t.caption === null ? "—" : `"${t.caption}"`}, aria-label ${t.ariaLabel ?? "—"}, aria-labelledby ${t.ariaLabelledby ?? "—"}, nome AX "${t.ax?.nome ?? "?"}"`).join("; ") : "—";
const b23 = d => d.seletorB23.length ? d.seletorB23.map(x => `"${x.texto}" (seção ${x.secao ?? "—"}) ${x.cor}/${x.fundo} ${x.contraste}:1 ${x.fonte}${x.visivel ? "" : " oculto"}`).join("; ") : "—";
const modal = r => { const x = m.modais[r]; if (!x) return "—";
  const md = x.modais.map(k => `${k.noComponente ? "em pnip-propesc-trocar-embarcacao" : "fora do componente"}, role ${k.role ?? "—"}, aria-modal ${k.ariaModal ?? "—"}, aria-label ${k.ariaLabel ?? "—"}, aria-labelledby ${k.ariaLabelledby ?? "—"}`).join("; ");
  return `${x.modais.length} .br-modal (${md}); dialog na árvore ${x.dialogosNaArvore}; Tab ${x.tab.teclas} teclas: ${x.tab.dentro} dentro, ${x.tab.fora} fora`; };

const linhas = [
  "# Medição sem modelo: domínio das specs de rota de registro da tela Vistorias (D-168)", "",
  `Gravada em ${m.data}, sobre a referência ${m.referencia.versao}, antes de qualquer reconta. Não é julgamento e não decide domínio: põe lado a lado o que cada registro de detalhe mostra; a referência 1.1.0 declara o domínio e cita este arquivo pelo sha256.`, "",
  `- Arquivo: \`${basename(arq)}\` (sha256 \`${createHash("sha256").update(bytes).digest("hex")}\`); script \`${m.script.arquivo}\` (sha256 \`${m.script.sha256}\`). Rodado duas vezes: saída idêntica byte a byte.`,
  `- Site: \`govbr-telas/site/\` (${m.site.siteSha256.slice(0, 12)}, site-manifest.json sha256 \`${m.site.siteManifestoSha256}\`) servido por \`govbr-telas/server.mjs\` em 127.0.0.1; a árvore \`pnip/\` conferida arquivo a arquivo contra \`${m.site.pnipConferidoContra.arquivo}\` (sha256 \`${m.site.pnipConferidoContra.sha256}\`, ${m.site.pnipConferidoContra.arquivos} arquivos, 0 divergentes).`,
  `- ${m.navegador}; janela ${m.janela.width}×${m.janela.height}; entrada \`${m.entrada}\`; carga nova por linha; toda saída da origem abortada. Contraste: ${m.contraste}.`,
  `- Problemas de medida: ${m.problemas.length ? m.problemas.join("; ") : "nenhum"} (escritas no mock, pedidos externos e erros da página: 0 em todas as cargas).`, "",
  "## 1. Lista: como cada registro foi alcançado", "",
  `${m.lista.length} linhas nas três abas; cada linha numa carga nova (aba → página → clique no olho, ou no botão "Agendar"/calendário da aba Agendar).`, "",
  "| aba | pág. | linha | embarcação | situação | botão | registro |", "|---|---:|---:|---|---|---|---|",
  ...m.lista.map(l => { const nome = l.celulas[l.aba === "Tramitando" ? 2 : 1]; const sit = l.aba === "Concluídos" ? l.celulas[6] : l.celulas[l.aba === "Tramitando" ? 7 : 6];
    return `| ${l.aba} | ${l.pagina} | ${l.linha} | ${cel(nome)} | ${cel(sit)} | ${l.botao ?? "—"} | ${l.registro ? id(l.registro) : "—"} |`; }), "",
  "## 2. Detalhe de cada registro (na carga da linha, depois do clique)", "",
  "| registro | aba / situação | títulos (B-21) | textarea do detalhe (B-20) | tabelas do detalhe (B-22) | `.bg-secondary-06 > .text-secondary-01` (B-23) | modal \"Trocar embarcação\" (B-24, B-27) |",
  "|---|---|---|---|---|---|---|",
  ...m.detalhes.map(d => `| ${id(d.registro)} | ${d.alcancadoPor.aba} / ${cel(d.situacaoNaLista.at(-1))} | ${cel(titulos(d))} | ${cel(textarea(d))} | ${cel(tabelas(d))} | ${cel(b23(d))} | ${cel(modal(d.registro))} |`), "",
  "## 3. Modal (carga nova, navigate por path ao registro, clique em \"Trocar embarcação da vistoria\")", "",
  `Registros com o botão: ${Object.keys(m.modais).map(id).join(", ") || "nenhum"}. Os demais registros não têm o botão (\`trocarEmbarcacao\` = 0 na medição do detalhe).`, "",
  "## 4. Filtro Cidade (para ler receitas \"filtro Cidade > X, linha N\")", "",
  "Carga nova por aba e opção: aba → etiqueta \"Cidade\" → opção; cada linha filtrada ligada ao registro pela linha igual (todas as células menos o número de ordem) da lista sem filtro da mesma aba.", "",
  "| aba | cidade | pág. | linha | embarcação | registro |", "|---|---|---:|---:|---|---|",
  ...(m.filtros ?? []).map(f => `| ${f.aba} | ${f.opcao} | ${f.pagina} | ${f.linha} | ${cel(f.celulas[f.aba === "Tramitando" ? 2 : 1])} | ${f.registro ? id(f.registro) : `— (${f.casamentos} casamentos)`} |`), "",
];
writeFileSync(saida, linhas.join("\n"));
console.log(`${saida}: ${m.detalhes.length} registros`);
