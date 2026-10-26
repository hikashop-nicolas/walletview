// Synthetic passes for the tests and the demo. Every name, code and number is invented.

import { deflateSync, inflateSync, strToU8, zipSync } from "fflate";

// A 16x16 opaque PNG, enough for the image slots.
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVR4nGM4scDmPyWYYdSAUQNGDRguBgAAS+WjH2cHwdcAAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);

export function utf16le(text: string): Uint8Array {
  const out = new Uint8Array(2 + text.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    out[2 + i * 2] = c & 0xff;
    out[3 + i * 2] = c >> 8;
  }
  return out;
}

export type PassJson = Record<string, unknown>;

const field = (key: string, label: string, value: unknown, extra: PassJson = {}) => ({ key, label, value, ...extra });

export function boardingPassJson(): PassJson {
  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.example.demo",
    serialNumber: "0001",
    teamIdentifier: "DEMO000000",
    organizationName: "Demo Airways",
    description: "Boarding pass",
    logoText: "Demo Airways",
    backgroundColor: "rgb(20, 47, 87)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(247, 228, 134)",
    barcodes: [{ format: "PKBarcodeFormatQR", message: "M1EXAMPLE/JANE EXAMPLE ABC123 PARLISXY 0123 150Y012A0001 100", messageEncoding: "iso-8859-1" }],
    boardingPass: {
      transitType: "PKTransitTypeAir",
      headerFields: [field("seat", "SEAT", "12A"), field("zone", "ZONE", "2")],
      primaryFields: [field("from", "PARIS", "PAR"), field("to", "LISBON", "LIS")],
      secondaryFields: [field("passenger", "PASSENGER", "EXAMPLE/JANE"), field("class", "CLASS", "Y")],
      auxiliaryFields: [
        field("flight", "FLIGHT", "XY 123"),
        field("date", "DATE", "2026-06-03T08:30:00+02:00", { dateStyle: "PKDateStyleMedium", ignoresTimeZone: true }),
        field("time", "DEPARTS", "2026-06-03T08:30:00+02:00", { timeStyle: "PKDateStyleShort", ignoresTimeZone: true }),
      ],
      backFields: [
        field("rules", "RULES", "Gate closes 20 minutes before departure. See https://example.com/rules for details."),
        field("rec", "RECORD LOCATOR", "ABC123"),
      ],
    },
  };
}

export interface MakeOptions {
  json?: PassJson;
  files?: Record<string, Uint8Array>;
  withImages?: boolean;
  strings?: Record<string, string>;
}

// A .pkpass with an English UTF-16 strings file and a French UTF-8 one.
export function makePkpass(opts: MakeOptions = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "pass.json": strToU8(JSON.stringify(opts.json ?? boardingPassJson())),
    "icon.png": PNG,
    ...(opts.withImages === false ? {} : { "logo.png": PNG, "logo@2x.png": PNG, "footer.png": PNG }),
    "en.lproj/pass.strings": utf16le('/* demo */\n"PARIS" = "FROM";\n"LISBON" = "TO";\n"SEAT" = "Seat";\n'),
    "fr.lproj/pass.strings": strToU8('"PARIS" = "DE";\n"LISBON" = "VERS";\n"SEAT" = "Siège";\n"CLASS" = "Classe";\n'),
    ...(opts.strings ? { "it.lproj/pass.strings": strToU8(Object.entries(opts.strings).map(([k, v]) => `"${k}" = "${v}";`).join("\n")) } : {}),
    ...opts.files,
  };
  return zipSync(files);
}

