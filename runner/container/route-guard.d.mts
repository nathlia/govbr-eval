export const ROUTE_GUARD_VERSION: string;
export function routeKey(value: unknown): string | null;
export function mixedRouteErrors(report: unknown, directory?: string): {
  errors: { path: string; code: string; message: string; routes: { route: string; refs: string[] }[] }[];
  checked: boolean; unavailable: number;
};
