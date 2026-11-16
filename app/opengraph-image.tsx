import { ImageResponse } from "next/og";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * Social share card (Open Graph / Twitter), generated at build time so the site
 * ships with a proper preview image instead of none.
 */
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #011627 0%, #0b3d59 55%, #1d7fa4 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(255,255,255,0.14)",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            MT
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            Shop genuine tech at the best price
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.78)" }}>
            Phones · Laptops · Audio · Smartwatches — delivered across Nepal
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: 999,
              background: "#ffdd48",
              color: "#7a4a00",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            80% OFF EVERYTHING
          </div>
        </div>
      </div>
    ),
    size,
  );
}
