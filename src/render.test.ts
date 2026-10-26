// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createWalletView } from "./index";
import { boardingPassJson, makeBundle, makePkpass } from "../fixtures/make-pass";

vi.mock("./barcode", () => ({ drawBarcode: vi.fn(async () => "blob:fake-barcode") }));

const mount = () => document.body.appendChild(document.createElement("div"));

describe("createWalletView", () => {
  it("draws a boarding pass with its fields, notes and back section", async () => {
    const host = mount();
    const handle = createWalletView(host, { bytes: makePkpass() }, { languages: ["en"] });
    await new Promise((r) => setTimeout(r));
    const text = host.textContent ?? "";
    expect(text).toContain("PAR");
    expect(text).toContain("LIS");
    expect(text).toContain("Details");
    expect(text).toContain("Signature not checked.");
    expect(host.querySelector(".wv-arrow")).toBeTruthy();
    expect(host.querySelector(".wv-code img")?.getAttribute("alt")).toBe("Barcode");
    expect(host.querySelector<HTMLElement>(".wv-card")!.style.getPropertyValue("--wv-bg")).toBe("rgb(20, 47, 87)");
    handle.destroy();
    expect(host.querySelector(".wv-root")).toBeNull();
  });

  it("links only http(s) URLs and never builds HTML from pass text", () => {
    const json = boardingPassJson() as { boardingPass: { backFields: unknown[] } };
    json.boardingPass.backFields = [
      { key: "a", label: "A", value: "<img src=x onerror=alert(1)> see https://example.com/x and javascript:alert(1)" },
    ];
    const host = mount();
    createWalletView(host, { bytes: makePkpass({ json }) }, { languages: ["en"] });
    expect(host.querySelector("img[onerror]")).toBeNull();
    const links = [...host.querySelectorAll<HTMLAnchorElement>(".wv-back a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["https://example.com/x"]);
    expect(links[0]!.rel).toContain("noopener");
  });

  it("labels each pass of a bundle", () => {
    const host = mount();
    createWalletView(host, { bytes: makeBundle([makePkpass(), makePkpass()]) }, { languages: ["en"] });
    expect(host.querySelectorAll(".wv-card")).toHaveLength(2);
    expect(host.textContent).toContain("Pass 2 of 2");
  });

  it("shows a message instead of throwing on a file that is not a pass", () => {
    const host = mount();
    createWalletView(host, { bytes: new Uint8Array([1, 2, 3, 4, 5, 6]) });
    expect(host.querySelector(".wv-msg")?.textContent).toContain("could not be displayed");
  });
});
