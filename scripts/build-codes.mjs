// Regenerates src/codes.ts: display names for the LOINC and CVX codes health cards carry.
// LOINC names come from the public HL7 terminology server (tx.fhir.org); CVX names from the
// CDC's published CVX table (public domain). Run: node scripts/build-codes.mjs
import fs from "node:fs";

const LOINC_SEEDS = `
10834-0 13654-9 13959-2 14629-0 14631-6 14682-9 14749-6 14879-1 14933-6 14937-7 1742-6 1751-7 1863-0
1920-8 1963-8 2000-8 2075-0 2324-2 2349-9 24323-8 24357-6 2532-0 2756-5 2823-3 2885-2 2887-8 2951-2
2965-2 30391-7 30405-5 33051-4 33052-2 4544-3 58410-2 5905-5 6690-2 6768-6 704-7 706-2 711-2 713-8
718-7 731-0 736-9 742-7 751-8 770-8 777-3 785-6 787-2 789-8
94500-6 94309-2 94531-1 94533-7 94534-5 94558-4 94559-2 94562-6 94563-4 94564-2 94565-9 94640-0
94646-7 94661-6 94745-7 94746-5 94756-4 94757-2 94758-0 94759-8 94760-6 94761-4 94762-2 94763-0
94764-8 94765-5 94766-3 94767-1 94768-9 94769-7 95209-3 95406-5 95409-9 95416-4 95423-0 95424-8
95425-5 95521-1 95522-9 96119-3 96741-4 96763-8 96764-6 96765-3 96766-1 96894-1 97097-0 97098-8
97099-6 98131-6 98132-4 98733-9 99596-9 94307-6 94308-4 94311-8 94312-6 94313-4 94314-2 94315-9
94316-7 94510-5 94511-3 94505-5 94506-3 94507-1 94508-9 94509-7 94306-8 94310-0 94502-2 94503-0
94504-8 94533-7 94535-2 94536-0 94537-8 94538-6 94539-4 94540-2 94541-0 94542-8 94543-6 94544-4
94545-1 94546-9 94547-7 94548-5 94549-3 94550-1 94551-9 94552-7 94553-5 94554-3 94555-0 94556-8
94557-6 94560-0 94561-8 94566-7 94567-5 94568-3 94569-1 94570-9 94571-7 94572-5 94573-3 94574-1
94575-8 94576-6 94577-4 94578-2 94579-0 94580-8 94581-6 94582-4 94583-2 94584-0 94585-7 94586-5
94587-3 94588-1 94589-9 94590-7 94591-5 94592-3 94593-1 94594-9 94595-6 94596-4 94597-2 94598-0
94599-8 94600-4 94601-2 94602-0 94603-8 94604-6 94605-3 94606-1 94607-9 94608-7 94609-5 94610-3
95405-7 95410-7 95411-5 95412-3 95413-1 95414-9 95415-6 95417-2 95418-0 95419-8 95420-6 95421-4
95422-2 95426-3 95427-1 95428-9 95429-7 95430-5 95431-3 95432-1 95433-9 95434-7 95435-4 95436-2
95437-0 95438-8 95439-6 95440-4 95441-2 95442-0 95443-8 95444-6 95445-3 95446-1 95447-9
57021-8 57782-5 58410-2 6690-2 4548-4 17856-6 59261-8 3016-3 3024-7 3053-6 2093-3 2085-9 13457-7
2571-8 18262-6 9830-1 2160-0 3094-0 2345-7 17861-6 2028-9 1975-2 1988-5 30522-7 2276-4 2132-9
1989-3 62292-8 2857-1 6301-6 5902-2 3173-2 14979-9 3255-7 1798-8 2339-0 14749-6 1558-6 2345-7
5778-6 5803-2 5811-5 5767-9 5770-3 5792-7 5797-6 5799-2 5802-4 5804-0 5810-7 2514-8 20454-5
5794-3 5821-4 13945-1 5769-5 11277-1 785-6 28541-1 788-0 21000-5 30428-7 33914-3 48642-3
62238-1 77147-7 33037-3 1920-8 1925-7 6768-6 2965-2 3097-3 17849-1 3084-1 2532-0 2501-5
8310-5 8867-4 9279-1 8480-6 8462-4 29463-7 8302-2 39156-5 59408-5 2708-6 85354-9 8478-0
8331-1 8329-5 8328-7 8326-1 8327-9 9843-4 8287-5 8289-1 3141-9 3137-7 8306-3 8310-5
75622-1 56888-1 5221-7 7917-8 22358-0 5196-1 16935-9 5195-3 22322-2 40726-8 53925-1 29892-9
40421-6 32017-9 47029-6 25836-8 13955-0 5198-3 22314-9 24113-3 21008-6 21006-0 48159-8
31208-2 69548-6 43304-5 21613-5 36916-5 60256-5 20507-0 5000-5 5001-2 5002-0 5003-8 6357-8
2106-3 21198-7 19080-1 11580-8 14959-1 5811-5 5803-2 5770-3 5799-2 5778-6 25428-4 5792-7
76625-3 82810-3 11884-4 11878-6 1668-3 2986-8 14804-9 2823-3 17861-6 49765-1 6298-4 2603-9
2777-1 19123-9 2601-3 2602-1 17856-6 1558-6 14771-0 1514-8 1521-4 20570-8 4537-7 5902-2
1920-8 1742-6 1751-7 1975-2 2885-2 6768-6 1863-0 17861-6 2951-2 2823-3 2075-0 3094-0
11029-6 11030-4 11031-2 20447-9 25836-8 3254-0 25700-0 30341-2 11555-0 11557-6 11556-8
2019-8 2703-7 2713-6 2744-1 2746-8 2728-6 2019-8 19994-3 19995-0 42757-5
`
  .split(/\s+/)
  .filter((c) => /^\d+-\d$/.test(c));

