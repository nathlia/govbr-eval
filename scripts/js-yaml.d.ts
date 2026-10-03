// js-yaml 4 (travado no package-lock como dependência do eslint 9) não traz tipos; só o emulador e o
// teste do workflow (T4) o usam, para ler o YAML.
declare module "js-yaml" {
  export function load(text: string): unknown;
  const yaml: { load(text: string): unknown };
  export default yaml;
}
