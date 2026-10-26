// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWalletView } from "./index";
import { boardingPassJson, healthCardFile, makeBundle, makePkpass, signedHealthCard, signedPkpass } from "../fixtures/make-pass";

vi.mock("./barcode", () => ({ drawBarcode: vi.fn(async () => "blob:fake-barcode") }));

// Node 24 defines its own half-working localStorage global, so give the tests a plain one.
beforeEach(() => {
  const memory = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, String(v)),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
  });
});

const mount = () => document.body.appendChild(document.createElement("div"));

describe("createWalletView", () => {
  it("draws a boarding pass with its fields, notes and back section", async () => {
    const host = mount();
    const handle = createWalletView(host, { bytes: makePkpass() }, { languages: ["en"] });
    await new Promise((r) => setTimeout(r, 20));
    const text = host.textContent ?? "";
    expect(text).toContain("PAR");
    expect(text).toContain("LIS");
    expect(text).toContain("Details");
    expect(text).toContain("Not verified");
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

  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  it("shows one quiet line until a signature is checked, and none for text-only cards", async () => {
    const host = mount();
    createWalletView(host, { bytes: await signedPkpass() }, { languages: ["en"] });
    await settle();
    expect(host.querySelector(".wv-sig")?.textContent).toBe("Not verifiedCheck signature");
    const text = mount();
    createWalletView(text, { bytes: new TextEncoder().encode("M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 106>60000") }, { languages: ["en"] });
    await settle();
    expect(text.querySelector(".wv-sig")).toBeNull();
  });

  it("remembers a good check so the same file opens as signed", async () => {
    localStorage.clear();
    const bytes = await signedPkpass();
    const first = mount();
    createWalletView(first, { bytes }, { languages: ["en"] });
    await settle();
    first.querySelector<HTMLButtonElement>(".wv-link")!.click();
    await settle();
    await settle();
    expect(first.querySelector(".wv-sig summary")?.textContent).toBe("\u2713 Signed by Demo Airways");

    const again = mount();
    createWalletView(again, { bytes }, { languages: ["en"] });
    await settle();
    expect(again.querySelector(".wv-sig summary")?.textContent).toBe("\u2713 Signed by Demo Airways");
    expect(again.textContent).toContain("Checked");

    // a different file does not inherit it, and neither does a viewer told not to remember
    const other = mount();
    createWalletView(other, { bytes: await signedPkpass({ tamperFile: true }) }, { languages: ["en"] });
    await settle();
    expect(other.querySelector(".wv-sig")?.textContent).toContain("Not verified");
    const forgetful = mount();
    createWalletView(forgetful, { bytes }, { languages: ["en"], rememberChecks: false });
    await settle();
    expect(forgetful.querySelector(".wv-sig")?.textContent).toContain("Not verified");
  });

  it("does not remember a failed check, and asks before contacting the issuer", async () => {
    localStorage.clear();
    const { jws } = await signedHealthCard({ iss: "https://issuer.example.com" });
    // the issuer serves a different key under the card's key id
    const kid = JSON.parse(atob(jws.split(".")[0]!.replace(/-/g, "+").replace(/_/g, "/"))).kid;
    const other = await signedHealthCard();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [{ ...other.jwks.keys[0], kid }] }))));
    const confirm = vi.fn(async () => true);
    const host = mount();
    createWalletView(host, { bytes: healthCardFile(jws) }, { languages: ["en"], confirmFetch: confirm });
    await settle();
    expect(host.querySelector(".wv-link")?.textContent).toBe("Check with issuer.example.com");
    host.querySelector<HTMLButtonElement>(".wv-link")!.click();
    await settle();
    await settle();
    expect(confirm).toHaveBeenCalledWith("https://issuer.example.com/.well-known/jwks.json");
    expect(host.querySelector(".wv-sig")?.textContent).toBe("\u2717 Key does not match its id");
    expect(localStorage.getItem("walletview:checks")).toBeNull();
    vi.unstubAllGlobals();
  });
});
