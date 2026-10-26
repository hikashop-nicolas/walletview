# walletview

A standalone, framework-agnostic, **client-side** viewer for wallet passes. Feed it the bytes
of an Apple Wallet pass and it draws the card: logo, colours, flight or event fields, the
barcode, and the back-of-pass details. Everything runs on the user's machine, nothing is
uploaded.

Read-only. It opens:

- **.pkpass** and **.pkpasses** (a bundle of several passes), the Apple Wallet formats.
- **SMART Health Cards**: a `.smart-health-card` file, the `shc:/` text of its QR code, or a bare
  JWS. Shows the person, the vaccines or test results, the issuer, and redraws the QR code(s).
- **IATA boarding pass barcode text** (the string inside an airline barcode, via
  [bcbp](https://github.com/georgesmith46/bcbp)): one card per flight leg.

Google Wallet and Samsung Wallet hand out signed links, not files, so they are not read yet.

Used in production by **[Omnitext](https://hikashop-nicolas.github.io/omnitext/)**, a free
browser editor for practically any file, to open wallet passes.

## Usage

```ts
import { createWalletView } from "walletview";

const handle = createWalletView(
  document.getElementById("viewer")!,
  { bytes: myUint8Array, filename: "BoardingPass.pkpass" },
);

// later
handle.destroy();
```

Options: `languages` (the pass translation to prefer, default the browser's) and `i18n`
(overrides for the viewer's own strings). The viewer ships English, French, German, Spanish,
Portuguese, Russian and Chinese.

Theme it with the `--wv-canvas`, `--wv-text`, `--wv-muted`, `--wv-surface` and `--wv-border`
CSS variables on any ancestor. The card itself keeps the colours the pass asks for.

You can also read without drawing: `readWallet(bytes, languages, t)` returns a list of plain card
objects, and `readPkpass`, `readHealthCard` and `readBoardingPass` read one format each.

## What it does with a pass

- Picks the translated labels and values from the pass's own language folders, falling back to
  English, then to the raw keys.
- Formats dates, times, numbers and currencies in the viewer's locale.
- Draws QR, PDF417, Aztec and Code 128 barcodes with [bwip-js](https://github.com/metafloor/bwip-js),
  loaded only when a pass has one.
- Opens offline and checks no signature by itself. A **Check signature** button on the card does
  it on request:
  - a **health card** is checked against the public key its issuer publishes at
    `<issuer>/.well-known/jwks.json`. That is the one network request, made only when the button
    is pressed and only to an https website with a real domain name (never an IP address or a local
    name). It proves the card was not altered; whether to trust the issuer is up to you. Pass
    `confirmFetch` to ask first.
  - a **.pkpass** is checked against the hashes in its manifest and the signature over that
    manifest, using the certificate inside the file. This shows who signed it and that no file
    changed afterwards. It does not check the certificate chain up to Apple, so it cannot tell a
    genuine pass from one signed by someone else's certificate.
  - an IATA boarding pass string carries no signature to check.

  The card shows one quiet line: "Not verified" with the button. A good result becomes "Signed by
  ..." (tap it for the details) and is remembered in `localStorage`, keyed by a hash of the file,
  so the same file opens already marked as signed. Only the result is stored, never the file; a
  changed file does not inherit it, and a failed check is not stored. Pass `rememberChecks: false`
  to turn that off.
- Names vaccines (CVX) and lab tests (LOINC) from built-in tables, about 10 KB gzipped. The LOINC
  table is a subset of about 380 common tests; others show their code. See `NOTICE.md`.
- Treats the file as untrusted: only the files it needs are inflated and capped in number and
  size, text is never parsed as HTML, colours must be plain `rgb()` values, and links are
  limited to http and https.

## Development

```
npm install
npm test
npm run dev      # demo page with sample passes
```

The sample passes in `fixtures/` are generated, with invented names and codes. To try real files,
put them in a folder and run `WALLETVIEW_SAMPLES=/that/folder npm test`; the demo also opens
files copied to `demo/local/` with `?url=local/name.pkpass`. Neither folder is committed.

## License

MIT
