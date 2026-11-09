import "server-only";

import { Channel3 } from "@channel3/sdk";

/**
 * Server-only Channel3 client.
 *
 * The API key is a server secret: `x-api-key` must never reach the browser.
 * Channel3 UI components are presentational and take data as props, so all
 * fetching happens here and the results are handed down to the components.
 */

type Channel3Client = InstanceType<typeof Channel3>;

let client: Channel3Client | undefined;

export function getChannel3(): Channel3Client {
  const apiKey = process.env.CHANNEL3_API_KEY;

  if (!apiKey) {
    throw new Error(
      "CHANNEL3_API_KEY is not set. Run `node scripts/setup-channel3.mjs <key>` or add it to .env.local.",
    );
  }

  if (!client) {
    client = new Channel3({ apiKey });
  }

  return client;
}

export function hasChannel3Key() {
  return Boolean(process.env.CHANNEL3_API_KEY);
}
