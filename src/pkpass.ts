// Reader for Apple Wallet passes: a .pkpass is a zip holding pass.json, images and one
// pass.strings per language; a .pkpasses is a zip of several .pkpass files. Only the files
// the viewer uses are inflated, and their names never reach a path or a URL.

import { unzipSync } from "fflate";
import type { Card, CardBarcode, CardField, CardImages, CardStyle } from "./model";
import { decodeStrings, parseStrings } from "./strings";

const MAX_ENTRIES = 600;
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_PASSES = 50;

const IMAGE_NAMES = ["logo", "icon", "strip", "thumbnail", "background", "footer"] as const;
const LPROJ = "(?:[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*|Base)\\.lproj";
const WANTED = new RegExp(
  `^(?:pass\\.json|(?:${LPROJ}/)?(?:pass\\.strings|(?:${IMAGE_NAMES.join("|")})(?:@[23]x)?\\.(?:png|jpe?g)))$`,
);
const STYLES: CardStyle[] = ["boardingPass", "eventTicket", "coupon", "storeCard", "generic"];
const FORMATS: Record<string, CardBarcode["format"]> = {
  PKBarcodeFormatQR: "qr",
  PKBarcodeFormatPDF417: "pdf417",
  PKBarcodeFormatAztec: "aztec",
  PKBarcodeFormatCode128: "code128",
};
const TRANSIT: Record<string, NonNullable<Card["transit"]>> = {
  PKTransitTypeAir: "air",
  PKTransitTypeTrain: "train",
  PKTransitTypeBus: "bus",
  PKTransitTypeBoat: "boat",
  PKTransitTypeGeneric: "generic",
};
const DATE_STYLES: Record<string, "short" | "medium" | "long" | "full"> = {
  PKDateStyleShort: "short",
  PKDateStyleMedium: "medium",
  PKDateStyleLong: "long",
  PKDateStyleFull: "full",
};

type Files = Record<string, Uint8Array>;
type Json = Record<string, unknown>;

class Budget {
  entries = 0;
  bytes = 0;
  take(size: number): void {
    if (++this.entries > MAX_ENTRIES) throw new Error("too many files in the archive");
    this.bytes += size;
    if (this.bytes > MAX_BYTES) throw new Error("the archive is too large");
  }
}

function unzipWanted(bytes: Uint8Array, budget: Budget, want: (name: string) => boolean): Files {
  return unzipSync(bytes, {
    filter: (f) => {
      if (!want(f.name)) return false;
      budget.take(f.originalSize);
      return true;
    },
  });
}

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function color(v: unknown): string | undefined {
  const m = typeof v === "string" ? /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(v) : null;
  if (!m) return undefined;
  const c = (s: string) => Math.min(255, Number(s));
  return `rgb(${c(m[1]!)}, ${c(m[2]!)}, ${c(m[3]!)})`;
}

function norm(code: string): string {
  return code.replace(/_/g, "-").toLowerCase();
}

// The lproj folders to consult, best match first: each preferred language (full code, then
// its base), then English, then Base.
function localeFolders(files: Files, langs: string[]): string[] {
  const folders = new Map<string, string>();
  for (const name of Object.keys(files)) {
    const m = /^([^/]+)\.lproj\//.exec(name);
    if (m) folders.set(norm(m[1]!), m[1]! + ".lproj");
  }
  const order: string[] = [];
  for (const l of [...langs, "en", "base"]) {
    for (const code of [norm(l), norm(l).split("-")[0]!]) {
      const dir = folders.get(code);
      if (dir && !order.includes(dir)) order.push(dir);
    }
  }
  return order;
}

function mimeOf(name: string): string {
  return /\.jpe?g$/i.test(name) ? "image/jpeg" : "image/png";
}

function fieldValue(f: Json, tr: (k: string) => string, lang: string | undefined): string {
  const v = f.value;
  if (typeof v === "number") {
    const currency = typeof f.currencyCode === "string" ? f.currencyCode : undefined;
    try {
      if (currency) return new Intl.NumberFormat(lang, { style: "currency", currency }).format(v);
      if (f.numberStyle === "PKNumberStylePercent") return new Intl.NumberFormat(lang, { style: "percent" }).format(v);
    } catch {
      // an unknown currency code: fall through to the plain number
    }
    return String(v);
  }
  if (typeof v !== "string") return "";
  const dateStyle = DATE_STYLES[String(f.dateStyle)];
  const timeStyle = DATE_STYLES[String(f.timeStyle)];
  if (dateStyle || timeStyle) {
    const wallClock = f.ignoresTimeZone === true;
    const text = wallClock ? v.replace(/(?:[zZ]|[+-]\d\d:?\d\d)$/, "") + "Z" : v;
    const d = new Date(text);
    if (!Number.isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat(lang, { dateStyle, timeStyle, ...(wallClock ? { timeZone: "UTC" } : {}) }).format(d);
      } catch {
        // fall through to the raw text
      }
    }
  }
  return tr(v);
}