const unique = [...new Set(LOINC_SEEDS)];
const loinc = {};
let missing = 0;
for (const code of unique) {
  const url = `https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://loinc.org&code=${code}&_format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      missing++;
      continue;
    }
    const j = await res.json();
    const display = j.parameter?.find((p) => p.name === "display")?.valueString;
    const inactive = j.parameter?.find((p) => p.name === "property" && p.part?.some((x) => x.valueCode === "inactive"))?.part?.find((x) => x.name === "value")?.valueBoolean;
    if (display) loinc[code] = display;
    else missing++;
    void inactive;
  } catch {
    missing++;
  }
  await new Promise((r) => setTimeout(r, 60));
}

const cvxText = await (await fetch("https://www2a.cdc.gov/vaccines/iis/iisstandards/downloads/cvx.txt")).text();
const cvx = {};
for (const line of cvxText.split(/\r?\n/)) {
  const f = line.split("|").map((x) => x.trim());
  if (/^\d+$/.test(f[0] ?? "") && f[1]) cvx[f[0]] = f[1];
}
// Short brand names people recognise on a COVID-19 vaccine record.
Object.assign(cvx, { 207: "Moderna COVID-19", 208: "Pfizer-BioNTech COVID-19", 210: "AstraZeneca COVID-19", 211: "Novavax COVID-19", 212: "Janssen COVID-19" });

const q = (s) => JSON.stringify(s);
const body = (o) => Object.entries(o).sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true })).map(([k, v]) => `  ${q(k)}: ${q(v)},`).join("\n");
fs.writeFileSync(
  new URL("../src/codes.ts", import.meta.url),
  `// Generated by scripts/build-codes.mjs: do not edit.
//
// LOINC names: this material contains content from LOINC (http://loinc.org). LOINC is
// copyright (c) 1995-2026, Regenstrief Institute, Inc. and the Logical Observation Identifiers
// Names and Codes (LOINC) Committee and is available at no cost under the license at
// http://loinc.org/license. LOINC(R) is a registered trademark of Regenstrief Institute, Inc.
// CVX names: the CDC's CVX code set (public domain).

export const LOINC: Record<string, string> = {
${body(loinc)}
};

export const CVX: Record<string, string> = {
${body(cvx)}
};
`,
);
console.log(`loinc ${Object.keys(loinc).length} (missing ${missing}), cvx ${Object.keys(cvx).length}`);
