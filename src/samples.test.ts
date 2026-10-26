// Runs the viewer over real files when WALLETVIEW_SAMPLES points at a folder of them (not
// shipped: some carry third-party branding). Skipped in CI.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readWallet } from "./read";
import { translator } from "./i18n";

const dir = process.env.WALLETVIEW_SAMPLES;

describe.skipIf(!dir)("real sample files", () => {
  const files = dir ? fs.readdirSync(dir).filter((f) => /\.(pkpass|pkpasses|smart-health-card)$/.test(f)) : [];
  it("found some", () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    it(`reads ${f}`, () => {
      const cards = readWallet(new Uint8Array(fs.readFileSync(path.join(dir!, f))), ["en-US"], translator());
      expect(cards.length).toBeGreaterThan(0);
      for (const c of cards) {
        const shown = [...c.header, ...c.primary, ...c.secondary, ...c.auxiliary, ...c.back];
        expect(shown.length).toBeGreaterThan(0);
        expect(shown.every((x) => !/\[object|undefined|NaN/.test(x.value + x.label))).toBe(true);
        console.log(f, c.style, `fields=${shown.length}`, `barcodes=${c.barcodes.map((b) => b.format)}`, `images=${Object.entries(c.images).filter(([, v]) => v).map(([k]) => k)}`);
        c.release();
      }
    });
  }
});
