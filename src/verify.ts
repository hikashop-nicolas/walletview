// Signature checks, run only when the person asks. A health card is checked against the key its
// issuer publishes; a .pkpass against the list of file hashes it was signed with.

import { unzipSync } from "fflate";
import { bytesOf, children, contentOf, oidOf, parseDer, textOf, type Der } from "./der";
import type { VerifyOutcome } from "./model";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Confirm = (url: string) => Promise<boolean>;
type Json = Record<string, unknown>;

const subtle = (): SubtleCrypto => {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is not available");
  return globalThis.crypto.subtle;
};

const hex = (b: ArrayBuffer): string => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

function b64urlToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

const bytesToB64url = (b: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// ---------------------------------------------------------------- SMART Health Card

import { issuerHost } from "./issuer";

export async function verifyHealthCard(jws: string, t: T, confirm?: Confirm): Promise<VerifyOutcome> {
  const [h, p, s] = jws.split(".");
  if (!h || !p || !s) return { status: "failed", lines: [t("sigBad")] };
  let header: Json;
  let payload: Json;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))) as Json;
    const raw = b64urlToBytes(p);
    const { inflateSync } = await import("fflate");
    payload = JSON.parse(new TextDecoder().decode(header.zip === "DEF" ? inflateSync(raw) : raw)) as Json;
  } catch {
    return { status: "failed", lines: [t("sigBad")] };
  }
  const iss = typeof payload.iss === "string" ? payload.iss.replace(/\/+$/, "") : "";
  const host = issuerHost(iss);
  if (!host) return { status: "unavailable", lines: [t("sigIssuer")] };
  if (header.alg !== "ES256" || typeof header.kid !== "string") return { status: "unavailable", lines: [t("sigUnsupported")] };

  const url = `${iss}/.well-known/jwks.json`;
  if (confirm && !(await confirm(url))) return { status: "unavailable", lines: [t("sigCancelled")] };
  let keys: unknown;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    const res = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    if (text.length > 200000) throw new Error("too large");
    keys = (JSON.parse(text) as Json).keys;
  } catch {
    return { status: "unavailable", lines: [t("sigNetwork", { host })] };
  }
  const jwk = Array.isArray(keys) ? (keys as Json[]).find((k) => k && k.kid === header.kid) : undefined;
  if (!jwk) return { status: "failed", lines: [t("sigNoKey", { host })] };
  try {
    if (jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.x !== "string" || typeof jwk.y !== "string") throw new Error("key type");
    const thumb = bytesToB64url(await subtle().digest("SHA-256", new TextEncoder().encode(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }))));
    if (thumb !== header.kid) return { status: "failed", lines: [t("sigKeyId", { host })] };
    const key = await subtle().importKey("jwk", { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await subtle().verify({ name: "ECDSA", hash: "SHA-256" }, key, b64urlToBytes(s) as BufferSource, new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return { status: "failed", lines: [t("sigBad")] };
  } catch {
    return { status: "unavailable", lines: [t("sigUnsupported")] };
  }
  return { status: "ok", lines: [t("sigOk", { host }), t("sigTrust")] };
}

// ---------------------------------------------------------------- Apple Wallet pass

const OID_SHA1 = "1.3.14.3.2.26";
const OID_SHA256 = "2.16.840.1.101.3.4.2.1";
const OID_SHA384 = "2.16.840.1.101.3.4.2.2";
const OID_SHA512 = "2.16.840.1.101.3.4.2.3";
const OID_MESSAGE_DIGEST = "1.2.840.113549.1.9.4";
const OID_RSA = "1.2.840.113549.1.1.1";
const OID_CN = "2.5.4.3";
const OID_O = "2.5.4.10";
const HASHES: Record<string, string> = { [OID_SHA1]: "SHA-1", [OID_SHA256]: "SHA-256", [OID_SHA384]: "SHA-384", [OID_SHA512]: "SHA-512" };

interface Cert {
  spki: Uint8Array;
  spkiAlg: string;
  serial: Uint8Array;
  issuer: Uint8Array;
  subject: { cn: string; o: string };
  issuerName: { cn: string };
}

function names(b: Uint8Array, rdn: Der): Record<string, string> {
  const out: Record<string, string> = {};
  for (const set of children(b, rdn)) {
    for (const atv of children(b, set)) {
      const [oid, val] = children(b, atv);
      if (oid && val) out[oidOf(b, oid)] = textOf(b, val);
    }
  }
  return out;
}

function parseCert(b: Uint8Array, node: Der): Cert {
  const [tbs] = children(b, node);
  const f = children(b, tbs!);
  let i = f[0]!.tag === 0xa0 ? 1 : 0;
  const serial = contentOf(b, f[i++]!);
  i++; // signature algorithm
  const issuer = f[i++]!;
  i++; // validity
  const subject = f[i++]!;
  const spki = f[i]!;
  const algId = children(b, children(b, spki)[0]!)[0]!;
  const sub = names(b, subject);
  const iss = names(b, issuer);
  return {
    spki: bytesOf(b, spki),
    spkiAlg: oidOf(b, algId),
    serial,
    issuer: bytesOf(b, issuer),
    subject: { cn: sub[OID_CN] ?? "", o: sub[OID_O] ?? "" },
    issuerName: { cn: iss[OID_CN] ?? "" },
  };
}

interface Signed {
  certs: Cert[];
  hash: string;
  attrs: Uint8Array;
  messageDigest: Uint8Array;
  signature: Uint8Array;
  signerSerial?: Uint8Array;
  signerIssuer?: Uint8Array;
  signatureOid: string;
}

function parseSignature(b: Uint8Array): Signed {
  const root = parseDer(b);
  const wrap = children(b, root)[1]; // [0] EXPLICIT content
  const signedData = children(b, wrap!)[0]!;
  const parts = children(b, signedData);
  const certsNode = parts.find((n) => n.tag === 0xa0);
  const signerInfos = parts[parts.length - 1]!;
  const certs = certsNode ? children(b, certsNode).filter((n) => n.tag === 0x30).map((n) => parseCert(b, n)) : [];
  const si = children(b, children(b, signerInfos)[0]!);
  let i = 1; // version
  const sid = si[i++]!;
  const digestAlg = oidOf(b, children(b, si[i++]!)[0]!);
  const attrsNode = si[i]!.tag === 0xa0 ? si[i++]! : null;
  const sigAlg = oidOf(b, children(b, si[i++]!)[0]!);
  const signature = contentOf(b, si[i]!);
  if (!attrsNode) throw new Error("no signed attributes");
  const attrs = Uint8Array.from(bytesOf(b, attrsNode));
  attrs[0] = 0x31; // signed over a SET, not the [0] tag it is stored with
  let messageDigest: Uint8Array | null = null;
  for (const a of children(b, attrsNode)) {
    const [oid, set] = children(b, a);
    if (oid && set && oidOf(b, oid) === OID_MESSAGE_DIGEST) messageDigest = contentOf(b, children(b, set)[0]!);
  }
  if (!messageDigest) throw new Error("no message digest");
  let signerSerial: Uint8Array | undefined;
  let signerIssuer: Uint8Array | undefined;
  if (sid.tag === 0x30) {
    const [issuer, serial] = children(b, sid);
    signerIssuer = bytesOf(b, issuer!);
    signerSerial = contentOf(b, serial!);
  }
  return { certs, hash: HASHES[digestAlg] ?? "", attrs, messageDigest, signature, signerSerial, signerIssuer, signatureOid: sigAlg };
}

const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

export async function verifyPkpass(zip: Uint8Array, t: T): Promise<VerifyOutcome> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zip);
  } catch {
    return { status: "failed", lines: [t("pkBad")] };
  }
  const manifestBytes = files["manifest.json"];
  const sigBytes = files["signature"];
  if (!manifestBytes || !sigBytes) return { status: "failed", lines: [t("pkNoSig")] };

  let signed: Signed;
  try {
    signed = parseSignature(sigBytes);
  } catch {
    return { status: "unavailable", lines: [t("sigUnsupported")] };
  }
  if (!signed.hash) return { status: "unavailable", lines: [t("sigUnsupported")] };

  const digest = new Uint8Array(await subtle().digest(signed.hash, manifestBytes as BufferSource));
  if (!same(digest, signed.messageDigest)) return { status: "failed", lines: [t("pkManifest")] };

  const candidates = signed.certs.filter((c) => !signed.signerSerial || !signed.signerIssuer || (same(c.serial, signed.signerSerial) && same(c.issuer, signed.signerIssuer)));
  let signer: Cert | null = null;
  for (const c of candidates.length ? candidates : signed.certs) {
    if (c.spkiAlg !== OID_RSA) continue;
    try {
      const key = await subtle().importKey("spki", c.spki as BufferSource, { name: "RSASSA-PKCS1-v1_5", hash: signed.hash }, false, ["verify"]);
      if (await subtle().verify("RSASSA-PKCS1-v1_5", key, signed.signature as BufferSource, signed.attrs as BufferSource)) {
        signer = c;
        break;
      }
    } catch {
      // try the next certificate
    }
  }
  if (!signer) return { status: signed.certs.some((c) => c.spkiAlg === OID_RSA) ? "failed" : "unavailable", lines: [t(signed.certs.some((c) => c.spkiAlg === OID_RSA) ? "pkBadSig" : "sigUnsupported")] };

  let listed: Json;
  try {
    listed = JSON.parse(new TextDecoder().decode(manifestBytes)) as Json;
  } catch {
    return { status: "failed", lines: [t("pkManifest")] };
  }
  const changed: string[] = [];
  for (const [name, want] of Object.entries(listed)) {
    const data = files[name];
    if (!data || typeof want !== "string" || hex(await subtle().digest("SHA-1", data as BufferSource)) !== want.toLowerCase()) changed.push(name);
  }
  for (const name of Object.keys(files)) {
    if (name !== "manifest.json" && name !== "signature" && !(name in listed) && !name.endsWith("/")) changed.push(name);
  }
  const who = [signer.subject.cn, signer.subject.o].filter(Boolean).join(", ");
  if (changed.length) return { status: "failed", lines: [t("pkChanged", { files: changed.slice(0, 5).join(", ") })] };
  return { status: "ok", lines: [t("pkOk", { signer: who }), t("pkChain", { issuer: signer.issuerName.cn })] };
}