export function eventTicketJson(): PassJson {
  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.example.demo",
    serialNumber: "0002",
    teamIdentifier: "DEMO000000",
    organizationName: "Demo Concerts",
    description: "Concert ticket",
    logoText: "Demo Concerts",
    backgroundColor: "rgb(255, 245, 230)",
    foregroundColor: "rgb(40, 20, 10)",
    labelColor: "rgb(150, 80, 20)",
    barcode: { format: "PKBarcodeFormatPDF417", message: "TICKET-0002-DEMO", messageEncoding: "iso-8859-1", altText: "0002" },
    eventTicket: {
      primaryFields: [field("event", "EVENT", "The Demo Band")],
      secondaryFields: [field("loc", "VENUE", "Example Hall"), field("price", "PRICE", 42.5, { currencyCode: "EUR" })],
      auxiliaryFields: [field("door", "DOORS", "2026-09-12T19:00:00+02:00", { dateStyle: "PKDateStyleShort", timeStyle: "PKDateStyleShort", ignoresTimeZone: true })],
      backFields: [field("terms", "TERMS", "No refunds.")],
    },
  };
}

export function makeBundle(passes: Uint8Array[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  passes.forEach((p, i) => (files[`pass${i + 1}.pkpass`] = p));
  return zipSync(files, { level: 0 });
}

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// A SMART Health Card JWS whose signature is a placeholder: the viewer never checks it.
export function makeHealthCardJws(extra: PassJson[] = []): string {
  const payload = {
    iss: "https://issuer.example.com/demo",
    nbf: 1750000000,
    vc: {
      type: ["https://smarthealth.cards#health-card"],
      credentialSubject: {
        fhirVersion: "4.0.1",
        fhirBundle: {
          resourceType: "Bundle",
          type: "collection",
          entry: [
            { resource: { resourceType: "Patient", name: [{ family: "Example", given: ["Jane", "Q."] }], birthDate: "1980-02-03" } },
            {
              resource: {
                resourceType: "Immunization",
                vaccineCode: { coding: [{ system: "http://hl7.org/fhir/sid/cvx", code: "208" }] },
                occurrenceDateTime: "2021-04-05",
                performer: [{ actor: { display: "Demo Clinic" } }],
                lotNumber: "LOT42",
              },
            },
            ...extra.map((resource) => ({ resource })),
          ],
        },
      },
    },
  };
  const header = { zip: "DEF", alg: "ES256", kid: "demo" };
  const enc = (o: unknown) => b64url(strToU8(JSON.stringify(o)));
  return `${enc(header)}.${b64url(deflateSync(strToU8(JSON.stringify(payload))))}.${b64url(new Uint8Array(64))}`;
}

export function healthCardFile(jws: string): Uint8Array {
  return strToU8(JSON.stringify({ verifiableCredential: [jws] }));
}

export function healthCardLink(jws: string): string {
  return "shc:/" + [...jws].map((c) => String(c.charCodeAt(0) - 45).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- signed fixtures

const subtle = globalThis.crypto.subtle;

export async function signedHealthCard(opts: { kid?: string; tamper?: boolean; iss?: string } = {}) {
  const pair = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = (await subtle.exportKey("jwk", pair.publicKey)) as { crv: string; kty: string; x: string; y: string };
  const thumb = b64url(new Uint8Array(await subtle.digest("SHA-256", strToU8(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })))));
  const kid = opts.kid ?? thumb;
  const unsigned = makeHealthCardJws();
  const [, body] = unsigned.split(".");
  const header = b64url(strToU8(JSON.stringify({ zip: "DEF", alg: "ES256", kid })));
  const signature = b64url(new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, strToU8(`${header}.${body}`))));
  let jws = `${header}.${body}.${signature}`;
  if (opts.iss) {
    const payload = JSON.parse(new TextDecoder().decode(inflateSync(Uint8Array.from(atob(body!.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (body!.length % 4)) % 4)), (c) => c.charCodeAt(0)))));
    payload.iss = opts.iss;
    const newBody = b64url(deflateSync(strToU8(JSON.stringify(payload))));
    const sig = b64url(new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, strToU8(`${header}.${newBody}`))));
    jws = `${header}.${newBody}.${sig}`;
  }
  if (opts.tamper) {
    const [h, p, s] = jws.split(".");
    jws = `${h}.${p!.slice(0, -4)}AAAA.${s}`;
  }
  return { jws, jwks: { keys: [{ ...jwk, kid: thumb, use: "sig", alg: "ES256" }] } };
}

