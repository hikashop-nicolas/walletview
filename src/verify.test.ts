import { afterEach, describe, expect, it, vi } from "vitest";
import { issuerHost } from "./issuer";
import { translator } from "./i18n";
import { verifyHealthCard, verifyPkpass } from "./verify";
import { signedHealthCard, signedPkpass } from "../fixtures/make-pass";

const t = translator();
afterEach(() => vi.unstubAllGlobals());

const serve = (jwks: unknown, status = 200) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(jwks), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("health card signature", () => {
  it("accepts a card signed with the key the issuer publishes", async () => {
    const { jws, jwks } = await signedHealthCard({ iss: "https://issuer.example.com/path/" });
    const fetchMock = serve(jwks);
    const out = await verifyHealthCard(jws, t);
    expect(out.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("https://issuer.example.com/path/.well-known/jwks.json", expect.objectContaining({ credentials: "omit" }));
  });

  it("rejects a card whose payload changed after signing", async () => {
    const { jws, jwks } = await signedHealthCard({ iss: "https://issuer.example.com", tamper: true });
    serve(jwks);
    expect((await verifyHealthCard(jws, t)).status).toBe("failed");
  });

  it("rejects a signature made with a different key", async () => {
    const card = await signedHealthCard({ iss: "https://issuer.example.com" });
    const other = await signedHealthCard();
    serve({ keys: [{ ...other.jwks.keys[0], kid: card.jws.split(".")[0] ? JSON.parse(atob(card.jws.split(".")[0]!.replace(/-/g, "+").replace(/_/g, "/"))).kid : "" }] });
    expect((await verifyHealthCard(card.jws, t)).status).toBe("failed");
  });

  it("fails when the issuer does not publish the key id", async () => {
    const { jws } = await signedHealthCard({ iss: "https://issuer.example.com" });
    serve({ keys: [] });
    const out = await verifyHealthCard(jws, t);
    expect(out.status).toBe("failed");
    expect(out.lines[0]).toContain("issuer.example.com");
  });

  it("reports the network failing without calling the card invalid", async () => {
    const { jws } = await signedHealthCard({ iss: "https://issuer.example.com" });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect((await verifyHealthCard(jws, t)).status).toBe("unavailable");
    serve({}, 404);
    expect((await verifyHealthCard(jws, t)).status).toBe("unavailable");
  });

  it("does not fetch when the person cancels or the issuer address is unsafe", async () => {
    const { jws, jwks } = await signedHealthCard({ iss: "https://issuer.example.com" });
    const fetchMock = serve(jwks);
    expect((await verifyHealthCard(jws, t, async () => false)).status).toBe("unavailable");
    for (const iss of ["http://issuer.example.com", "https://192.168.0.5", "https://localhost", "https://printer.local", "https://user:pw@issuer.example.com", "https://[::1]", "https://intranet"]) {
      const card = await signedHealthCard({ iss });
      expect((await verifyHealthCard(card.jws, t)).status).toBe("unavailable");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only names ordinary https hosts", () => {
    expect(issuerHost("https://Issuer.Example.com/a")).toBe("issuer.example.com");
    expect(issuerHost("https://8.8.8.8")).toBeNull();
    expect(issuerHost("ftp://issuer.example.com")).toBeNull();
    expect(issuerHost("https://issuer.example.com?x=1")).toBeNull();
  });
});

describe("pkpass signature", () => {
  it("accepts a pass whose files match the signed list", async () => {
    const out = await verifyPkpass(await signedPkpass(), t);
    expect(out.status).toBe("ok");
    expect(out.lines[0]).toContain("Demo Airways");
    expect(out.lines[1]).toContain("Demo Pass CA");
  });

  it("names the files that changed after signing", async () => {
    const out = await verifyPkpass(await signedPkpass({ tamperFile: true }), t);
    expect(out.status).toBe("failed");
    expect(out.lines[0]).toContain("icon.png");
  });

  it("rejects a list that no longer matches the signature", async () => {
    expect((await verifyPkpass(await signedPkpass({ tamperManifest: true }), t)).status).toBe("failed");
  });

  it("says so when there is no signature", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const out = await verifyPkpass(zipSync({ "pass.json": strToU8("{}") }), t);
    expect(out.status).toBe("failed");
  });
});
