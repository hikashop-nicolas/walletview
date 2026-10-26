// Reader for SMART Health Cards: a signed (JWS) FHIR bundle carried in a .smart-health-card
// file, a bare JWS, or the numeric shc:/ text of its QR code. The payload is read, never
// verified: checking the signature needs the issuer's key over the network.

import { inflateSync } from "fflate";
import { CVX, LOINC } from "./codes";
import { sha256Hex } from "./checks";
import { issuerHost } from "./issuer";
import type { Card, CardBarcode, CardField } from "./model";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Json = Record<string, unknown>;

const MAX_JWS = 20000;
const QR_MAX = 1195;
const QR_CHUNK = 1191;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function looksLikeHealthCard(text: string): boolean {
  const s = text.trimStart();
  return /^shc:\/\d/i.test(s) || /^\{[\s\S]*"verifiableCredential"/.test(s) || /^eyJ[\w-]+\.[\w-]+\.[\w-]+\s*$/.test(s);
}

function b64urlToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

// shc:/ text holds each JWS character as two digits (its code minus 45); chunked cards add
// shc:/i/n/ before the digits.
function numericToJws(text: string): string[] {
  const parts = new Map<number, string>();
  let total = 1;
  for (const line of text.split(/\s+/).filter(Boolean)) {
    const m = /^shc:\/(?:(\d+)\/(\d+)\/)?(\d+)$/i.exec(line);
    if (!m) throw new Error("not a SMART Health Card link");
    if (m[1]) total = Number(m[2]);
    parts.set(m[1] ? Number(m[1]) : 1, m[3]!);
  }
  if (parts.size !== total) throw new Error("part of the card is missing");
  let digits = "";
  for (let i = 1; i <= total; i++) digits += parts.get(i) ?? "";
  if (digits.length % 2) throw new Error("malformed digits");
  let jws = "";
  for (let i = 0; i < digits.length; i += 2) jws += String.fromCharCode(Number(digits.slice(i, i + 2)) + 45);
  return [jws];
}

function collectJws(text: string): string[] {
  const s = text.trim();
  if (/^shc:\//i.test(s)) return numericToJws(s);
  if (s.startsWith("{")) {
    const list = (JSON.parse(s) as Json).verifiableCredential;
    if (!Array.isArray(list)) throw new Error("no verifiableCredential in the file");
    return list.filter((j): j is string => typeof j === "string");
  }
  return [s];
}

function payloadOf(jws: string): Json {
  if (jws.length > MAX_JWS) throw new Error("the card is too large");
  const [h, p] = jws.split(".");
  if (!h || !p) throw new Error("not a JWS");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))) as Json;
  let raw = b64urlToBytes(p);
  if (header.zip === "DEF") raw = inflateSync(raw);
  const payload: unknown = JSON.parse(new TextDecoder().decode(raw));
  if (!isObject(payload)) throw new Error("payload is not an object");
  return payload;
}

function codeText(c: unknown): string {
  if (!isObject(c)) return "";
  if (str(c.text)) return str(c.text);
  const coding = Array.isArray(c.coding) ? c.coding.find(isObject) : undefined;
  if (!coding) return "";
  const code = str(coding.code);
  const system = str(coding.system);
  const known = /cvx$/.test(system) ? CVX[code] : /loinc\.org/.test(system) ? LOINC[code] : undefined;
  return str(coding.display) || known || code;
}

function personName(p: Json): string {
  const n = Array.isArray(p.name) ? p.name.find(isObject) : undefined;
  if (!n) return "";
  const given = Array.isArray(n.given) ? n.given.filter((g): g is string => typeof g === "string") : [];
  return [...given, str(n.family)].filter(Boolean).join(" ");
}

function observationValue(o: Json): string {
  const q = o.valueQuantity;
  if (isObject(q) && q.value !== undefined) return [String(q.value), str(q.unit)].filter(Boolean).join(" ");
  return codeText(o.valueCodeableConcept) || str(o.valueString);
}

