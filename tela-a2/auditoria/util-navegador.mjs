/** Utilitários injetados na página (window.__u): cor, contraste WCAG, fundo efetivo, visibilidade, estilos. */
export const UTIL = () => {
  window.__u = {
    rgba(s) { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; },
    lum({ r, g, b }) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); },
    razao(a, b) { const la = this.lum(a), lb = this.lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); },
    sobre(c, fundo) { const a = c.a; return { r: c.r * a + fundo.r * (1 - a), g: c.g * a + fundo.g * (1 - a), b: c.b * a + fundo.b * (1 - a), a: 1 }; },
    fundo(el) {
      const camadas = []; let imagem = null;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage && cs.backgroundImage !== "none" && !imagem) imagem = { el: this.desc(n), valor: cs.backgroundImage.slice(0, 120) };
        const c = this.rgba(cs.backgroundColor); if (c && c.a > 0) camadas.push(c);
        if (c && c.a === 1) break;
      }
      let f = { r: 255, g: 255, b: 255, a: 1 };
      for (const c of camadas.reverse()) f = this.sobre(c, f);
      return { cor: f, imagem };
    },
    desc(el) {
      if (!el || el.nodeType !== 1) return null;
      let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id;
      const cls = [...el.classList].filter(c => !c.startsWith("focus-visible")).slice(0, 4); if (cls.length) s += "." + cls.join(".");
      return s;
    },
    caminho(el) {
      const partes = [];
      for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
        if (n.id) { partes.unshift("#" + n.id); break; }
        const p = n.parentElement; let s = n.tagName.toLowerCase();
        if (p) { const irmaos = [...p.children].filter(x => x.tagName === n.tagName); if (irmaos.length > 1) s += `:nth-of-type(${irmaos.indexOf(n) + 1})`; }
        partes.unshift(s);
      }
      return partes.join(" > ");
    },
    visivel(el) {
      if (!el || !el.isConnected) return false;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
      if (el.closest("[hidden]")) return false;
      if (r.width < 1 || r.height < 1) return false;
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n);
        if (c.display === "none" || c.visibility === "hidden" || Number(c.opacity) === 0) return false;
        if (c.clip === "rect(0px, 0px, 0px, 0px)" || c.clipPath === "inset(50%)") return false;
      }
      const sw = document.documentElement.scrollWidth, sh = document.documentElement.scrollHeight;
      if (r.right + scrollX <= 0 || r.bottom + scrollY <= 0 || r.left + scrollX >= sw || r.top + scrollY >= sh) return false;
      return true;
    },
    estilo(el, pseudo) {
      const cs = getComputedStyle(el, pseudo);
      const k = ["display", "position", "visibility", "opacity", "color", "backgroundColor", "backgroundImage", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textAlign", "textTransform", "whiteSpace",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft", "borderTopWidth", "borderTopStyle", "borderTopColor", "borderBottomWidth", "borderBottomStyle", "borderBottomColor", "borderLeftWidth", "borderLeftStyle", "borderLeftColor", "borderRightWidth", "borderRightStyle", "borderRightColor", "borderRadius",
        "boxShadow", "outlineStyle", "outlineWidth", "outlineColor", "outlineOffset", "cursor", "overflowX", "overflowY", "zIndex", "width", "height", "top", "left", "transform", "textOverflow", "justifyContent", "alignItems", "flexDirection", "gap", "content"];
      const o = {}; for (const x of k) o[x] = cs[x]; return o;
    },
    caixa(el) { const r = el.getBoundingClientRect(); return { x: Math.round(r.x * 10) / 10, y: Math.round((r.y + scrollY) * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; },
    attrs(el) { const o = {}; for (const a of el.attributes) if (a.name !== "style" || el.classList.contains("br-tooltip")) o[a.name] = a.value; return o; },
  };
};
