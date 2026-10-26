// walletview: a standalone, framework-agnostic, client-side viewer for wallet passes.
// Bytes in, a rendered card out. Today it opens Apple Wallet .pkpass and .pkpasses files.

import { ensureStyles } from "./styles";
import { preferredLanguages, translator, type Dict } from "./i18n";
import { looksLikeZip, readPkpass } from "./pkpass";
import { renderCard } from "./render";
import type { Card } from "./model";

export interface WalletInput {
  bytes: Uint8Array;
  filename?: string;
}

export interface WalletViewOptions {
  // Languages to pick the pass translations by; defaults to the browser's.
  languages?: string[];
  // Per-instance string overrides layered on the detected locale.
  i18n?: Dict;
}

export interface WalletViewHandle {
  destroy(): void;
}

function message(root: HTMLElement, text: string): void {
  const m = document.createElement("div");
  m.className = "wv-msg";
  m.textContent = text;
  root.appendChild(m);
}

export function createWalletView(
  container: HTMLElement,
  input: WalletInput,
  options: WalletViewOptions = {},
): WalletViewHandle {
  ensureStyles();
  const t = translator(options.i18n);
  const root = document.createElement("div");
  root.className = "wv-root";
  container.appendChild(root);

  let alive = true;
  const urls: string[] = [];
  let cards: Card[] = [];
  try {
    if (!looksLikeZip(input.bytes)) throw new Error("not a zip archive");
    cards = readPkpass(input.bytes, options.languages ?? preferredLanguages());
    const list = document.createElement("div");
    list.className = "wv-list";
    cards.forEach((card, i) => {
      if (cards.length > 1) {
        const c = document.createElement("p");
        c.className = "wv-count";
        c.textContent = t("passN", { n: i + 1, total: cards.length });
        list.appendChild(c);
      }
      list.appendChild(renderCard(card, t, () => alive, urls));
    });
    root.appendChild(list);
  } catch (e) {
    message(root, `${t("cannotOpen")}\n${(e as Error)?.message ?? ""}`.trim());
  }

  return {
    destroy() {
      alive = false;
      for (const card of cards) card.release();
      for (const u of urls.splice(0)) URL.revokeObjectURL(u);
      root.remove();
    },
  };
}

export { readPkpass, looksLikeZip } from "./pkpass";
export { setLocale, type Dict } from "./i18n";
export type { Card, CardField, CardBarcode, CardStyle } from "./model";
