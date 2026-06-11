/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Security headers ──────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ── Image optimisation — allow Supabase storage domain ───────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  // ── Compress output ───────────────────────────────────────────────
  compress: true,

  // ── Strict mode ───────────────────────────────────────────────────
  reactStrictMode: true,

  // ── Remove powered-by header ─────────────────────────────────────
  poweredByHeader: false,
};

module.exports = nextConfig;
