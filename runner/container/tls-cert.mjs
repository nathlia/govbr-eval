// CA de teste e certificado de servidor gerados por execução, em JS puro (as imagens não têm openssl).
// Só para o dublê do provedor (T3b): o cliente real fala TLS com `api.anthropic.com` pelo proxy, como
// em produção, e confia nesta CA via NODE_EXTRA_CA_CERTS. A chave da CA é descartada ao fim da geração
// (não é escrita em lugar nenhum); a do servidor vai só para a pasta de trabalho do dublê.
//
// X.509 v3 mínimo, ECDSA P-256 + SHA-256: basicConstraints, keyUsage, extKeyUsage (servidor),
// subjectAltName (dNSName), subjectKeyIdentifier/authorityKeyIdentifier.
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";

const len = (n) => {
  if (n < 0x80) return Buffer.from([n]);
  const bytes = [];
  for (let v = n; v > 0; v >>= 8) bytes.unshift(v & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
};
const tlv = (tag, body) => Buffer.concat([Buffer.from([tag]), len(body.length), body]);
const seq = (...items) => tlv(0x30, Buffer.concat(items));
const set = (...items) => tlv(0x31, Buffer.concat(items));
const int = (buf) => tlv(0x02, buf[0] & 0x80 ? Buffer.concat([Buffer.from([0]), buf]) : buf);
const bool = (v) => tlv(0x01, Buffer.from([v ? 0xff : 0]));
const octet = (buf) => tlv(0x04, buf);
const bits = (buf, unused = 0) => tlv(0x03, Buffer.concat([Buffer.from([unused]), buf]));
const utf8 = (s) => tlv(0x0c, Buffer.from(s, "utf8"));
const ctx = (n, body, constructed = true) => tlv((constructed ? 0xa0 : 0x80) | n, body);
function oid(dotted) {
  const [a, b, ...rest] = dotted.split(".").map(Number);
  const out = [40 * a + b];
  for (const v of rest) {
    const chunk = [];
    let x = v;
    do { chunk.unshift(x & 0x7f); x = Math.floor(x / 128); } while (x > 0);
    for (let i = 0; i < chunk.length - 1; i++) chunk[i] |= 0x80;
    out.push(...chunk);
  }
  return tlv(0x06, Buffer.from(out));
}
function utcTime(d) {
  const p = (n) => String(n).padStart(2, "0");
  return tlv(0x17, Buffer.from(`${p(d.getUTCFullYear() % 100)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`));
}
const name = (cn) => seq(set(seq(oid("2.5.4.3"), utf8(cn))));
const ext = (id, critical, value) => seq(oid(id), ...(critical ? [bool(true)] : []), octet(value));
const ECDSA_SHA256 = seq(oid("1.2.840.10045.4.3.2"));
const pem = (label, der) => `-----BEGIN ${label}-----\n${der.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END ${label}-----\n`;
/** keyIdentifier = SHA-1 do BIT STRING da chave pública (método 1 da RFC 5280). */
const keyId = (spki) => createHash("sha1").update(spki.subarray(spki.length - 65)).digest();

function certificate({ subject, issuer, spki, issuerSpki, signingKey, ca, dnsNames, days }) {
  const now = Date.now();
  const extensions = [
    ext("2.5.29.19", true, ca ? seq(bool(true)) : seq()),
    ext("2.5.29.15", true, ca ? bits(Buffer.from([0x06]), 1) : bits(Buffer.from([0x80]), 7)),
    ext("2.5.29.14", false, octet(keyId(spki))),
    ext("2.5.29.35", false, seq(ctx(0, keyId(issuerSpki), false))),
  ];
  if (!ca) {
    extensions.push(ext("2.5.29.37", false, seq(oid("1.3.6.1.5.5.7.3.1"))));
    extensions.push(ext("2.5.29.17", false, seq(...dnsNames.map((n) => ctx(2, Buffer.from(n, "ascii"), false)))));
  }
  const serial = randomBytes(12);
  serial[0] &= 0x7f;
  const tbs = seq(
    ctx(0, int(Buffer.from([2]))), int(serial), ECDSA_SHA256, name(issuer),
    seq(utcTime(new Date(now - 86_400_000)), utcTime(new Date(now + days * 86_400_000))),
    name(subject), spki, ctx(3, seq(...extensions)),
  );
  return seq(tbs, ECDSA_SHA256, bits(sign("sha256", tbs, signingKey)));
}

/**
 * Gera uma CA nova e um certificado de servidor para `dnsNames`. Devolve PEMs: caCert (para
 * NODE_EXTRA_CA_CERTS do cliente), cert + key (para o dublê). A chave da CA não é devolvida.
 */
export function generateStubTls(dnsNames, days = 2) {
  const caKeys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const srvKeys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const caSpki = caKeys.publicKey.export({ type: "spki", format: "der" });
  const srvSpki = srvKeys.publicKey.export({ type: "spki", format: "der" });
  const caName = `govbr-runner CA de teste do dublê ${randomBytes(4).toString("hex")}`;
  const caDer = certificate({ subject: caName, issuer: caName, spki: caSpki, issuerSpki: caSpki, signingKey: caKeys.privateKey, ca: true, dnsNames: [], days });
  const srvDer = certificate({ subject: dnsNames[0], issuer: caName, spki: srvSpki, issuerSpki: caSpki, signingKey: caKeys.privateKey, ca: false, dnsNames, days });
  return {
    caCert: pem("CERTIFICATE", caDer),
    cert: pem("CERTIFICATE", srvDer),
    key: srvKeys.privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}
