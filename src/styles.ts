const STYLE_ID = "walletview-style";

// Hosts theme the viewer through the --wv-* variables on any ancestor.
const CSS = `
.wv-root { --wv-canvas:#f2f3f5; --wv-text:#1c1e21; --wv-muted:#5f6670; --wv-surface:#fff; --wv-border:#d9dce1; --wv-ok:#1e7a37; --wv-bad:#b3261e; --wv-warn:#8a5a00;
  height:100%; overflow:auto; background:var(--wv-canvas); color:var(--wv-text); box-sizing:border-box;
  font:14px/1.45 system-ui, sans-serif; }
@media (prefers-color-scheme: dark) {
  .wv-root { --wv-canvas:#15171a; --wv-text:#e8eaed; --wv-muted:#9aa1ab; --wv-surface:#22252a; --wv-border:#363a41; --wv-ok:#5fc57a; --wv-bad:#ff8a80; --wv-warn:#e0b050; }
}
.wv-root *, .wv-root *::before, .wv-root *::after { box-sizing:border-box; }
.wv-list { max-width:440px; margin:0 auto; padding:20px 16px 28px; display:flex; flex-direction:column; gap:20px; }
.wv-count { margin:0; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--wv-muted); }
.wv-card { --wv-bg:#fff; --wv-fg:#1c1e21; --wv-label:#5f6670; position:relative; overflow:hidden;
  border-radius:14px; background:var(--wv-bg); color:var(--wv-fg); box-shadow:0 1px 3px rgba(0,0,0,.25);
  padding:16px; display:flex; flex-direction:column; gap:14px; }
.wv-bgimg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.25; pointer-events:none; }
.wv-card > *:not(.wv-bgimg) { position:relative; }
.wv-top { display:flex; align-items:center; gap:10px; min-height:32px; }
.wv-logo { max-height:34px; max-width:46%; object-fit:contain; }
.wv-logotext { font-weight:600; font-size:15px; overflow-wrap:anywhere; }
.wv-fields { display:flex; flex-wrap:wrap; gap:10px 18px; margin:0; }
.wv-fields > div { min-width:0; }
.wv-fields dt { font-size:11px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:var(--wv-label); overflow-wrap:anywhere; }
.wv-fields dd { margin:0; font-size:15px; font-weight:500; overflow-wrap:anywhere; white-space:pre-wrap; }
.wv-header { margin-left:auto; justify-content:flex-end; text-align:right; }
.wv-primary { justify-content:space-between; flex-wrap:nowrap; align-items:flex-end; }
.wv-primary dd { font-size:28px; font-weight:600; line-height:1.15; }
.wv-primary > div:last-child:not(:first-child) { text-align:right; }
.wv-arrow { align-self:center; font-size:22px; color:var(--wv-label); flex:0 0 auto; }
.wv-strip { margin:0 -16px; width:calc(100% + 32px); max-height:130px; object-fit:cover; display:block; }
.wv-thumb { max-height:84px; max-width:84px; border-radius:8px; object-fit:cover; }
.wv-mid { display:flex; gap:12px; align-items:center; justify-content:space-between; }
.wv-code { background:#fff; border-radius:10px; padding:12px; display:flex; flex-direction:column; align-items:center; gap:6px; color:#1c1e21; }
.wv-code img.wv-sq { width:min(100%, 220px); }
.wv-code img { max-width:100%; height:auto; display:block; image-rendering:crisp-edges; }
.wv-code small { font-size:12px; overflow-wrap:anywhere; text-align:center; }
.wv-footer { max-width:100%; object-fit:contain; align-self:center; }
.wv-note { margin:0; padding:8px 12px; border:1px solid var(--wv-border); border-radius:8px; background:var(--wv-surface); font-size:13px; }
.wv-note-warn { border-color:#c77700; }
.wv-sig { display:flex; flex-wrap:wrap; align-items:center; gap:2px 12px; padding:0 4px; font-size:13px; color:var(--wv-muted); }
.wv-sig details { width:100%; }
.wv-sig summary { cursor:pointer; }
.wv-sig details p { margin:6px 0 0; }
.wv-sig-ok { color:var(--wv-ok); }
.wv-sig-ok details p { color:var(--wv-muted); }
.wv-sig-failed { color:var(--wv-bad); }
.wv-sig-unavailable { color:var(--wv-warn); }
.wv-link { padding:6px 0; font:inherit; color:inherit; background:none; border:0; text-decoration:underline; cursor:pointer; }
.wv-link:focus-visible, .wv-sig summary:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
.wv-link:disabled { opacity:.6; cursor:default; }
.wv-back { background:var(--wv-surface); border:1px solid var(--wv-border); border-radius:12px; padding:14px 16px; }
.wv-back h2 { margin:0 0 8px; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--wv-muted); }
.wv-back dl { margin:0; display:flex; flex-direction:column; gap:10px; }
.wv-back dt { font-size:12px; color:var(--wv-muted); }
.wv-back dd { margin:0; overflow-wrap:anywhere; white-space:pre-wrap; }
.wv-back a { color:inherit; }
.wv-msg { margin:24px auto; padding:24px; max-width:520px; text-align:center; color:var(--wv-muted); white-space:pre-wrap; }
`;

export function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}
