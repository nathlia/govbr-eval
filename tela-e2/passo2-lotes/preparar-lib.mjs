// Funções do passo 1 e dos hospedeiros possíveis da E2 (compartilhadas por preparar.mjs e elegibilidade.mjs).
export function passo1(u, inv) {
  const draw = new Set(inv.sorteaveis.map(c => c.componente));
  const emb = new Set(Object.keys(inv.embutidos).filter(k => !k.startsWith("_")));
  const sc = new Set(inv.andaime.map(c => c.componente));
  const fora = new Set(inv.fora.componentes);
  if (u.forca === "recomendacao") return "forca";
  if (u.componente && fora.has(u.componente)) return "componente-fora-da-tela";
  if (u.componente && (draw.has(u.componente) || emb.has(u.componente))) return null;
  if (u.componente && sc.has(u.componente)) return "andaime";
  if (u.componente) throw new Error(`componente sem lugar no inventário: ${u.componente}`);
  return null;
}
export function hospedeirosPossiveis(u, inv) {
  const proprias = c => inv.sorteaveis.find(x => x.componente === c)?.instancias.map(i => i.id) ?? [];
  if (!u.componente) return inv.sorteaveis.flatMap(c => c.instancias.map(i => i.id));
  return [...new Set([...proprias(u.componente), ...(inv.embutidos[u.componente] ?? [])])];
}
