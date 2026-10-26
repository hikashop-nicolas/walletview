import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readPkpass } from "./pkpass";
import { boardingPassJson, eventTicketJson, makeBundle, makePkpass } from "../fixtures/make-pass";

const all = (fields: { label: string; value: string }[]) => fields.map((f) => `${f.label}=${f.value}`);

describe("readPkpass", () => {
  it("reads a boarding pass and picks English strings by default", () => {
    const [card] = readPkpass(makePkpass(), ["en-US"]);
    expect(card!.style).toBe("boardingPass");
    expect(card!.transit).toBe("air");
    expect(all(card!.primary)).toEqual(["FROM=PAR", "TO=LIS"]);
    expect(card!.header[0]).toEqual({ label: "Seat", value: "12A" });
    expect(card!.barcodes[0]).toMatchObject({ format: "qr" });
    expect(card!.images.logo).toBeTruthy();
    card!.release();
  });

  it("follows the preferred language, then falls back", () => {
    const fr = readPkpass(makePkpass(), ["fr-FR", "en"])[0]!;
    expect(fr.header[0]!.label).toBe("Siège");
    expect(fr.secondary[1]!.label).toBe("Classe");
    // a key missing from the French file comes from English, and a key in neither stays raw
    const mixed = readPkpass(makePkpass(), ["fr"])[0]!;
    expect(mixed.secondary[0]!.label).toBe("PASSENGER");
    const de = readPkpass(makePkpass(), ["de"])[0]!;
    expect(de.header[0]!.label).toBe("Seat");
  });

  it("shows the written wall-clock time when the pass ignores the time zone", () => {
    const [card] = readPkpass(makePkpass(), ["en-GB"]);
    const time = card!.auxiliary.find((f) => f.label === "DEPARTS")!.value;
    expect(time).toMatch(/08:30/);
    expect(card!.auxiliary.find((f) => f.label === "DATE")!.value).toMatch(/3 Jun 2026/);
  });

  it("formats currency and reads a single barcode entry", () => {
    const [card] = readPkpass(makePkpass({ json: eventTicketJson() }), ["en-GB"]);
    expect(card!.style).toBe("eventTicket");
    expect(card!.secondary.find((f) => f.label === "PRICE")!.value).toContain("42.50");
    expect(card!.barcodes[0]).toMatchObject({ format: "pdf417", altText: "0002" });
  });

  it("drops colours that are not plain rgb()", () => {
    const json = { ...boardingPassJson(), backgroundColor: "red; background:url(x)", foregroundColor: "rgb(300, 1, 2)" };
    const [card] = readPkpass(makePkpass({ json }), ["en"]);
    expect(card!.colors.background).toBeUndefined();
    expect(card!.colors.foreground).toBe("rgb(255, 1, 2)");
  });

  it("skips unsupported barcode formats and flags voided and expired passes", () => {
    const json = { ...boardingPassJson(), barcodes: [{ format: "PKBarcodeFormatOther", message: "x" }], voided: true, expirationDate: "2001-01-01T00:00:00Z" };
    const [card] = readPkpass(makePkpass({ json }), ["en"]);
    expect(card!.barcodes).toEqual([]);
    expect(card!.voided).toBe(true);
    expect(card!.expired).toBe(true);
  });

  it("opens a .pkpasses bundle as one card per pass", () => {
    const cards = readPkpass(makeBundle([makePkpass(), makePkpass({ json: eventTicketJson() })]), ["en"]);
    expect(cards.map((c) => c.style)).toEqual(["boardingPass", "eventTicket"]);
  });

  it("ignores files it does not use", () => {
    const bytes = makePkpass({ files: { "../../evil.png": strToU8("x"), "__MACOSX/._pass.json": strToU8("x") } });
    expect(readPkpass(bytes, ["en"])).toHaveLength(1);
  });

  it("rejects archives that are not passes", () => {
    expect(() => readPkpass(zipSync({ "readme.txt": strToU8("hi") }), ["en"])).toThrow();
    expect(() => readPkpass(zipSync({ "pass.json": strToU8("{}") }), ["en"])).toThrow(/style/);
    expect(() => readPkpass(zipSync({ "pass.json": strToU8("[1]") }), ["en"])).toThrow();
  });

  it("refuses an archive with too many entries", () => {
    const files: Record<string, Uint8Array> = { "pass.json": strToU8(JSON.stringify(boardingPassJson())) };
    for (let i = 0; i < 700; i++) files[`logo${i}.png`] = strToU8("x");
    for (let i = 0; i < 700; i++) files[`en.lproj/strip${i}.png`] = strToU8("x");
    const many = zipSync({ ...files, ...Object.fromEntries(Array.from({ length: 700 }, (_, i) => [`${i}.pkpass`, strToU8("x")])) });
    expect(() => readPkpass(many, ["en"])).toThrow(/too many/);
  });
});
