/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/trigger";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  output: "standalone",
  webpack: (config) => {
    // WalletConnect / browser polyfill gaps in the Next server bundle.
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
    };
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }
    return config;
  },
};

module.exports = nextConfig;
