// Draws a Card into the DOM. All text goes through textContent; the only attribute values
// taken from a pass are validated colors and blob URLs this library created.

import { drawBarcode } from "./barcode";
import type { Card, CardField } from "./model";

type T = (key: string, vars?: Record<string, string | number>) => string;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function img(src: string, className: string): HTMLImageElement {
  const i = el("img", className);
  i.src = src;
  i.alt = "";
  i.decoding = "async";
  return i;
}

// Plain text with web links turned into anchors.
function appendLinked(parent: HTMLElement, text: string): void {
  const parts = text.split(/(https?:\/\/[^\s<>"]+)/);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const a = el("a", undefined, part);
      a.href = part;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      parent.appendChild(a);
    } else if (part) parent.appendChild(document.createTextNode(part));
  });
}

function fieldList(fields: CardField[], className: string): HTMLElement | null {
  if (!fields.length) return null;
  const dl = el("dl", `wv-fields ${className}`);
  for (const f of fields) {
    const row = el("div");
    row.append(el("dt", undefined, f.label), el("dd", undefined, f.value));
    dl.appendChild(row);
  }
  return dl;
}

function primaryRow(card: Card): HTMLElement | null {
  if (!card.primary.length) return null;
  if (card.style !== "boardingPass" || card.primary.length < 2) return fieldList(card.primary, "wv-primary");
  const wrap = el("div", "wv-fields wv-primary");
  card.primary.slice(0, 2).forEach((f, i) => {
    if (i === 1) wrap.appendChild(el("span", "wv-arrow", "→"));
    const cell = el("dl");
    cell.style.margin = "0";
    const row = el("div");
    row.append(el("dt", undefined, f.label), el("dd", undefined, f.value));
    cell.appendChild(row);
    wrap.appendChild(cell);
  });
  return wrap;
}

function barcodeBox(card: Card, t: T, alive: () => boolean, urls: string[]): HTMLElement | null {
  const b = card.barcodes[0];
  if (!b) return null;
  const box = el("div", "wv-code");
  drawBarcode(b).then(
    (url) => {
      if (!alive()) return URL.revokeObjectURL(url);
      urls.push(url);
      const i = img(url, b.format === "qr" || b.format === "aztec" ? "wv-sq" : "");
      i.alt = b.altText || t("barcode");
      box.prepend(i);
    },
    () => {
      if (alive()) box.prepend(el("small", undefined, t("barcodeFailed")));
    },
  );
  const caption = b.altText ?? (b.format === "code128" ? b.message : "");
  if (caption) box.appendChild(el("small", undefined, caption));
  return box;
}

export function renderCard(card: Card, t: T, alive: () => boolean, urls: string[]): HTMLElement {
  const article = el("article", "wv-card");
  article.setAttribute("role", "group");
  article.setAttribute("aria-label", card.description || card.organization || card.logoText || "Pass");
  const { background, foreground, label } = card.colors;
  if (background) article.style.setProperty("--wv-bg", background);
  if (foreground) article.style.setProperty("--wv-fg", foreground);
  if (label) article.style.setProperty("--wv-label", label);
  if (card.images.background) article.appendChild(img(card.images.background, "wv-bgimg"));

  const top = el("div", "wv-top");
  if (card.images.logo) top.appendChild(img(card.images.logo, "wv-logo"));
  if (card.logoText) top.appendChild(el("span", "wv-logotext", card.logoText));
  const header = fieldList(card.header, "wv-header");
  if (header) top.appendChild(header);
  if (top.childElementCount) article.appendChild(top);

  const primary = primaryRow(card);
  if (card.images.thumbnail && primary) {
    const mid = el("div", "wv-mid");
    mid.append(primary, img(card.images.thumbnail, "wv-thumb"));
    article.appendChild(mid);
  } else if (primary) article.appendChild(primary);

  if (card.images.strip) article.appendChild(img(card.images.strip, "wv-strip"));
  for (const group of [card.secondary, card.auxiliary]) {
    const list = fieldList(group, "");
    if (list) article.appendChild(list);
  }
  const code = barcodeBox(card, t, alive, urls);
  if (code) article.appendChild(code);
  if (card.images.footer) article.appendChild(img(card.images.footer, "wv-footer"));

  const frag = el("div");
  frag.style.display = "contents";
  frag.appendChild(article);
  if (card.voided) frag.appendChild(el("p", "wv-note wv-note-warn", t("voided")));
  if (card.expired) frag.appendChild(el("p", "wv-note wv-note-warn", t("expired")));
  frag.appendChild(el("p", "wv-note", t("unverified")));
  if (card.back.length) {
    const back = el("section", "wv-back");
    back.appendChild(el("h2", undefined, t("details")));
    const dl = el("dl");
    for (const f of card.back) {
      dl.appendChild(el("dt", undefined, f.label));
      const dd = el("dd");
      appendLinked(dd, f.value);
      dl.appendChild(dd);
    }
    back.appendChild(dl);
    frag.appendChild(back);
  }
  return frag;
}
