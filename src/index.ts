// walletview: a standalone, framework-agnostic, client-side viewer for wallet passes.
// Bytes in, a rendered card out. It opens Apple Wallet .pkpass and .pkpasses files, SMART Health Cards, and IATA boarding pass barcode text.

import { ensureStyles } from "./styles";
import { preferredLanguages, translator, type Dict } from "./i18n";
import { readWallet } from "./read";
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
  // Asked before a signature check contacts a website (health cards fetch the issuer's key).
  // Return false to cancel. Without it the check runs on the button press alone.
  confirmFetch?: (url: string) => Promise<boolean>;
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
    cards = readWallet(input.bytes, options.languages ?? preferredLanguages(), t);
    const list = document.createElement("div");
    list.className = "wv-list";
    cards.forEach((card, i) => {
      if (cards.length > 1) {
        const c = document.createElement("p");
        c.className = "wv-count";
        c.textContent = t("passN", { n: i + 1, total: cards.length });
        list.appendChild(c);
      }
      list.appendChild(renderCard(card, t, () => alive, urls, options.confirmFetch));
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
export { readWallet } from "./read";
export { readBoardingPass, looksLikeBcbp } from "./boardingpass";
export { readHealthCard, looksLikeHealthCard } from "./healthcard";
export { setLocale, type Dict } from "./i18n";
export { verifyHealthCard, verifyPkpass } from "./verify";
export type { Card, CardField, CardBarcode, CardStyle, VerifyOutcome } from "./model";
