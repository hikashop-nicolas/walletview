// Issuers are websites: refuse anything that is not a plain https address with a real domain
// name, so a card cannot point the request at a device on the person's own network.
export function issuerHost(iss: string): string | null {
  let u: URL;
  try {
    u = new URL(iss);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const plain = u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash;
  const named = host.includes(".") && !/^[\d.]+$/.test(host) && !host.includes(":") && !host.startsWith("[");
  const local = /(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host);
  return plain && named && !local ? host : null;
}

