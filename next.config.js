/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.pollinations.ai" },
    ],
  },
  // better-sqlite3: native addon, must be loaded by Node directly.
  // @anthropic-ai/sdk: large SDK with circular CJS deps that overflow
  // Turbopack's SSR module registry when bundled (digest 2627331426).
  serverExternalPackages: [
    "better-sqlite3",
    "@anthropic-ai/sdk",
    "groq-sdk",
    "openai",
    "bcryptjs",
    "jose",
    "@panva/hkdf",
    "openid-client",
    "oauth4webapi",
    // react-pdf uses its own React reconciler with Symbol comparisons that
    // break when Turbopack bundles it — must load directly from node_modules.
    "@react-pdf/renderer",
    "@react-pdf/reconciler",
    "@react-pdf/layout",
    "@react-pdf/render",
    "@react-pdf/primitives",
    "@react-pdf/font",
    "@react-pdf/fns",
    "@react-pdf/pdfkit",
    "playwright",
  ],
  // Godot web exports require SharedArrayBuffer → needs COOP + COEP on both
  // the host page (/play) and the static game files (/game/*).
  async headers() {
    const godotHeaders = [
      { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    ];

    const securityHeaders = [
      { key: "X-Frame-Options",           value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options",    value: "nosniff" },
      { key: "X-Powered-By",              value: "" },
      { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://image.pollinations.ai https://images.unsplash.com https://*.fal.run https://*.fal.ai",
          "font-src 'self'",
          "connect-src 'self' https://api.anthropic.com https://api.groq.com https://api.x.ai https://api.openai.com https://*.fal.run https://*.fal.ai https://fal.run https://image.pollinations.ai https://tenor.googleapis.com https://api.hubapi.com",
          "media-src 'self' blob: https://*.fal.run https://*.fal.ai",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/play",         headers: godotHeaders },
      { source: "/game/:path*",  headers: godotHeaders },
      { source: "/games/:path*", headers: godotHeaders },
    ];
  },

  async redirects() {
    return [
      {
        source: "/chat",
        destination: "/lyra",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
