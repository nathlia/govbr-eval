/**
 * Normalização de cor para a regra N1 (plano NAT-76 §3.1): todo literal de cor vira `#rrggbb` ou
 * `#rrggbbaa` (alfa ≠ 1), em minúsculas. Funções com `var()` ou argumentos não literais devolvem
 * null (não são literais: o valor vem de um token). Cores nomeadas pela tabela `color-name` 1.1.4.
 */
import nomes from "color-name";

const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** `#abc`, `#abcd`, `#aabbcc`, `#aabbccdd` → forma longa; alfa ff some. */
export function normalizarHex(h) {
  let s = h.toLowerCase().replace(/^#/, "");
  if (!/^[0-9a-f]+$/.test(s) || ![3, 4, 6, 8].includes(s.length)) return null;
  if (s.length <= 4) s = [...s].map((c) => c + c).join("");
  if (s.length === 8 && s.endsWith("ff")) s = s.slice(0, 6);
  return "#" + s;
}

function canal(arg, max) {
  const t = arg.trim();
  if (t.endsWith("%")) return (parseFloat(t) / 100) * max;
  return parseFloat(t);
}

function alfa(arg) {
  if (arg === undefined) return 1;
  const t = arg.trim();
  return t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t);
}

function hslParaRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}

/** Normaliza UM literal de cor (hex, rgb[a](), hsl[a](), nome). Não literal → null. */
export function normalizarCor(literal) {
  const v = literal.trim().toLowerCase();
  if (v.startsWith("#")) return normalizarHex(v);
  const fn = v.match(/^(rgba?|hsla?)\((.*)\)$/s);
  if (fn) {
    if (/var\(|calc\(|env\(|attr\(/.test(fn[2])) return null;
    const partes = fn[2].replace(/\s*\/\s*/, ",").split(/\s*,\s*|\s+/).filter(Boolean);
    if (partes.length < 3) return null;
    let rgb;
    if (fn[1].startsWith("rgb")) rgb = partes.slice(0, 3).map((p) => canal(p, 255));
    else rgb = hslParaRgb(parseFloat(partes[0]), parseFloat(partes[1]), parseFloat(partes[2]));
    if (rgb.some((n) => Number.isNaN(n))) return null;
    const a = alfa(partes[3]);
    if (Number.isNaN(a)) return null;
    return "#" + rgb.map(hex2).join("") + (a < 1 ? hex2(a * 255) : "");
  }
  if (Object.prototype.hasOwnProperty.call(nomes, v)) return "#" + nomes[v].map(hex2).join("");
  return null;
}

/** Palavras que não são cor da paleta nem cor fora dela. */
export const NEUTRAS = new Set(["transparent", "currentcolor", "inherit", "initial", "unset", "revert", "revert-layer", "none"]);
