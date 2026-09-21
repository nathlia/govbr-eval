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
   * declarada: a captura da aplicação real não preservou os bindings do Angular (README da ala real
   * do corpus) e a tela ainda não tem gabarito que peça um estado. Não afirma que a página é inerte —
   * os web components do DS hidratam, e o que ainda respondem é matéria da auditoria.
   */
  interacao: { clicar: string; esperar: string } | null;
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
}

export interface Tela {
  nome: string;
  titulo: string;
  /** Página de entrada dentro do `dist/` do corpus. */
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
