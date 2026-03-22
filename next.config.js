/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3: native addon, must be loaded by Node directly.
  // @anthropic-ai/sdk: large SDK with circular CJS deps that overflow
  // Turbopack's SSR module registry when bundled (digest 2627331426).
  serverExternalPackages: ["better-sqlite3", "@anthropic-ai/sdk"],
  // Godot web exports require SharedArrayBuffer → needs COOP + COEP on both
  // the host page (/play) and the static game files (/game/*).
  async headers() {
    const godotHeaders = [
      { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    ];
    return [
      { source: "/play",       headers: godotHeaders },
      { source: "/game/:path*", headers: godotHeaders },
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
