import type { NextConfig } from "next";

// Baseline hardening headers that carry no functional risk (unlike a full
// Content-Security-Policy, which needs careful per-directive tuning against
// every third-party script/style/font this app loads — not attempted here
// since it can't be visually verified in this environment; revisit before
// a public deploy).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
