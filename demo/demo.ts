import { createWalletView, type WalletViewHandle } from "../src/index";
import { eventTicketJson, makeBundle, makePkpass } from "../fixtures/make-pass";

const viewerEl = document.getElementById("viewer")!;
let handle: WalletViewHandle | null = null;

function show(bytes: Uint8Array, filename: string): void {
  handle?.destroy();
  viewerEl.textContent = "";
  handle = createWalletView(viewerEl, { bytes, filename });
}

async function open(file: File): Promise<void> {
  show(new Uint8Array(await file.arrayBuffer()), file.name);
}

document.getElementById("file")!.addEventListener("change", (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) void open(f);
});
document.getElementById("s1")!.addEventListener("click", () => show(makePkpass(), "boarding.pkpass"));
document.getElementById("s2")!.addEventListener("click", () => show(makePkpass({ json: eventTicketJson() }), "ticket.pkpass"));
document.getElementById("s3")!.addEventListener("click", () =>
  show(makeBundle([makePkpass(), makePkpass({ json: eventTicketJson() })]), "bundle.pkpasses"),
);
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files[0];
  if (f) void open(f);
});

const hash = new URLSearchParams(location.search).get("sample");
if (hash === "1") document.getElementById("s1")!.click();
if (hash === "2") document.getElementById("s2")!.click();
if (hash === "3") document.getElementById("s3")!.click();
