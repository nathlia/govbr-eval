/**
 * Registro das telas medidas pelo instrumento de fluxo (telas.json).
 *
 * Até a fatia 8 havia uma tela só, e o nome dela estava escrito em cada script: a página servida,
 * a referência, o arquivo que o ESLint lê e as pastas de execução. Uma segunda tela posta nesses
 * mesmos lugares ficaria indistinguível da primeira — e os scripts que varrem pasta inteira a
 * somariam sem acusar nada. Aqui cada tela declara os SEUS caminhos, e quem precisa deles pergunta
 * pelo nome em vez de presumir "fluxo".
 *
 * O contrato de coleta e de pontuação continua um só (instrument.json): muda a tela, não o
 * instrumento.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { ROOT } from "./adjudication";

/** O que o teste de isolamento confere na página servida. */
export interface TelaIsolamento {
  /** Trecho que prova que a página servida é esta, e não outra. */
  texto: string;
  /** Seletor citado no relatório de encanamento que o teste manda ao coletor. */
  alvo: string;
  /**
   * Fonte no corpus que a superfície NÃO pode servir. `null` quando a tela não tem fonte: página
   * capturada não é entrada Vite, e não existe `/src/*.tsx` cuja ausência conferir.
   */
  fonte: string | null;
  /**
   * Interação que leva a página ao estado condicional do gabarito. `null` quando nenhuma é
   * declarada. Em tela ainda sem gabarito, a interação declarada é só prova de vida da página
   * servida, e `nota` diz isso — nunca um estado que ninguém mediu.
   */
  interacao: { clicar: string; esperar: string; nota?: string } | null;
  /**
   * Hosts (`host:porta`) que a própria página referencia e a política de saída nega de propósito.
   * O teste exige que cada um apareça NEGADO e que nada fora desta lista seja pedido.
   */
  externos?: string[];
  /**
   * Caminhos que a página pede e a captura congelada não trouxe (404 no site). São propriedade da
   * captura, não falha da superfície; declarados para que o teste exija exatamente estes.
   */
  ausentes?: string[];
  /**
   * Site de aplicação de página única (a ala pnip/ do corpus). Sem este campo, a superfície congela
   * o fechamento de arquivos da entrada e serve só caminho exato — como sempre fez.
   */
  site?: TelaSite;
}

/**
 * Como a superfície congela e serve uma SPA. O fechamento por nome citado não basta: o runtime do
 * Angular monta o nome dos chunks lazy a partir de um mapa id → hash, e nenhum arquivo os cita por
 * extenso. Então a árvore inteira entra, e rota sem extensão sob a árvore recebe o índice.
 */
export interface TelaSite {
  /** Pasta do `dist/` do corpus congelada inteira (com barra final: "pnip/"). */
  arvore: string;
  /** Arquivos da árvore que não são parte da tela (o manifesto da ala) e ficam fora do site. */
  excluir?: string[];
  /** Arquivo servido a todo GET sem extensão sob `/<arvore>`. */
  indice: string;
  /** Caminho pedido fora da árvore → arquivo da árvore que responde por ele. */
  aliases?: Record<string, string>;
  nota?: string;
}

export interface Tela {
  nome: string;
  titulo: string;
  /**
   * Página de entrada dentro do `dist/` do corpus. Numa SPA é a rota (pode levar consulta, como a
   * sessão fictícia da tela B), e o arquivo que a responde é `isolamento.site.indice`.
   */
  entry: string;
  /**
   * Referência, relativa à raiz deste repo. `null` enquanto a tela não tem gabarito congelado: o da
   * tela B sai de auditoria por medição, ANTES de qualquer execução (D-49). Quem precisa dele
   * pergunta por `referenciaDe`, que falha nomeando o arquivo que falta e a tela.
   */
  reference: string | null;
  /**
   * Fontes que o ESLint lê, relativas à raiz do corpus. Vazio quando a tela não tem fonte: zero
   * achado de linter sobre uma página capturada seria zero de medida, não zero de defeito.
   */
  sources: string[];
  /** Pasta de execuções por braço; nenhuma é compartilhada entre telas. */
  runs: { com: string; sem: string; smoke: string };
  /** Raiz dos pacotes de revisão desta tela. */
  review: string;
  /** Observação declarada sobre a tela: o que ela é e o que ela ainda não tem. */
  nota?: string;
  isolamento: TelaIsolamento;
}

const file = JSON.parse(readFileSync(join(ROOT, "telas.json"), "utf8")) as Record<string, Omit<Tela, "nome">>;

export const TELAS: Record<string, Tela> = Object.fromEntries(
  Object.entries(file).filter(([nome]) => nome !== "_meta").map(([nome, tela]) => [nome, { nome, ...tela }]));

export const TELA_PADRAO = "fluxo";

/** Tela pelo nome. Nome desconhecido é erro de configuração, nunca "a de sempre". */
export function telaOf(nome: string): Tela {
  const tela = TELAS[nome];
  if (!tela) throw new Error(`Tela desconhecida: "${nome}". Declaradas em telas.json: ${Object.keys(TELAS).join(", ")}`);
  return tela;
}

/** Valor de `--tela` na linha de comando; sem a opção, a tela de fluxo, como sempre foi. */
export function telaFromArgs(args: string[]): Tela {
  const index = args.indexOf("--tela");
  return telaOf(index >= 0 ? args[index + 1] : TELA_PADRAO);
}

/** Tela cuja entrada é esta (a superfície recebe `--entry`, não o nome). */
export function telaDaEntrada(entry: string): Tela | null {
  return Object.values(TELAS).find((tela) => tela.entry === entry) ?? null;
}

/** Arquivo do `dist/` que responde pela entrada: ela mesma, ou o índice da SPA. */
export function arquivoDeEntrada(tela: Tela): string {
  return tela.isolamento.site?.indice ?? tela.entry;
}

/** Arquivo em que a referência da tela mora — ou vai morar, quando ela ainda não existe. */
export function arquivoDeReferencia(tela: Tela): string {
  return tela.reference ?? `ground-truth-${tela.nome}.json`;
}

/**
 * Caminho da referência congelada, relativo à raiz deste repo. Tela sem referência para AQUI,
 * nomeando o arquivo que falta e a tela: o gabarito da tela B sai de auditoria por medição, antes
 * de qualquer execução (D-49). Nenhum script o inventa, e nenhum cai na referência de outra tela.
 */
export function referenciaDe(tela: Tela): string {
  if (!tela.reference) {
    throw new Error(
      `A tela "${tela.nome}" ainda não tem referência congelada: falta ${arquivoDeReferencia(tela)} na raiz do govbr-eval. ` +
      "Ela sai da auditoria por medição, antes de qualquer execução (D-49) — nenhum script cria gabarito.");
  }
  return tela.reference;
}
