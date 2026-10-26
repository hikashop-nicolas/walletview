// Synthetic passes for the tests and the demo. Every name, code and number is invented.

import { deflateSync, strToU8, zipSync } from "fflate";

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
