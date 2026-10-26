// Draws a pass barcode as an SVG blob URL. bwip-js is big, so it loads on the first pass
// that has a barcode.

import type { CardBarcode } from "./model";

interface Bwip {
  toSVG(opts: Record<string, unknown>): string;
}

const OPTIONS: Record<CardBarcode["format"], Record<string, unknown>> = {
  qr: { bcid: "qrcode", eclevel: "M", scale: 4 },
  pdf417: { bcid: "pdf417", scale: 2, height: 10 },
  aztec: { bcid: "azteccode", scale: 4 },
  code128: { bcid: "code128", scale: 2, height: 18 },
};

export async function drawBarcode(b: CardBarcode): Promise<string> {
  const mod = (await import("bwip-js")) as unknown as { default?: Bwip } & Bwip;
  const bwip: Bwip = mod.default ?? mod;
  const svg = bwip.toSVG({ ...OPTIONS[b.format], text: b.message, padding: 2, includetext: false });
  return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
}
