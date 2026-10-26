// Just enough ASN.1 (DER and the indefinite-length BER of CMS files) to read a signature.

export interface Der {
  tag: number;
  start: number; // offset of the tag byte
  body: number; // offset of the first content byte
  end: number; // offset just past the element, end-of-contents included
  contentEnd: number; // offset just past the content
  indefinite: boolean;
}

export function parseDer(b: Uint8Array, pos = 0, limit = b.length): Der {
  if (pos + 2 > limit) throw new Error("truncated ASN.1");
  const tag = b[pos]!;
  let i = pos + 1;
  let len = b[i++]!;
  if (len === 0x80) {
    const node: Der = { tag, start: pos, body: i, end: 0, contentEnd: 0, indefinite: true };
    let at = i;
    while (!(b[at] === 0 && b[at + 1] === 0)) {
      if (at >= limit) throw new Error("unterminated ASN.1");
      at = parseDer(b, at, limit).end;
    }
    node.contentEnd = at;
    node.end = at + 2;
    return node;
  }
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n > 4 || i + n > limit) throw new Error("bad ASN.1 length");
    len = 0;
    for (let k = 0; k < n; k++) len = len * 256 + b[i++]!;
  }
  if (i + len > limit) throw new Error("ASN.1 element runs past its parent");
  return { tag, start: pos, body: i, end: i + len, contentEnd: i + len, indefinite: false };
}

export function children(b: Uint8Array, n: Der): Der[] {
  const out: Der[] = [];
  for (let at = n.body; at < n.contentEnd; ) {
    const c = parseDer(b, at, n.contentEnd);
    out.push(c);
    at = c.end;
  }
  return out;
}

export const bytesOf = (b: Uint8Array, n: Der): Uint8Array => b.subarray(n.start, n.end);
export const contentOf = (b: Uint8Array, n: Der): Uint8Array => b.subarray(n.body, n.contentEnd);

export function oidOf(b: Uint8Array, n: Der): string {
  const c = contentOf(b, n);
  if (!c.length) return "";
  const parts: number[] = [Math.floor(c[0]! / 40), c[0]! % 40];
  let v = 0;
  for (let i = 1; i < c.length; i++) {
    v = v * 128 + (c[i]! & 0x7f);
    if (!(c[i]! & 0x80)) {
      parts.push(v);
      v = 0;
    }
  }
  return parts.join(".");
}

export function textOf(b: Uint8Array, n: Der): string {
  return new TextDecoder().decode(contentOf(b, n));
}
