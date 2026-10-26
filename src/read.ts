// Picks the reader that fits the bytes: a zip is an Apple Wallet pass, text is a health card or
// a boarding pass barcode string.

import { looksLikeBcbp, readBoardingPass } from "./boardingpass";
import { looksLikeHealthCard, readHealthCard } from "./healthcard";
import type { Card } from "./model";
import { looksLikeZip, readPkpass } from "./pkpass";

const MAX_TEXT = 2 * 1024 * 1024;

export function readWallet(
  bytes: Uint8Array,
  langs: string[],
  t: (key: string) => string,
): Card[] {
  if (looksLikeZip(bytes)) return readPkpass(bytes, langs);
  if (bytes.length <= MAX_TEXT && !bytes.subarray(0, 4096).includes(0)) {
    const text = new TextDecoder().decode(bytes).replace(/^﻿/, "");
    if (looksLikeHealthCard(text)) return readHealthCard(text, t, langs[0]);
    if (looksLikeBcbp(text.trim())) return readBoardingPass(text.trim(), t, langs[0]);
  }
  throw new Error("not a wallet pass or card");
}
