// Declarações mínimas para pacotes sem tipos usados pelos comparadores (NAT-76).
declare module "pngjs" {
  export class PNG {
    constructor(opts?: { width?: number; height?: number });
    width: number;
    height: number;
    data: Buffer;
    static sync: { read(buf: Buffer): PNG; write(png: PNG): Buffer };
  }
}
declare module "postcss-html" {
  import type { Document } from "postcss";
  const sintaxe: { parse(code: string, opts?: { from?: string }): Document };
  export default sintaxe;
}
