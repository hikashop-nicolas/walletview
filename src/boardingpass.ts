// Reader for an IATA bar coded boarding pass (BCBP) string, the text inside the barcode of
// most airline boarding passes. One card per flight leg.

import { decode, type Leg } from "bcbp";
import type { Card, CardField } from "./model";

type T = (key: string) => string;

const BCBP = /^M[1-4][A-Z0-9 \/.'-]{20}[A-Z0-9 ]/;

export function looksLikeBcbp(text: string): boolean {
  return text.length >= 60 && text.length <= 2000 && BCBP.test(text);
}

const trimZeros = (s: string | undefined): string => (s ? s.replace(/^0+(?=.)/, "") : "");

function field(label: string, value: string | undefined): CardField[] {
  return value ? [{ label, value }] : [];
}

export function readBoardingPass(text: string, t: T, lang: string | undefined): Card[] {
  const flat = text.replace(/[\r\n]+$/, "");
  const pass = decode(flat);
  const legs = pass.data?.legs ?? [];
  if (!legs.length) throw new Error("no flight leg in the boarding pass");
  const name = pass.data?.passengerName;
  return legs.map((leg: Leg): Card => {
    let date = "";
    if (leg.flightDate && !Number.isNaN(leg.flightDate.getTime())) {
      try {
        date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(leg.flightDate);
      } catch {
        date = leg.flightDate.toISOString().slice(0, 10);
      }
    }
    const carrier = leg.operatingCarrierDesignator ?? "";
    const flight = [carrier, trimZeros(leg.flightNumber)].filter(Boolean).join(" ");
    return {
      style: "boardingPass",
      transit: "air",
      organization: carrier,
      description: flight,
      logoText: carrier || undefined,
      colors: {},
      header: field(t("seat"), trimZeros(leg.seatNumber)),
      primary: [
        { label: t("from"), value: leg.departureAirport ?? "" },
        { label: t("to"), value: leg.arrivalAirport ?? "" },
      ],
      secondary: [...field(t("passenger"), name), ...field(t("cabin"), leg.compartmentCode)],
      auxiliary: [...field(t("flight"), flight), ...field(t("date"), date), ...field(t("recordLocator"), leg.operatingCarrierPNR)],
      back: [
        ...field(t("sequence"), trimZeros(leg.checkInSequenceNumber)),
        ...field(t("status"), leg.passengerStatus),
      ],
      barcodes: [],
      images: {},
      release: () => {},
    };
  });
}
