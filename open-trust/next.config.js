/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/trigger";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  output: "standalone",
};

module.exports = nextConfig;
