export const ROUTE_GUARD_VERSION: string;
export const MIXED_ROUTES_MESSAGE: string;
export function avisoMistura(n: number): string;
export function avisoCorte(n: number): string;
export function refsDosErros(errors: unknown): Set<string>;
export function evidenceTokens(report: unknown): Set<string>;
export function routeKey(value: unknown): string | null;
export function mixedRouteErrors(report: unknown, directory?: string): {
  errors: { path: string; code: string; message: string; routes: { route: string; refs: string[] }[] }[];
  checked: boolean; unavailable: number;
};
