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
- Does **not** check any signature, and says so on the card. A health card's signature needs the
  issuer's public key from the network, which a read-only offline viewer does not fetch.
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
