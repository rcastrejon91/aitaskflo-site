/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep these out of the SSR bundle.
  // better-sqlite3: native addon, must be loaded by Node directly.
  // react-syntax-highlighter: CJS module with a circular language registry that
  // causes Turbopack's SSR evaluator to overflow the call stack.
  serverExternalPackages: ["better-sqlite3", "react-syntax-highlighter"],
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