function shcBarcodes(jws: string): CardBarcode[] {
  let digits = "";
  for (const ch of jws) digits += String(ch.charCodeAt(0) - 45).padStart(2, "0");
  if (digits.length <= QR_MAX * 2) return [{ format: "qr", message: `shc:/${digits}` }];
  const n = Math.ceil(digits.length / (QR_CHUNK * 2));
  const size = Math.ceil(digits.length / n / 2) * 2;
  return Array.from({ length: n }, (_, i) => ({
    format: "qr" as const,
    message: `shc:/${i + 1}/${n}/${digits.slice(i * size, (i + 1) * size)}`,
    altText: `${i + 1}/${n}`,
  }));
}

function cardFrom(jws: string, t: T, lang: string | undefined): Card {
  const payload = payloadOf(jws);
  const vc = isObject(payload.vc) ? payload.vc : {};
  const subject = isObject(vc.credentialSubject) ? vc.credentialSubject : {};
  const bundle = isObject(subject.fhirBundle) ? subject.fhirBundle : {};
  const entries = Array.isArray(bundle.entry) ? bundle.entry : [];
  const resources = entries.map((e) => (isObject(e) && isObject(e.resource) ? e.resource : null)).filter((r): r is Json => !!r);

  const date = (v: unknown): string => {
    const d = typeof v === "string" ? new Date(/^\d{4}-\d\d-\d\d$/.test(v) ? v + "T00:00:00Z" : v) : null;
    if (!d || Number.isNaN(d.getTime())) return str(v);
    try {
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: /^\d{4}-\d\d-\d\d$/.test(str(v)) ? "UTC" : undefined }).format(d);
    } catch {
      return str(v);
    }
  };

  if (!resources.length) throw new Error("not a health card");
  const patient = resources.find((r) => r.resourceType === "Patient");
  const records: CardField[] = [];
  const details: CardField[] = [];
  for (const r of resources) {
    if (r.resourceType === "Immunization") {
      const label = codeText(r.vaccineCode) || t("vaccine");
      const when = date(r.occurrenceDateTime);
      records.push({ label, value: when });
      const performer = Array.isArray(r.performer) && isObject(r.performer[0]) && isObject(r.performer[0].actor) ? str(r.performer[0].actor.display) : "";
      const lot = str(r.lotNumber) ? `${t("lot")} ${str(r.lotNumber)}` : "";
      details.push({ label: `${t("vaccine")}: ${label}`, value: [when, performer, lot].filter(Boolean).join(" · ") });
    } else if (r.resourceType === "Observation") {
      const label = codeText(r.code) || t("result");
      const value = observationValue(r);
      const when = date(r.effectiveDateTime);
      records.push({ label, value: value || when });
      details.push({ label, value: [value, when].filter(Boolean).join(" · ") });
    }
  }

  const iss = str(payload.iss);
  const issued = typeof payload.nbf === "number" ? date(new Date(payload.nbf * 1000).toISOString()) : "";
  return {
    style: "generic",
    organization: iss,
    description: t("healthCard"),
    logoText: t("healthCard"),
    colors: {},
    header: [],
    primary: patient && personName(patient) ? [{ label: t("patient"), value: personName(patient) }] : [],
    secondary: patient && str(patient.birthDate) ? [{ label: t("birthDate"), value: date(patient.birthDate) }] : [],
    auxiliary: records,
    back: [...details, ...(iss ? [{ label: t("issuer"), value: iss }] : []), ...(issued ? [{ label: t("issued"), value: issued }] : [])],
    barcodes: shcBarcodes(jws),
    verify: { host: issuerHost(iss.replace(/\/+$/, "")) ?? undefined, key: () => sha256Hex(new TextEncoder().encode(jws)), run: (confirm) => import("./verify").then((m) => m.verifyHealthCard(jws, confirm)) },
    images: {},
    release: () => {},
  };
}

export function readHealthCard(text: string, t: T, lang: string | undefined): Card[] {
  const cards = collectJws(text).map((j) => cardFrom(j, t, lang));
  if (!cards.length) throw new Error("no health card found");
  return cards;
}
