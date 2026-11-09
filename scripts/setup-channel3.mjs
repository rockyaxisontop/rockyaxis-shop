// Writes the Channel3 API key into .env.local (without touching any other vars).
// Usage:
//   node scripts/setup-channel3.mjs <your_channel3_api_key>
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KEY = "CHANNEL3_API_KEY";
const apiKey = (process.argv[2] ?? "").trim();
const envPath = join(process.cwd(), ".env.local");

if (!apiKey) {
  console.error(
    `Missing key.\nUsage: node scripts/setup-channel3.mjs <your_channel3_api_key>\nGet one at https://trychannel3.com/dashboard`,
  );
  process.exit(1);
}

const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const lines = env.split(/\r?\n/).filter((line) => !line.startsWith(`${KEY}=`));
while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
lines.push(`${KEY}=${apiKey}`);

writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
console.log(`${KEY} written to .env.local`);
