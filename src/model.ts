// The internal card every format reader fills and the one renderer draws.

export interface CardField {
  label: string;
  value: string;
}

export interface CardBarcode {
  format: "qr" | "pdf417" | "aztec" | "code128";
  message: string;
  altText?: string;
}

export interface CardImages {
  logo?: string;
  icon?: string;
  strip?: string;
  thumbnail?: string;
  background?: string;
  footer?: string;
}

export type CardStyle = "boardingPass" | "eventTicket" | "coupon" | "storeCard" | "generic";

export interface VerifyOutcome {
  status: "ok" | "failed" | "unavailable";
  // Short sentences for the person, already translated.
  lines: string[];
}

export interface Card {
  style: CardStyle;
  transit?: "air" | "train" | "bus" | "boat" | "generic";
  organization: string;
  description: string;
  logoText?: string;
  // Only rgb(r, g, b) strings, validated by the reader.
  colors: { background?: string; foreground?: string; label?: string };
  header: CardField[];
  primary: CardField[];
  secondary: CardField[];
  auxiliary: CardField[];
  back: CardField[];
  barcodes: CardBarcode[];
  images: CardImages;
  voided?: boolean;
  expired?: boolean;
  // Present when the file carries a signature that can be checked on request. `host` is the
  // site a check would contact, when there is one.
  verify?: { host?: string; run(confirm?: (url: string) => Promise<boolean>): Promise<VerifyOutcome> };
  // Frees the blob URLs held by `images`.
  release(): void;
}
