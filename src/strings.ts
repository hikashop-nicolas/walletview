// Parser for the pass.strings files of a .pkpass: "key" = "value"; pairs with C and C++
// comments, saved as UTF-16 (with a BOM) or UTF-8.

export function decodeStrings(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  return new TextDecoder("utf-8").decode(bytes);
}

const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\" };

export function parseStrings(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const n = text.length;
  let i = 0;
  const skip = (): void => {
    for (;;) {
      while (i < n && /\s/.test(text[i]!)) i++;
      if (text.startsWith("//", i)) {
        while (i < n && text[i] !== "\n") i++;
      } else if (text.startsWith("/*", i)) {
        const end = text.indexOf("*/", i + 2);
        i = end < 0 ? n : end + 2;
      } else return;
    }
  };
  const quoted = (): string | null => {
    if (text[i] !== '"') return null;
    i++;
    let s = "";
    while (i < n && text[i] !== '"') {
      if (text[i] === "\\" && i + 1 < n) {
        const c = text[i + 1]!;
        s += ESCAPES[c] ?? c;
        i += 2;
      } else s += text[i++];
    }
    i++;
    return s;
  };
  while (i < n) {
    skip();
    const key = quoted();
    if (key === null) {
      i++;
      continue;
    }
    skip();
    if (text[i] !== "=") continue;
    i++;
    skip();
    const value = quoted();
    if (value !== null) out.set(key, value);
    skip();
    if (text[i] === ";") i++;
  }
  return out;
}
