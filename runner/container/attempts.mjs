// Tentativas de rede e de arquivo usadas pela sonda do harness (probe.mjs) e pelo agente roteirizado
// (fake-agent.mjs). Cada função devolve o que ACONTECEU, sem julgar: quem chama decide se era para
// ser recusado. Só módulos nativos do Node.
import { connect as netConnect } from "node:net";
import { lookup } from "node:dns/promises";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { networkInterfaces } from "node:os";

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** TCP puro: connected | refused | dns-fail | timeout | unreachable | error. */
export function tcp(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = netConnect({ host, port, family: host.includes(":") ? 6 : 0 });
    const done = (outcome, detail = "") => {
      socket.destroy();
      resolve({ outcome, detail, ms: Date.now() - started });
    };
    socket.setTimeout(timeoutMs, () => done("timeout"));
    socket.once("connect", () => done("connected"));
    socket.once("error", (e) => {
      const code = e.code ?? "";
      if (code === "ECONNREFUSED") return done("refused", code);
      if (code === "ENOTFOUND" || code === "EAI_AGAIN") return done("dns-fail", code);
      if (code === "ENETUNREACH" || code === "EHOSTUNREACH" || code === "EADDRNOTAVAIL") return done("unreachable", code);
      return done("error", code || e.message);
    });
  });
}

export async function dns(host) {
  try {
    const r = await lookup(host, { all: true });
    return { outcome: "resolved", addresses: r.map((a) => a.address) };
  } catch (e) {
    return { outcome: "failed", detail: e.code ?? e.message };
  }
}

/** CONNECT pelo proxy; devolve status e as primeiras linhas recebidas pelo túnel. */
export function proxyConnect(proxyHost, proxyPort, target, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = netConnect({ host: proxyHost, port: proxyPort });
    let buf = "";
    let status = null;
    const finish = (outcome, detail = "") => {
      socket.destroy();
      resolve({ outcome, status, banner: buf.split("\r\n\r\n").slice(1).join("").slice(0, 200), detail });
    };
    socket.setTimeout(timeoutMs, () => finish(status === 200 ? "tunnel-open" : "timeout"));
    socket.once("error", (e) => finish("error", e.code ?? e.message));
    socket.once("connect", () => socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`));
    socket.on("data", (d) => {
      buf += d.toString("utf8");
      const m = /^HTTP\/1\.[01] (\d{3})/.exec(buf);
      if (m) status = Number(m[1]);
      if (status !== null && status !== 200) return finish("denied");
      if (status === 200 && buf.includes("\r\n\r\n") && buf.split("\r\n\r\n")[1].length > 0) return finish("tunnel-data");
    });
    socket.once("end", () => finish(status === 200 ? "tunnel-closed" : status === null ? "no-response" : "denied"));
  });
}

/** GET de URL absoluta através de um proxy HTTP. */
export function proxyGet(proxyHost, proxyPort, url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const socket = netConnect({ host: proxyHost, port: proxyPort });
    let buf = "";
    const finish = (outcome, detail = "") => {
      socket.destroy();
      const m = /^HTTP\/1\.[01] (\d{3})/.exec(buf);
      resolve({ outcome, status: m ? Number(m[1]) : null, body: buf.split("\r\n\r\n").slice(1).join("").slice(0, 300), detail });
    };
    socket.setTimeout(timeoutMs, () => finish("timeout"));
    socket.once("error", (e) => finish("error", e.code ?? e.message));
    socket.once("connect", () => socket.write(`GET ${url} HTTP/1.1\r\nHost: ${u.host}\r\nConnection: close\r\n\r\n`));
    socket.on("data", (d) => { buf += d.toString("utf8"); });
    socket.once("end", () => finish("done"));
  });
}

export function readAttempt(path) {
  try {
    if (!existsSync(path)) return { outcome: "absent" };
    const st = statSync(path);
    if (st.isDirectory()) return { outcome: "listed", entries: readdirSync(path).slice(0, 20) };
    const body = readFileSync(path);
    return { outcome: "read", bytes: body.length, sha256: sha256(body) };
  } catch (e) {
    return { outcome: e.code === "EACCES" || e.code === "EPERM" ? "denied" : "error", detail: e.code ?? e.message };
  }
}

export function writeAttempt(path) {
  try {
    writeFileSync(path, `tentativa ${new Date().toISOString()}\n`, { flag: "wx" });
    return { outcome: "written" };
  } catch (e) {
    const code = e.code ?? e.message;
    return { outcome: code === "EROFS" ? "read-only" : code === "EACCES" || code === "EPERM" ? "denied" : code === "ENOENT" ? "no-such-dir" : "error", detail: code };
  }
}

/** IPs de gateway prováveis de cada rede anexada: rede base + 1 (o Docker dá .1 ao gateway). */
export function gatewayCandidates() {
  const out = new Set();
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.internal || a.family !== "IPv4") continue;
      const ip = a.address.split(".").map(Number);
      const mask = a.netmask.split(".").map(Number);
      const base = ip.map((o, i) => o & mask[i]);
      base[3] += 1;
      out.add(base.join("."));
    }
  }
  return [...out];
}

/** Traduções Linux plausíveis de um caminho do Windows (Docker Desktop/WSL), para tentar alcançar o host. */
export function hostPathVariants(winPath) {
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(winPath);
  if (!m) return [winPath];
  const drive = m[1].toLowerCase();
  const rest = m[2].replace(/\\/g, "/");
  return [`/${drive}/${rest}`, `/mnt/${drive}/${rest}`, `/run/desktop/mnt/host/${drive}/${rest}`, `/host_mnt/${drive}/${rest}`,
    `/mnt/host/${drive}/${rest}`, `/${rest}`];
}

export const SECRET_ENV = /ANTHROPIC|CLAUDE_CODE_OAUTH|OAUTH|API_KEY|GITHUB|GH_TOKEN|AWS_|GOOGLE|AZURE|SECRET|PASSWORD|TOKEN|CREDENTIAL/i;
