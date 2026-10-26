# Third-party notices

## LOINC

`src/codes.ts` holds a subset of LOINC display names. This material contains content from LOINC
(http://loinc.org). LOINC is copyright (c) 1995-2026, Regenstrief Institute, Inc. and the Logical
Observation Identifiers Names and Codes (LOINC) Committee and is available at no cost under the
license at http://loinc.org/license. LOINC(R) is a registered trademark of Regenstrief Institute,
Inc.

The names were fetched from the public HL7 terminology server (tx.fhir.org). Regenerate with
`node scripts/build-codes.mjs`.

## CVX

The vaccine names in `src/codes.ts` come from the CDC's CVX code set, published by the US Centers
for Disease Control and Prevention (public domain).
