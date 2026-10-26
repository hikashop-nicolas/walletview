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

// A message as a string key plus its values, so a stored result is translated when shown.
export type Msg = [key: string, vars?: Record<string, string | number>];

export interface VerifyOutcome {
  status: "ok" | "failed" | "unavailable";
  message: Msg;
  // A second sentence worth knowing, shown on request.
  detail?: Msg;
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
  verify?: {
    host?: string;
    // Identifies this exact file, so a stored result is never shown for a different one.
    key(): Promise<string>;
    run(confirm?: (url: string) => Promise<boolean>): Promise<VerifyOutcome>;
  };
  // Frees the blob URLs held by `images`.
  release(): void;
}
