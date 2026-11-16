/**
 * ISO country → local currency, so we can show "the price in that country's
 * money" without asking the visitor anything. Countries that share a currency
 * (eurozone, XOF/XAF zones, USD territories) map to the same code.
 */

const EUROZONE = [
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV",
  "MT", "NL", "PT", "SI", "SK",
];

const XOF = ["BF", "BJ", "CI", "GW", "ML", "NE", "SN", "TG"];
const XAF = ["CF", "CG", "CM", "GA", "GQ", "TD"];
const USD_TERRITORIES = ["EC", "SV", "PA", "PR", "TL", "ZW", "FM", "MH", "PW"];

const MAP: Record<string, string> = {
  AE: "AED", AF: "AFN", AL: "ALL", AM: "AMD", AO: "AOA", AR: "ARS", AU: "AUD", AZ: "AZN",
  BA: "BAM", BB: "BBD", BD: "BDT", BG: "BGN", BH: "BHD", BI: "BIF", BN: "BND", BO: "BOB",
  BR: "BRL", BT: "BTN", BW: "BWP", BY: "BYN", BZ: "BZD", CA: "CAD", CD: "CDF", CH: "CHF",
  CL: "CLP", CN: "CNY", CO: "COP", CR: "CRC", CU: "CUP", CV: "CVE", CZ: "CZK", DJ: "DJF",
  DK: "DKK", DO: "DOP", DZ: "DZD", EG: "EGP", ER: "ERN", ET: "ETB", FJ: "FJD", FK: "FKP",
  GB: "GBP", GE: "GEL", GG: "GBP", GH: "GHS", GI: "GIP", GM: "GMD", GN: "GNF", GT: "GTQ",
  GY: "GYD", HK: "HKD", HN: "HNL", HT: "HTG", HU: "HUF", ID: "IDR", IL: "ILS", IM: "GBP",
  IN: "INR", IQ: "IQD", IR: "IRR", IS: "ISK", JE: "GBP", JM: "JMD", JO: "JOD", JP: "JPY",
  KE: "KES", KG: "KGS", KH: "KHR", KM: "KMF", KP: "KPW", KR: "KRW", KW: "KWD", KY: "KYD",
  KZ: "KZT", LA: "LAK", LB: "LBP", LK: "LKR", LR: "LRD", LS: "LSL", LY: "LYD", MA: "MAD",
  MD: "MDL", MG: "MGA", MK: "MKD", MM: "MMK", MN: "MNT", MO: "MOP", MR: "MRU", MU: "MUR",
  MV: "MVR", MW: "MWK", MX: "MXN", MY: "MYR", MZ: "MZN", NA: "NAD", NG: "NGN", NI: "NIO",
  NO: "NOK", NP: "NPR", NZ: "NZD", OM: "OMR", PE: "PEN", PG: "PGK", PH: "PHP", PK: "PKR",
  PL: "PLN", PY: "PYG", QA: "QAR", RO: "RON", RS: "RSD", RU: "RUB", RW: "RWF", SA: "SAR",
  SB: "SBD", SC: "SCR", SD: "SDG", SE: "SEK", SG: "SGD", SH: "SHP", SL: "SLE", SO: "SOS",
  SR: "SRD", SS: "SSP", ST: "STN", SY: "SYP", SZ: "SZL", TH: "THB", TJ: "TJS", TM: "TMT",
  TN: "TND", TO: "TOP", TR: "TRY", TT: "TTD", TW: "TWD", TZ: "TZS", UA: "UAH", UG: "UGX",
  US: "USD", UY: "UYU", UZ: "UZS", VE: "VES", VN: "VND", VU: "VUV", WS: "WST", YE: "YER",
  ZA: "ZAR", ZM: "ZMW",
};

for (const country of EUROZONE) MAP[country] = "EUR";
for (const country of XOF) MAP[country] = "XOF";
for (const country of XAF) MAP[country] = "XAF";
for (const country of USD_TERRITORIES) MAP[country] = "USD";

export const COUNTRY_CURRENCY: Readonly<Record<string, string>> = MAP;

/** Currency for an ISO-3166 country code, or USD when we don't know it. */
export function currencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return "USD";
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? "USD";
}

/** A BCP-47 locale that reads naturally for that country (used for grouping). */
export function localeForCountry(countryCode?: string | null): string {
  return countryCode ? countryCode.toLowerCase() : "en-us";
}
