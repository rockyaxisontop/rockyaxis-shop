/**
 * Country names and capital cities, so the site can say where it ships from and
 * where it delivers to without asking the visitor anything.
 *
 * Country names fall back to the runtime's `Intl.DisplayNames` (built into Node
 * and every modern browser). Capital cities can't be derived that way, so the
 * common markets are listed here; anything unknown falls back to the country's
 * name rather than inventing a city.
 */

/** ISO-3166 alpha-2 → capital city. */
const CAPITALS: Record<string, string> = {
  AE: "Abu Dhabi", AF: "Kabul", AL: "Tirana", AM: "Yerevan", AO: "Luanda", AR: "Buenos Aires",
  AT: "Vienna", AU: "Canberra", AZ: "Baku", BA: "Sarajevo", BD: "Dhaka", BE: "Brussels",
  BG: "Sofia", BH: "Manama", BJ: "Porto-Novo", BR: "Brasília", BT: "Thimphu", BW: "Gaborone",
  BY: "Minsk", CA: "Ottawa", CD: "Kinshasa", CH: "Bern", CI: "Yamoussoukro", CL: "Santiago",
  CM: "Yaoundé", CN: "Beijing", CO: "Bogotá", CR: "San José", CU: "Havana", CY: "Nicosia",
  CZ: "Prague", DE: "Berlin", DK: "Copenhagen", DO: "Santo Domingo", DZ: "Algiers", EC: "Quito",
  EE: "Tallinn", EG: "Cairo", ES: "Madrid", ET: "Addis Ababa", FI: "Helsinki", FJ: "Suva",
  FR: "Paris", GB: "London", GE: "Tbilisi", GH: "Accra", GR: "Athens", GT: "Guatemala City",
  HK: "Hong Kong", HR: "Zagreb", HU: "Budapest", ID: "Jakarta", IE: "Dublin", IL: "Jerusalem",
  IN: "New Delhi", IQ: "Baghdad", IR: "Tehran", IS: "Reykjavík", IT: "Rome", JM: "Kingston",
  JO: "Amman", JP: "Tokyo", KE: "Nairobi", KG: "Bishkek", KH: "Phnom Penh", KP: "Pyongyang",
  KR: "Seoul", KW: "Kuwait City", KZ: "Astana", LA: "Vientiane", LB: "Beirut", LK: "Sri Jayawardenepura Kotte",
  LT: "Vilnius", LU: "Luxembourg", LV: "Riga", LY: "Tripoli", MA: "Rabat", MD: "Chișinău",
  ME: "Podgorica", MK: "Skopje", MM: "Naypyidaw", MN: "Ulaanbaatar", MT: "Valletta", MU: "Port Louis",
  MV: "Malé", MW: "Lilongwe", MX: "Mexico City", MY: "Kuala Lumpur", MZ: "Maputo", NA: "Windhoek",
  NG: "Abuja", NL: "Amsterdam", NO: "Oslo", NP: "Kathmandu", NZ: "Wellington", OM: "Muscat",
  PA: "Panama City", PE: "Lima", PH: "Manila", PK: "Islamabad", PL: "Warsaw", PT: "Lisbon",
  PY: "Asunción", QA: "Doha", RO: "Bucharest", RS: "Belgrade", RU: "Moscow", RW: "Kigali",
  SA: "Riyadh", SE: "Stockholm", SG: "Singapore", SI: "Ljubljana", SK: "Bratislava", SN: "Dakar",
  SO: "Mogadishu", SR: "Paramaribo", SV: "San Salvador", SY: "Damascus", TH: "Bangkok", TJ: "Dushanbe",
  TM: "Ashgabat", TN: "Tunis", TR: "Ankara", TW: "Taipei", TZ: "Dodoma", UA: "Kyiv", UG: "Kampala",
  US: "Washington, D.C.", UY: "Montevideo", UZ: "Tashkent", VE: "Caracas", VN: "Hanoi", YE: "Sana'a",
  ZA: "Pretoria", ZM: "Lusaka", ZW: "Harare",
};

let displayNames: Intl.DisplayNames | null = null;

/**
 * English country name for an ISO code, e.g. "NP" → "Nepal".
 *
 * `Intl.DisplayNames.of()` throws a RangeError for unknown/placeholder codes
 * (geo headers are not guaranteed to be real), so the lookup itself is guarded,
 * not just the constructor.
 */
export function countryName(countryCode?: string | null): string {
  if (!countryCode) return "the United States";
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    displayNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    const name = displayNames.of(code);
    // Unassigned codes resolve to a placeholder like "Unknown Region"; treat
    // that, and the code itself, as "no useful data" and fall back to the US.
    if (!name || name === code || /^unknown/i.test(name)) return "the United States";
    return name;
  } catch {
    return "the United States";
  }
}

/** Capital city for an ISO code, e.g. "NP" → "Kathmandu". */
export function countryCapital(countryCode?: string | null): string {
  if (!countryCode) return CAPITALS.US;
  const code = countryCode.toUpperCase();
  // Known capital, else the country's own name; never a "Unknown Region" label.
  return CAPITALS[code] ?? countryName(code).replace(/^the /, "");
}

/** Full shipping-origin line, e.g. "Kathmandu, Nepal". */
export function countryLocationLabel(countryCode?: string | null): string {
  const capital = countryCapital(countryCode);
  const country = countryName(countryCode);
  // Avoid "United States, the United States" when the capital is the country name.
  return capital.replace(/^the /, "").toLowerCase() === country.replace(/^the /, "").toLowerCase()
    ? country
    : `${capital}, ${country}`;
}
