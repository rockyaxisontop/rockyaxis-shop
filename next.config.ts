import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * Cheap, static protections that cost nothing on the free tier and close the
 * common classes of attack: framing/clickjacking, MIME sniffing, referrer leaks,
 * and unwanted device permissions. A full CSP is deliberately not set here — it
 * needs a nonce pipeline for Next's inline scripts and is easy to get subtly
 * wrong — but `frame-ancestors`, `object-src` and `base-uri` are the parts that
 * actually stop injection attacks, and they are safe to enforce now.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      // Only upgrade genuinely insecure requests; never block mixed assets.
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    // Channel3 product images are served from many retailer/CDN hosts.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The FCM worker must never be cached by a proxy.
        source: "/firebase-messaging-sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
