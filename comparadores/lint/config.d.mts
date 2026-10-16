export const ARQUIVO_TOKENS: string;
export const PROPS_ESPACAMENTO: RegExp;
export interface RegraMeta { id: string; regra: string; perfil: "normativo" | "higiene"; normas: string[]; propriedade?: RegExp }
export const REGRAS: RegraMeta[];
export function classificar(regraStylelint: string, propriedade: string | null): RegraMeta | null;
export const config: import("stylelint").Config;
export function hashDaConfiguracao(): string;
