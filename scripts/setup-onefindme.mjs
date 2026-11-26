// Writes the OneFindMe settings into .env.local (without touching other vars).
// Usage:
//   node scripts/setup-onefindme.mjs [deliveryCountry]
//
// OneFindMe's search API is public (no key): https://onefindme.com/openapi.json
// The only setting that matters is the delivery country, which decides currency
// and shipping for the eBay listings we collect.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const COUNTRY_KEY = "ONEFINDME_COUNTRY";
const demoCountry = (process.argv[2] ?? "US").trim().toUpperCase().slice(0, 2) || "US";
const envPath = join(process.cwd(), ".env.local");

const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const lines = env
  .split(/\r?\n/)
  .filter((line) => !line.startsWith(`${COUNTRY_KEY}=`) && !line.startsWith("CHANNEL3_API_KEY="));
while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();

lines.push("# OneFindMe product source (eBay only). No API key required.", `${COUNTRY_KEY}=${demoCountry}`);

writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
console.log(`${COUNTRY_KEY}=${demoCountry} written to .env.local (CHANNEL3_API_KEY removed if present).`);
