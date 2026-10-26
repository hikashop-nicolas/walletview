import { describe, expect, it } from "vitest";
import { strToU8 } from "fflate";
import { readWallet } from "./read";
import { translator } from "./i18n";
import { healthCardFile, healthCardLink, makeHealthCardJws } from "../fixtures/make-pass";

const t = translator();
// Sample strings from the IATA BCBP implementation guide, as used by the bcbp library's tests.
const ONE_LEG = "M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 106>60000";
const TWO_LEGS =
  "M2DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 14D>6181WW6225BAC 00141234560032A0141234567890 1AC AC 1234567890123    20KYLX58ZDEF456 FRAGVALH 3664 227C012C0002 12E2A0140987654321 1AC AC 1234567890123    2PCNWQ";
const flat = (fields: { label: string; value: string }[]) => Object.fromEntries(fields.map((f) => [f.label, f.value]));

describe("boarding pass text", () => {
  it("decodes a one-leg pass", () => {
    const [card] = readWallet(strToU8(ONE_LEG + "\n"), ["en"], t);
    expect(card!.style).toBe("boardingPass");
    expect(card!.primary.map((f) => f.value)).toEqual(["YUL", "FRA"]);
    expect(card!.header[0]!.value).toBe("1A");
    expect(flat(card!.auxiliary)).toMatchObject({ Flight: "AC 834", "Booking reference": "ABC123" });
    expect(flat(card!.secondary).Passenger).toBe("DESMARAIS/LUC");
  });

  it("makes one card per leg", () => {
    const cards = readWallet(strToU8(TWO_LEGS), ["en"], t);
    expect(cards.map((c) => c.primary.map((f) => f.value).join(">"))).toEqual(["YUL>FRA", "FRA>GVA"]);
  });

  it("does not take ordinary text for a boarding pass", () => {
    expect(() => readWallet(strToU8("Meeting notes for Monday, nothing to see here at all, just text."), ["en"], t)).toThrow();
  });
});

describe("SMART Health Card", () => {
  const jws = makeHealthCardJws([
    { resourceType: "Observation", code: { text: "SARS-CoV-2 test" }, valueCodeableConcept: { text: "Negative" }, effectiveDateTime: "2022-01-02T10:00:00Z" },
  ]);

  it("reads a .smart-health-card file", () => {
    const [card] = readWallet(healthCardFile(jws), ["en-GB"], t);
    expect(card!.primary[0]!.value).toBe("Jane Q. Example");
    expect(card!.secondary[0]!.value).toMatch(/3 Feb 1980/);
    expect(card!.auxiliary[0]).toMatchObject({ label: "Pfizer-BioNTech" });
    expect(card!.auxiliary[1]!.label).toBe("SARS-CoV-2 test");
    expect(card!.back.some((f) => f.value.includes("LOT42"))).toBe(true);
    expect(card!.back.some((f) => f.value === "https://issuer.example.com/demo")).toBe(true);
  });

  it("gives the card a QR that reproduces the shc link", () => {
    const [card] = readWallet(healthCardFile(jws), ["en"], t);
    expect(card!.barcodes).toHaveLength(1);
    expect(card!.barcodes[0]!.message).toBe(healthCardLink(jws));
  });

  it("reads a pasted shc link and a bare JWS", () => {
    expect(readWallet(strToU8(healthCardLink(jws)), ["en"], t)[0]!.primary[0]!.value).toBe("Jane Q. Example");
    expect(readWallet(strToU8(jws), ["en"], t)[0]!.primary[0]!.value).toBe("Jane Q. Example");
  });

  it("splits a large card into numbered QR codes", () => {
    // pseudo-random text does not deflate, so the card really is big
    let seed = 7;
    const noise = () => Array.from({ length: 60 }, () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 8).toString(36)).join("");
    const big = makeHealthCardJws(Array.from({ length: 30 }, (_, i) => ({ resourceType: "Observation", code: { text: `Test ${i}` }, valueString: noise() })));
    const [card] = readWallet(healthCardFile(big), ["en"], t);
    expect(card!.barcodes.length).toBeGreaterThan(1);
    expect(card!.barcodes[0]!.message).toMatch(/^shc:\/1\/\d+\//);
    for (const b of card!.barcodes) expect(b.message.length).toBeLessThanOrEqual(2400);
    // the chunks join back into the same link
    const joined = card!.barcodes.map((b) => b.message.replace(/^shc:\/\d+\/\d+\//, "")).join("");
    expect(joined).toBe(healthCardLink(big).slice(5));
  });

  it("rejects malformed cards", () => {
    expect(() => readWallet(strToU8('{"verifiableCredential": 5}'), ["en"], t)).toThrow();
    expect(() => readWallet(strToU8("shc:/1/2/5677"), ["en"], t)).toThrow(/missing/);
    expect(() => readWallet(strToU8("eyJhIjoxfQ.eyJhIjoxfQ.sig"), ["en"], t)).toThrow();
  });
});