function readFields(list: unknown, tr: (k: string) => string, lang: string | undefined): CardField[] {
  if (!Array.isArray(list)) return [];
  const out: CardField[] = [];
  for (const f of list) {
    if (!isObject(f)) continue;
    const label = typeof f.label === "string" ? tr(f.label) : "";
    const value = fieldValue(f, tr, lang);
    if (label || value) out.push({ label, value });
  }
  return out;
}

function readBarcodes(d: Json): CardBarcode[] {
  const list = Array.isArray(d.barcodes) ? d.barcodes : d.barcode ? [d.barcode] : [];
  const out: CardBarcode[] = [];
  for (const b of list) {
    if (!isObject(b) || typeof b.message !== "string") continue;
    const format = FORMATS[String(b.format)];
    if (!format) continue;
    out.push({ format, message: b.message, altText: typeof b.altText === "string" ? b.altText : undefined });
  }
  return out;
}

function readPass(files: Files, langs: string[]): Card {
  const raw = files["pass.json"];
  if (!raw) throw new Error("pass.json is missing");
  const parsed: unknown = JSON.parse(new TextDecoder().decode(raw).replace(/^﻿/, ""));
  if (!isObject(parsed)) throw new Error("pass.json is not an object");
  const style = STYLES.find((s) => isObject(parsed[s]));
  if (!style) throw new Error("the pass has no style section");
  const section = parsed[style] as Json;

  const folders = localeFolders(files, langs);
  const dicts = folders
    .map((dir) => files[`${dir}/pass.strings`])
    .filter((b): b is Uint8Array => !!b)
    .map((b) => parseStrings(decodeStrings(b)));
  const tr = (key: string): string => {
    for (const dict of dicts) {
      const hit = dict.get(key);
      if (hit !== undefined) return hit;
    }
    return key;
  };
  const lang = langs[0];

  const urls: string[] = [];
  const image = (name: string): string | undefined => {
    for (const dir of [...folders.map((d) => d + "/"), ""]) {
      for (const suffix of ["@2x", "", "@3x"]) {
        for (const ext of ["png", "jpg", "jpeg"]) {
          const bytes = files[`${dir}${name}${suffix}.${ext}`];
          if (!bytes) continue;
          const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeOf(ext) }));
          urls.push(url);
          return url;
        }
      }
    }
    return undefined;
  };
  const images: CardImages = {};
  for (const name of IMAGE_NAMES) images[name] = image(name);

  const expiry = typeof parsed.expirationDate === "string" ? Date.parse(parsed.expirationDate) : NaN;
  return {
    style,
    transit: TRANSIT[String(section.transitType)],
    organization: typeof parsed.organizationName === "string" ? parsed.organizationName : "",
    description: typeof parsed.description === "string" ? tr(parsed.description) : "",
    logoText: typeof parsed.logoText === "string" ? tr(parsed.logoText) : undefined,
    colors: {
      background: color(parsed.backgroundColor),
      foreground: color(parsed.foregroundColor),
      label: color(parsed.labelColor),
    },
    header: readFields(section.headerFields, tr, lang),
    primary: readFields(section.primaryFields, tr, lang),
    secondary: readFields(section.secondaryFields, tr, lang),
    auxiliary: readFields(section.auxiliaryFields, tr, lang),
    back: readFields(section.backFields, tr, lang),
    barcodes: readBarcodes(parsed),
    images,
    voided: parsed.voided === true,
    expired: !Number.isNaN(expiry) && expiry < Date.now(),
    release: () => {
      for (const u of urls.splice(0)) URL.revokeObjectURL(u);
    },
  };
}

export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5);
}

// One card for a .pkpass, one per pass for a .pkpasses. Throws when nothing can be shown.
export function readPkpass(bytes: Uint8Array, langs: string[]): Card[] {
  const budget = new Budget();
  const outer = unzipWanted(bytes, budget, (n) => WANTED.test(n) || /\.pkpass$/i.test(n));
  if (outer["pass.json"]) return [readPass(outer, langs)];
  const inner = Object.keys(outer)
    .filter((n) => /\.pkpass$/i.test(n))
    .sort()
    .slice(0, MAX_PASSES);
  const cards: Card[] = [];
  let failure: unknown = null;
  for (const name of inner) {
    try {
      cards.push(readPass(unzipWanted(outer[name]!, budget, (n) => WANTED.test(n)), langs));
    } catch (e) {
      failure = e;
    }
  }
  if (!cards.length) throw failure ?? new Error("no pass found in the archive");
  return cards;
}