const der = (tag: number, ...parts: Uint8Array[]): Uint8Array => {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const head = len < 128 ? [tag, len] : len < 256 ? [tag, 0x81, len] : [tag, 0x82, len >> 8, len & 255];
  const out = new Uint8Array(head.length + len);
  out.set(head);
  let at = head.length;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
};
const oid = (s: string): Uint8Array => {
  const n = s.split(".").map(Number);
  const out = [n[0]! * 40 + n[1]!];
  for (const v of n.slice(2)) {
    const chunk = [v & 127];
    for (let x = v >> 7; x; x >>= 7) chunk.unshift((x & 127) | 128);
    out.push(...chunk);
  }
  return der(6, Uint8Array.from(out));
};
const text = (s: string) => der(12, strToU8(s));
const rdn = (o: string, v: string) => der(0x31, der(0x30, oid(o), text(v)));
const NULL = Uint8Array.of(5, 0);

// A .pkpass signed with a throwaway RSA key and a bare-bones certificate, enough for the viewer
// to check the hashes and the signature; no real certificate authority is involved.
export async function signedPkpass(opts: { tamperFile?: boolean; tamperManifest?: boolean } = {}): Promise<Uint8Array> {
  const pair = await subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: Uint8Array.of(1, 0, 1), hash: "SHA-256" }, true, ["sign", "verify"]);
  const spki = new Uint8Array(await subtle.exportKey("spki", pair.publicKey));
  const issuer = der(0x30, rdn("2.5.4.3", "Demo Pass CA"));
  const serial = der(2, Uint8Array.of(7));
  const cert = der(
    0x30,
    der(0x30, der(0xa0, der(2, Uint8Array.of(2))), serial, der(0x30, oid("1.2.840.113549.1.1.11"), NULL), issuer, der(0x30, der(0x17, strToU8("260101000000Z")), der(0x17, strToU8("360101000000Z"))), der(0x30, rdn("2.5.4.3", "Pass Type ID: pass.example.demo"), rdn("2.5.4.10", "Demo Airways")), spki),
    der(0x30, oid("1.2.840.113549.1.1.11"), NULL),
    der(3, Uint8Array.of(0)),
  );
  const files: Record<string, Uint8Array> = {
    "pass.json": strToU8(JSON.stringify(boardingPassJson())),
    "icon.png": strToU8("png bytes"),
  };
  const manifest: Record<string, string> = {};
  for (const [name, data] of Object.entries(files)) {
    manifest[name] = [...new Uint8Array(await subtle.digest("SHA-1", data as BufferSource))].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  const manifestBytes = strToU8(JSON.stringify(manifest));
  const digest = new Uint8Array(await subtle.digest("SHA-256", manifestBytes));
  const attrs = [
    der(0x30, oid("1.2.840.113549.1.9.3"), der(0x31, oid("1.2.840.113549.1.7.1"))),
    der(0x30, oid("1.2.840.113549.1.9.4"), der(0x31, der(4, digest))),
  ];
  const attrsSet = der(0x31, ...attrs);
  const sig = new Uint8Array(await subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, attrsSet as BufferSource));
  const sha256 = der(0x30, oid("2.16.840.1.101.3.4.2.1"), NULL);
  const signerInfo = der(0x30, der(2, Uint8Array.of(1)), der(0x30, issuer, serial), sha256, der(0xa0, ...attrs), der(0x30, oid("1.2.840.113549.1.1.1"), NULL), der(4, sig));
  const signedData = der(0x30, der(2, Uint8Array.of(1)), der(0x31, sha256), der(0x30, oid("1.2.840.113549.1.7.1")), der(0xa0, cert), der(0x31, signerInfo));
  const signature = der(0x30, oid("1.2.840.113549.1.7.2"), der(0xa0, signedData));
  return zipSync({
    ...files,
    ...(opts.tamperFile ? { "icon.png": strToU8("other bytes") } : {}),
    "manifest.json": opts.tamperManifest ? strToU8(JSON.stringify({ ...manifest, extra: "00" })) : manifestBytes,
    signature,
  });
}
