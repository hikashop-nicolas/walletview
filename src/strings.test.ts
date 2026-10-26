import { describe, expect, it } from "vitest";
import { decodeStrings, parseStrings } from "./strings";
import { utf16le } from "../fixtures/make-pass";

describe("pass.strings", () => {
  it("parses pairs, comments and escapes", () => {
    const m = parseStrings(`/* head */\n"a" = "x";\n// line\n"b\\"q" = "l1\\nl2"; "c"="d" ;`);
    expect(m.get("a")).toBe("x");
    expect(m.get('b"q')).toBe("l1\nl2");
    expect(m.get("c")).toBe("d");
    expect(m.size).toBe(3);
  });

  it("decodes UTF-16 with a BOM and plain UTF-8", () => {
    expect(parseStrings(decodeStrings(utf16le('"é" = "ü";'))).get("é")).toBe("ü");
    expect(parseStrings(decodeStrings(new TextEncoder().encode('"k" = "日本";'))).get("k")).toBe("日本");
  });

  it("survives garbage and unterminated input", () => {
    expect(parseStrings('"a" = "b').get("a")).toBe("b");
    expect(parseStrings("= = ; ;\"").size).toBe(0);
  });
});
