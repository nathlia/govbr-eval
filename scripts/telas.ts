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

export interface Tela {
  nome: string;
  titulo: string;
  /** Página de entrada dentro do `dist/` do corpus. */
  entry: string;
  /** Referência, relativa à raiz deste repo. */
  reference: string;
  /** Fontes que o ESLint lê, relativas à raiz do corpus. */
  sources: string[];
  /** Pasta de execuções por braço; nenhuma é compartilhada entre telas. */
  runs: { com: string; sem: string; smoke: string };
  /** Raiz dos pacotes de revisão desta tela. */
  review: string;
  /** O que o teste de isolamento confere na página servida. */
  isolamento: { texto: string; clicar: string; esperar: string; alvo: string; fonte: string };
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
