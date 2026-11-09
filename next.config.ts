import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Channel3 product images are served from many retailer/CDN hosts.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
